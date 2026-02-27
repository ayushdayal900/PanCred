'use strict';
/**
 * autoRepayService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend automation engine for LoanAgreement installment repayments.
 *
 * How it works:
 *  1. Cron fires every 60 seconds.
 *  2. Fetches all 'Funded' LoanRequests that have an on-chain agreementAddress.
 *  3. For each agreement, reads getStatus() directly from the chain.
 *  4. If block.timestamp >= nextDueTimestamp AND loan is not completed:
 *       → Calls agreement.repayInstallment() using the backend signer
 *         (automationService wallet).
 *       → token.transferFrom(borrower, lender, amount) is executed on-chain.
 *         Borrower MUST have approved the agreement contract for >= monthlyPayment tUSDT.
 *  5. On success: logs, updates DB status, records trust score.
 *  6. On failure: logs revert reason, records missed payment in DB.
 *
 * .env required:
 *   SEPOLIA_RPC_URL   — Sepolia JSON-RPC endpoint
 *   PRIVATE_KEY       — Backend automation wallet private key
 *                       This wallet == automationService in every LoanAgreement.
 */

const cron = require('node-cron');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const TrustScoreHistory = require('../models/TrustScoreHistory');
const trustScore = require('./trustScoreService');

// ── ABI & Addresses ───────────────────────────────────────────────────────────
const ADDRESSES_PATH = path.join(__dirname, '../contracts/addresses.json');
const AGREEMENT_ABI_PATH = path.join(__dirname, '../contracts/LoanAgreement.json');
const USDT_ABI_PATH = path.join(__dirname, '../contracts/MockUSDT.json');

let addresses = {};
let agreementAbi = [];
let usdtAbi = [];

if (fs.existsSync(ADDRESSES_PATH)) addresses = JSON.parse(fs.readFileSync(ADDRESSES_PATH, 'utf8'));
if (fs.existsSync(AGREEMENT_ABI_PATH)) agreementAbi = JSON.parse(fs.readFileSync(AGREEMENT_ABI_PATH, 'utf8'));
if (fs.existsSync(USDT_ABI_PATH)) usdtAbi = JSON.parse(fs.readFileSync(USDT_ABI_PATH, 'utf8'));

// Support both { abi: [...] } wrapped and flat array formats
if (agreementAbi && agreementAbi.abi) agreementAbi = agreementAbi.abi;
if (usdtAbi && usdtAbi.abi) usdtAbi = usdtAbi.abi;

// ── Signer & Provider ─────────────────────────────────────────────────────────
let provider;
let signerWallet;

function initSigner() {
    const rpc = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
    const pk = process.env.PRIVATE_KEY;

    if (!rpc || !pk) {
        console.error('[AutoRepay] ❌  SEPOLIA_RPC_URL or PRIVATE_KEY missing in .env');
        return false;
    }
    provider = new ethers.JsonRpcProvider(rpc);
    signerWallet = new ethers.Wallet(pk, provider);
    console.log(`[AutoRepay] 🔑  Signer loaded: ${signerWallet.address}`);
    return true;
}

// ── Email (fire-and-forget) ───────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
        console.log(`[AutoRepay] 📧  Email sent → ${to}`);
    } catch (err) {
        console.warn('[AutoRepay] ⚠️   Email send failed (non-critical):', err.message);
    }
}


// ── Core: process one agreement ───────────────────────────────────────────────

async function processAgreement(loanDoc, agreementAddress) {
    const tag = `[AutoRepay][${agreementAddress.slice(0, 8)}]`;

    // 1. Read on-chain status
    let status, loanStatusEnum, modeEnum;
    try {
        const agr = new ethers.Contract(agreementAddress, agreementAbi, provider);
        status = await agr.getStatus();
        try {
            loanStatusEnum = await agr.getLoanStatus();
            modeEnum = await agr.getLoanMode(); // 0: ETH, 1: ERC20
        } catch {
            loanStatusEnum = 0; // Legacy fallback
            modeEnum = 0; // Legacy fallback (ETH)
        }
    } catch (readErr) {
        console.error(JSON.stringify({ event: 'Read Error', agreement: agreementAddress, error: readErr.message }));
        return;
    }

    // 2. Skip automation for ETH loans
    if (modeEnum === 0n || modeEnum === 0) {
        console.log(JSON.stringify({ event: 'AutopaySkipped', reason: 'ETH loan', loanId: loanDoc._id.toString() }));
        return;
    }

    // loanStatusEnum => 0: Active, 1: Completed, 2: Defaulted
    if (loanStatusEnum === 1n || status._completed) {
        console.log(JSON.stringify({ event: 'Loan Completed', loanId: loanDoc._id.toString(), agreement: agreementAddress }));
        if (loanDoc.status !== 'Repaid') {
            loanDoc.status = 'Repaid';
            await loanDoc.save();
        }
        return;
    }

    if (loanStatusEnum === 2n || Number(status._missedPayments) > 3) {
        console.log(JSON.stringify({ event: 'Loan Defaulted', loanId: loanDoc._id.toString(), agreement: agreementAddress }));
        if (loanDoc.status !== 'Defaulted') {
            loanDoc.status = 'Defaulted';
            await loanDoc.save();
            // Apply -150 for loan default (one-time, only when first transitioning to Defaulted)
            if (loanDoc.borrower) {
                try {
                    await trustScore.decreaseScore(loanDoc.borrower, 150, trustScore.ACTIONS.LOAN_DEFAULTED);
                } catch (tsErr) {
                    console.warn('[AutoRepay] ⚠️   TrustScore default penalty failed:', tsErr.message);
                }
            }
        }
        return;
    }


    const {
        _paymentsMade,
        _totalDuration,
        _nextDueTimestamp,
        _monthlyPayment,
        _remainingPayments,
        _completed,
        _missedPayments,
        _isOverdue,
        _borrowerAllowance
    } = status;

    if (Number(_remainingPayments) === 0) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const dueSec = Number(_nextDueTimestamp);
    const monthlyAmt = _monthlyPayment;   // BigInt (raw token units, 6 decimals)

    // 3. Not yet due — nothing to do
    if (nowSec < dueSec) {
        const minutesLeft = Math.round((dueSec - nowSec) / 60);
        console.log(`${tag} ⏳  Not due yet. Next due in ~${minutesLeft} min.`);
        return;
    }

    console.log(`${tag} 🔔  Payment due! Paid ${Number(_paymentsMade)}/${Number(_totalDuration)}`);

    // 4. Check borrower has approved enough tokens
    const allowance = _borrowerAllowance;   // BigInt
    if (allowance < monthlyAmt) {
        const needed = ethers.formatUnits(monthlyAmt, 6);
        const hasAllowance = ethers.formatUnits(allowance, 6);
        console.warn(`${tag} ⚠️   Insufficient allowance. Need ${needed} tUSDT, approved ${hasAllowance} tUSDT.`);

        // Mark missed payment locally
        loanDoc.status = loanDoc.status === 'Funded' ? 'Funded' : loanDoc.status; // keep status
        if (!loanDoc.metadata) loanDoc.set('metadata', {}, { strict: false });
        await loanDoc.save();

        // Penalise trust score off-chain
        if (loanDoc.borrower) {
            try {
                await trustScore.decreaseScore(loanDoc.borrower, 50, trustScore.ACTIONS.INSTALLMENT_MISSED);
            } catch (err) {
                console.warn('[AutoRepay] ⚠️   TrustScore decrease failed:', err.message);
            }
        }

        // Notify borrower by email
        try {
            const borrowerUser = await User.findById(loanDoc.borrower);
            if (borrowerUser?.email) {
                await sendEmail(
                    borrowerUser.email,
                    '⚠️  PanCred: Loan Payment Overdue',
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
                        <h2 style="color:#ef4444;">Payment Missed</h2>
                        <p>Hi ${borrowerUser.name},</p>
                        <p>Your scheduled installment of <strong>${needed} tUSDT</strong> could not be processed automatically because you haven't approved enough tokens.</p>
                        <p>Please visit your dashboard and approve at least <strong>${needed} tUSDT</strong> to the loan agreement contract:</p>
                        <code style="background:#1e293b;color:#94a3b8;padding:8px 12px;border-radius:6px;display:block;margin:16px 0;word-break:break-all;">${agreementAddress}</code>
                        <p style="color:#ef4444;font-weight:bold;">Your trust score has been penalised. Act quickly to avoid further penalties.</p>
                    </div>`
                );
            }
        } catch (_) { /* non-critical */ }

        return;
    }

    // 5. Execute repayInstallment() on-chain (with max 2 attempts retry logic)
    try {
        const agrWithSigner = new ethers.Contract(agreementAddress, agreementAbi, signerWallet);
        let receipt = null;
        let tx = null;
        let attempts = 0;
        const maxAttempts = 2;

        console.log(JSON.stringify({ event: 'AutopayExecuted', loanId: loanDoc._id.toString() }));

        while (attempts < maxAttempts && !receipt) {
            try {
                attempts++;
                tx = await agrWithSigner.repayInstallment({ gasLimit: 250_000 });
                receipt = await tx.wait();
            } catch (err) {
                if (attempts === maxAttempts) throw err;
                console.log(JSON.stringify({ event: 'Transaction Retry', agreement: agreementAddress, attempt: attempts }));
            }
        }

        console.log(JSON.stringify({
            event: 'Installment Paid',
            loanId: loanDoc._id.toString(),
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            paymentsMade: Number(_paymentsMade) + 1
        }));

        // 6. Update DB
        loanDoc.repaymentTxHash = tx.hash;
        if (Number(_remainingPayments) === 1) {
            // This was the last payment
            loanDoc.status = 'Repaid';
            console.log(`${tag} 🏁  Final installment — marking Repaid in DB.`);
        }
        await loanDoc.save();

        // 7. Reward trust score
        if (loanDoc.borrower) {
            try {
                const isFirstInstallment = !loanDoc.firstInstallmentRewarded;

                if (isFirstInstallment) {
                    // +50 first-installment bonus (idempotent per-loan guard)
                    await trustScore.increaseScore(loanDoc.borrower, 50, trustScore.ACTIONS.FIRST_INSTALLMENT);
                    loanDoc.firstInstallmentRewarded = true;
                    await loanDoc.save();
                } else {
                    // +20 for each subsequent installment
                    await trustScore.increaseScore(loanDoc.borrower, 20, trustScore.ACTIONS.INSTALLMENT_PAID);
                }

                // If this was the FINAL payment, handle completedLoans + milestone bonus
                if (Number(_remainingPayments) === 1) {
                    const borrowerUser = await User.findById(loanDoc.borrower);
                    if (borrowerUser) {
                        if (borrowerUser.completedLoans === 0) {
                            await trustScore.increaseScore(loanDoc.borrower, 100, trustScore.ACTIONS.FIRST_LOAN_COMPLETED);
                        }
                        borrowerUser.completedLoans = (borrowerUser.completedLoans ?? 0) + 1;
                        await borrowerUser.save();
                        console.log(`[AutoRepay] 🏆  completedLoans → ${borrowerUser.completedLoans} for ${loanDoc.borrower}`);
                    }
                }
            } catch (tsErr) {
                console.warn('[AutoRepay] ⚠️   TrustScore reward failed:', tsErr.message);
            }
        }

        // 8. Success email
        try {
            const borrowerUser = await User.findById(loanDoc.borrower);
            if (borrowerUser?.email) {
                const paid = ethers.formatUnits(monthlyAmt, 6);
                const paidNum = Number(_paymentsMade) + 1;
                await sendEmail(
                    borrowerUser.email,
                    '✅  PanCred: Installment Paid Successfully',
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
                        <h2 style="color:#22c55e;">Installment #${paidNum} Paid</h2>
                        <p>Hi ${borrowerUser.name},</p>
                        <p>Your installment of <strong>${paid} tUSDT</strong> has been processed automatically.</p>
                        <p>Installments paid: <strong>${paidNum} / ${Number(_totalDuration)}</strong></p>
                        <p>Transaction: <a href="https://sepolia.etherscan.io/tx/${tx.hash}">${tx.hash.slice(0, 20)}...</a></p>
                        <p style="color:#22c55e;">Your trust score has been updated! 🎉</p>
                    </div>`
                );
            }
        } catch (_) { /* non-critical */ }

    } catch (txErr) {
        // 9. On-chain call failed
        const reason = txErr.reason || txErr.message?.slice(0, 120) || 'Unknown error';
        console.log(JSON.stringify({ event: 'Installment Missed', loanId: loanDoc._id.toString(), reason: reason }));

        // Penalise trust score
        if (loanDoc.borrower) {
            try {
                await trustScore.decreaseScore(loanDoc.borrower, 50, trustScore.ACTIONS.INSTALLMENT_MISSED);
            } catch (tsErr) {
                console.warn('[AutoRepay] ⚠️   TrustScore decrease failed:', tsErr.message);
            }
        }

        // Failure email
        try {
            const borrowerUser = await User.findById(loanDoc.borrower);
            if (borrowerUser?.email) {
                await sendEmail(
                    borrowerUser.email,
                    '❌  PanCred: Automatic Repayment Failed',
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
                        <h2 style="color:#ef4444;">Auto-Repayment Failed</h2>
                        <p>Hi ${borrowerUser.name},</p>
                        <p>Our automation service attempted to process your installment but the transaction failed.</p>
                        <p><strong>Reason:</strong> ${reason}</p>
                        <p>Please log in to your dashboard and repay manually to avoid further trust score penalties.</p>
                    </div>`
                );
            }
        } catch (_) { /* non-critical */ }
    }
}

// ── Main Cron Tick ────────────────────────────────────────────────────────────
let isRunning = false;
async function runRepaymentCycle() {
    if (isRunning) return;
    isRunning = true;
    try {
        console.log(`\n[AutoRepay] ⏰  Cron tick — ${new Date().toISOString()}`);

        if (!signerWallet) {
            console.warn('[AutoRepay] No signer — skipping tick.');
            return;
        }

        // Fetch all Funded loans that have an on-chain agreement address
        let loans;
        try {
            loans = await LoanRequest.find({
                status: { $in: ['Funded', 'Active'] },
                simulatedSmartContractId: { $exists: true, $ne: null }
            }).populate('borrower', '_id email name trustScore');
        } catch (dbErr) {
            console.error('[AutoRepay] ❌  DB query failed:', dbErr.message);
            return;
        }

        if (!loans.length) {
            console.log('[AutoRepay] 📭  No active funded loans found.');
            return;
        }

        console.log(`[AutoRepay] 📋  Processing ${loans.length} active loan(s)...`);

        // Process sequentially to avoid RPC rate-limit hammering
        for (const loan of loans) {
            const agreementAddress = loan.simulatedSmartContractId;

            // Validate it looks like an Ethereum address (factory-deployed agreements)
            if (!agreementAddress || !ethers.isAddress(agreementAddress)) {
                continue;
            }

            // Just note if newly created and processing for the first time
            if (!loan.onChainProcessed) {
                console.log(JSON.stringify({ event: 'Loan Created', loanId: loan._id.toString(), agreement: agreementAddress }));
                loan.onChainProcessed = true;
                await loan.save();
            }

            await processAgreement(loan, agreementAddress);
        }

        console.log(`[AutoRepay] ✔️   Cycle complete.\n`);
    } finally {
        isRunning = false;
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
function startAutoRepayScheduler() {
    if (!initSigner()) {
        console.error('[AutoRepay] ⛔  Scheduler not started — missing env vars.');
        return;
    }

    console.log('[AutoRepay] 🟢  Starting scheduler — interval: every 60 seconds');

    // Fire immediately on start, then every 60 seconds
    runRepaymentCycle();
    cron.schedule('* * * * *', runRepaymentCycle); // every 60s (every minute)
}

module.exports = { startAutoRepayScheduler };
