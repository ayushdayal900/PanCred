import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { ethers } from 'ethers';
import { useAccount, useConfig, useWalletClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiLoader, FiCheckCircle, FiInfo, FiActivity, FiShield, FiPlus, FiCalendar, FiTrendingUp, FiAlertCircle, FiChevronDown, FiChevronUp, FiAward } from 'react-icons/fi';


import addresses from '../contracts/addresses.json';
import _microfinanceJson from '../contracts/Microfinance.json';
// Support both { abi: [...] } wrapped format and raw array format
const microfinanceAbi = Array.isArray(_microfinanceJson) ? _microfinanceJson : _microfinanceJson.abi;
import _factoryJson from '../contracts/LoanAgreementFactory.json';
import _agreementJson from '../contracts/LoanAgreement.json';
const factoryAbi = Array.isArray(_factoryJson) ? _factoryJson : _factoryJson.abi;
const agreementAbi = Array.isArray(_agreementJson) ? _agreementJson : _agreementJson.abi;
import { mintIdentity, checkIdentityOwnership, parseBlockchainError } from '../blockchainService';
import LoanTimeline from '../components/LoanTimeline';
import TransactionAccordion from '../components/TransactionAccordion';


const BorrowerDashboard = () => {
    const { userProfile, token } = useAuth();
    const { address: walletAddress, isConnected, chainId } = useAccount();
    const config = useConfig();
    const { data: walletClient } = useWalletClient();
    const navigate = useNavigate();

    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [myLoans, setMyLoans] = useState([]);
    const [processingLoan, setProcessingLoan] = useState(null);
    const [onChainLoans, setOnChainLoans] = useState({ created: [], funded: [] });
    const [onChainLoading, setOnChainLoading] = useState(false);
    const [hasIdentity, setHasIdentity] = useState(false);
    const [identityChecking, setIdentityChecking] = useState(true);
    const [contractLinkInfo, setContractLinkInfo] = useState({ identity: 'Checking...', trust: 'Checking...' });

    // Factory agreements
    const [agreements, setAgreements] = useState([]);
    const [agreementsLoading, setAgreementsLoading] = useState(false);
    const [payingInstallment, setPayingInstallment] = useState(null);
    const [myAds, setMyAds] = useState([]);
    const [myAdsLoading, setMyAdsLoading] = useState(false);

    // Trust score data (from backend /me endpoint)
    const [trustData, setTrustData] = useState({
        trustScore: userProfile?.trustScore ?? 300,
        completedLoans: userProfile?.completedLoans ?? 0,
        trustHistory: []
    });
    const [showTrustHistory, setShowTrustHistory] = useState(false);

    const getTrustTier = (score) => {
        if (score >= 850) return { label: 'Prime', color: 'text-emerald-400' };
        if (score >= 700) return { label: 'Trusted', color: 'text-blue-400' };
        if (score >= 500) return { label: 'Building Credit', color: 'text-amber-400' };
        return { label: 'New Borrower', color: 'text-slate-500' };
    };

    const fetchTrustData = async () => {
        if (!token && !userProfile?.token) return;
        try {
            const res = await api.get('/users/me');
            if (res.data.success) {
                setTrustData({
                    trustScore: res.data.data.trustScore ?? 300,
                    completedLoans: res.data.data.completedLoans ?? 0,
                    trustHistory: res.data.data.trustHistory ?? [],
                });
            }
        } catch (err) {
            console.error('[BorrowerDashboard] Failed to fetch trust data:', err.message);
        }
    };


    const checkContractSync = async () => {
        try {
            const provider = walletClient ? new ethers.BrowserProvider(walletClient.transport) : new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");

            // 1. Verify code exists at the address
            const code = await provider.getCode(addresses.microfinance);
            if (code === '0x' || code === '0x0') {
                console.error("[Diagnostic] NO CONTRACT CODE FOUND at", addresses.microfinance);
                setContractLinkInfo({ identity: 'UNRESOLVED ADDR', trust: 'MISSING CODE' });
                return;
            }

            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, provider);

            // 2. Read identityContract address via getIdentityAddress() debug function
            let identityAddr;
            try {
                identityAddr = await contract.getIdentityAddress();
            } catch {
                // Fallback: try old public variable name
                try { identityAddr = await contract.identityContract(); } catch { identityAddr = await contract.identity(); }
            }
            const trustAddr = await contract.trustScore();

            setContractLinkInfo({
                identity: identityAddr,
                trust: trustAddr
            });

            // Step 10: Log identity address so we can verify wiring
            console.log("Microfinance identity address:", identityAddr);
            console.log("Config identity address      :", addresses.identity);
            console.log(
                identityAddr?.toLowerCase() === addresses.identity?.toLowerCase()
                    ? "[Diagnostic] ✅ Identity wiring MATCH — contract in sync."
                    : "[Diagnostic] 🚨 MISMATCH — Microfinance is pointing to wrong Identity!"
            );
        } catch (err) {
            console.error("[Diagnostic] Contract sync check failed:", err);
            const msg = err.message?.includes('call revert exception') ? 'REVERTED ON READ' :
                err.message?.includes('network') ? 'NETWORK ERROR' : 'ERROR: ' + err.message?.slice(0, 15);
            setContractLinkInfo({ identity: msg, trust: 'Error' });
        }
    };

    useEffect(() => {
        if (walletAddress) {
            checkUserIdentity();
            fetchOnChainLoans();
            fetchMyLoans();
            fetchMyAds();
            checkContractSync();
            fetchTrustData();
        }

        // Event listeners for real-time updates
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, provider);

        const handleUpdate = () => {
            fetchOnChainLoans();
            fetchMyLoans();
        };

        contract.on("LoanCreated", handleUpdate);
        contract.on("LoanFunded", handleUpdate);
        contract.on("LoanRepaid", handleUpdate);

        return () => {
            contract.off("LoanCreated", handleUpdate);
            contract.off("LoanFunded", handleUpdate);
            contract.off("LoanRepaid", handleUpdate);
        };
    }, [walletAddress]);

    // ──────────────────────────────────────────────────────
    // Fetch LoanAgreementFactory agreements for this borrower
    // ──────────────────────────────────────────────────────
    const fetchAgreements = async () => {
        if (!walletAddress || !addresses.loanFactory) return;
        setAgreementsLoading(true);
        try {
            const provider = walletClient
                ? new ethers.BrowserProvider(walletClient.transport)
                : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

            const factory = new ethers.Contract(addresses.loanFactory, factoryAbi, provider);
            const addrs = await factory.getBorrowerAgreements(walletAddress);
            console.log('[BorrowerDashboard] factory agreements:', addrs.length);

            const details = await Promise.all(addrs.map(async (addr) => {
                try {
                    const agr = new ethers.Contract(addr, agreementAbi, provider);
                    const status = await agr.getStatus();

                    let mode = 0;
                    try { mode = Number(await agr.getLoanMode()); } catch { mode = 0; }

                    return {
                        address: addr,
                        mode,
                        paymentsMade: Number(status._paymentsMade),
                        totalDuration: Number(status._totalDuration),
                        nextDueTimestamp: Number(status._nextDueTimestamp),
                        monthlyPayment: mode === 0 ? ethers.formatEther(status._monthlyPayment) : ethers.formatUnits(status._monthlyPayment, 6),
                        remainingPayments: Number(status._remainingPayments),
                        completed: status._completed,
                        missedPayments: Number(status._missedPayments),
                        isOverdue: status._isOverdue,
                        isDue: Date.now() / 1000 >= Number(status._nextDueTimestamp),
                    };
                } catch (e) {
                    console.error('[BorrowerDashboard] Failed to read agreement:', addr, e);
                    return null;
                }
            }));

            setAgreements(details.filter(Boolean));
        } catch (err) {
            console.error('[BorrowerDashboard] fetchAgreements error:', err);
        } finally {
            setAgreementsLoading(false);
        }
    };

    useEffect(() => {
        if (walletAddress) fetchAgreements();
    }, [walletAddress, walletClient]);

    // Listen to Agreement Events
    useEffect(() => {
        if (!agreements.length || !walletClient) return;
        const provider = new ethers.BrowserProvider(walletClient.transport);
        const activeListeners = [];

        agreements.forEach(agr => {
            const contract = new ethers.Contract(agr.address, agreementAbi, provider);

            const onPaid = (borrower, installmentNumber, amountPaid) => {
                if (borrower.toLowerCase() === walletAddress.toLowerCase()) {
                    toast.success(`Installment #${installmentNumber} paid!`, { id: `paid-${installmentNumber}` });
                    fetchAgreements();
                }
            };

            const onMissed = (borrower, cyclesMissed, paymentFailed) => {
                if (borrower.toLowerCase() === walletAddress.toLowerCase()) {
                    toast.error(`Installment missed! Triggers penalty.`, { id: `missed-${cyclesMissed}` });
                    fetchAgreements();
                }
            };

            contract.on("InstallmentPaid", onPaid);
            contract.on("InstallmentMissed", onMissed);
            activeListeners.push({ contract, onPaid, onMissed });
        });

        return () => {
            activeListeners.forEach(({ contract, onPaid, onMissed }) => {
                contract.off("InstallmentPaid", onPaid);
                contract.off("InstallmentMissed", onMissed);
            });
        };
    }, [agreements.map(a => a.address).join(','), walletClient, walletAddress]);

    const handlePayInstallment = async (agreement) => {
        if (!isConnected || !walletClient) return toast.error('Connect wallet first');
        const tid = toast.loading(`Paying installment for ${agreement.address.slice(0, 8)}...`);
        setPayingInstallment(agreement.address);
        try {
            const provider = new ethers.BrowserProvider(walletClient.transport);
            const signer = await provider.getSigner();

            // Branch based on loan mode
            let tx;
            if (agreement.mode === 0) {
                // ETH mode: send native ETH via repayETH()
                const agr = new ethers.Contract(agreement.address, agreementAbi, signer);
                const valueUnits = ethers.parseEther(agreement.monthlyPayment.toString()); // ETH has 18 decimals
                toast.loading('Confirm ETH payment in wallet...', { id: tid });
                tx = await agr.repayETH({ value: valueUnits });
            } else {
                // ERC20 mode: approve tUSDT then call repayInstallment()
                const tokenAbi = ["function approve(address spender, uint256 amount) public returns (bool)", "function allowance(address owner, address spender) view returns (uint256)"];
                const usdt = new ethers.Contract(addresses.mockUSDT, tokenAbi, signer);
                const valueUnits = ethers.parseUnits(agreement.monthlyPayment.toString(), 6); // MockUSDT has 6

                const currentAllowance = await usdt.allowance(walletAddress, agreement.address);
                if (currentAllowance < valueUnits) {
                    toast.loading('Approving tUSDT for payment...', { id: tid });
                    const approvetx = await usdt.approve(agreement.address, valueUnits);
                    await approvetx.wait();
                }

                const agr = new ethers.Contract(agreement.address, agreementAbi, signer);
                toast.loading('Confirm token payment in wallet...', { id: tid });
                tx = await agr.repayInstallment();
            }

            toast.loading('Broadcasting...', { id: tid });
            await tx.wait();

            toast.success('Installment paid! Lender credited.', { id: tid });
            fetchAgreements();
        } catch (err) {
            toast.error(parseBlockchainError(err), { id: tid });
        } finally {
            setPayingInstallment(null);
        }
    };


    const checkUserIdentity = async () => {
        setIdentityChecking(true);
        try {
            let provider = null;
            if (walletClient) {
                provider = new ethers.BrowserProvider(walletClient.transport);
            }
            const status = await checkIdentityOwnership(walletAddress, provider);
            setHasIdentity(status);
        } catch (err) {
            console.error("Identity check error:", err);
        } finally {
            setIdentityChecking(false);
        }
    };

    const fetchOnChainLoans = async () => {
        if (!walletAddress) return;
        setOnChainLoading(true);
        try {
            const provider = walletClient
                ? new ethers.BrowserProvider(walletClient.transport)
                : new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, provider);

            // Use getAllLoans() — single call, then filter client-side
            let rawLoans = [];
            try {
                rawLoans = await contract.getAllLoans();
                console.log("[BorrowerDashboard] getAllLoans() returned:", rawLoans.length, "loans");
            } catch {
                // Fallback to loop if old ABI cached
                const count = await contract.loanCounter();
                for (let i = 1; i <= Number(count); i++) {
                    rawLoans.push(await contract.getLoanDetails(i));
                }
                console.log("[BorrowerDashboard] Fallback loop fetched:", rawLoans.length, "loans");
            }

            const allCreated = [];
            const allFunded = [];

            for (const loan of rawLoans) {
                const formattedLoan = {
                    id: Number(loan.id),
                    borrower: loan.borrower,
                    lender: loan.lender,
                    amount: ethers.formatEther(loan.amount),
                    interest: ethers.formatEther(loan.interest),
                    duration: Number(loan.duration),
                    funded: loan.funded,
                    repaid: loan.repaid
                };
                if (loan.borrower.toLowerCase() === walletAddress.toLowerCase()) {
                    allCreated.push(formattedLoan);
                }
                if (loan.lender.toLowerCase() !== ethers.ZeroAddress.toLowerCase() &&
                    loan.lender.toLowerCase() === walletAddress.toLowerCase()) {
                    allFunded.push(formattedLoan);
                }
            }

            console.log("[BorrowerDashboard] My created loans:", allCreated.length);
            console.log("[BorrowerDashboard] My funded loans:", allFunded.length);
            setOnChainLoans({ created: allCreated, funded: allFunded });
        } catch (error) {
            console.error("[BorrowerDashboard] Error fetching on-chain loans:", error);
        } finally {
            setOnChainLoading(false);
        }
    };

    const fetchMyLoans = async () => {
        try {
            const res = await api.get('/loans/my');
            if (res.data.success) {
                setMyLoans(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching my loans:", error);
        }
    };

    const fetchMyAds = async () => {
        if (!token && !userProfile?.token) return;
        setMyAdsLoading(true);
        try {
            const res = await api.get('/loans/my-ads');
            if (res.data.success) {
                setMyAds(res.data.data);
            }
        } catch (error) {
            console.error('[BorrowerDashboard] Error fetching my ads:', error);
        } finally {
            setMyAdsLoading(false);
        }
    };

    const handleRepayLoan = async (loanId, smartContractId, amount) => {
        if (!isConnected) return toast.error("Please connect your wallet");

        const tid = toast.loading('Initiating repayment on-chain...');
        setProcessingLoan(loanId);

        try {
            const hasIdentity = await checkIdentityOwnership(walletAddress);
            if (!hasIdentity) {
                toast.error("Protocol Access Denied: No Identity NFT", { id: tid });
                navigate("/onboarding");
                return;
            }

            const provider = new ethers.BrowserProvider(walletClient.transport);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, signer);

            const loanDetails = await contract.getLoanDetails(smartContractId);
            const valueToSend = loanDetails.amount + loanDetails.interest;

            toast.loading('Confirm repayment in wallet...', { id: tid });
            const tx = await contract.repayLoan(smartContractId, { value: valueToSend });

            toast.loading('Repayment pending on-chain...', { id: tid });
            await tx.wait();

            toast.loading('Finalizing with protocol...', { id: tid });
            await api.put(`/loans/${loanId}/repay`, {
                txHash: tx.hash
            });

            toast.success('Loan fully repaid! Reputation increased.', { id: tid });
            fetchMyLoans();
        } catch (error) {
            toast.error(parseBlockchainError(error), { id: tid });
        } finally {
            setProcessingLoan(null);
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!isConnected) return toast.error("Please connect your wallet");

        const tid = toast.loading('Initializing proposal...');
        setLoading(true);

        try {
            const provider = new ethers.BrowserProvider(walletClient.transport);
            const hasIdentity = await checkIdentityOwnership(walletAddress, provider);
            if (!hasIdentity) {
                toast.error("No identity NFT detected", { id: tid });
                navigate("/onboarding");
                return;
            }

            const signer = await provider.getSigner();

            // Verify Microfinance contract code exists
            const code = await signer.provider.getCode(addresses.microfinance);
            if (code === "0x" || code === "0x0") {
                throw new Error("Loan Contract (Microfinance) not found at configured address on Sepolia.");
            }

            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, signer);

            const principal = ethers.parseEther(amount.toString());
            const interest = ethers.parseEther((amount * 0.1).toString()); // 10% interest
            const durationInSeconds = Number(duration) * 30 * 24 * 60 * 60;

            toast.loading('Confirm transaction in wallet...', { id: tid });
            const tx = await contract.createLoan(principal, interest, durationInSeconds);

            toast.loading('Broadcasting to network...', { id: tid });
            await tx.wait();

            toast.loading('Syncing proposal state...', { id: tid });
            await api.post('/loans', {
                borrowerId: userProfile._id,
                amountRequested: Number(amount),
                interestRate: 10,
                durationMonths: Number(duration),
                purpose,
                txHash: tx.hash
            });

            toast.success('Proposal live in marketplace!', { id: tid });
            setAmount('');
            setDuration('');
            setPurpose('');
            fetchMyLoans();
            fetchMyAds();
        } catch (error) {
            console.error("[Protocol Error] Request failed:", error);
            toast.error(parseBlockchainError(error), { id: tid });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">Borrower Terminal</h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium">Manage your active obligations and protocol reputation.</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-600/5 border border-blue-500/10 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Node Sync Active</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                {/* Left Column: Metrics & Form */}
                <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                        {/* ── Protocol Reputation Card ── */}
                        <div className="premium-card !p-8">
                            <div className="flex items-center gap-3 text-slate-500 mb-4">
                                <FiAward className="text-blue-500" />
                                <span className="text-[9px] uppercase font-black tracking-widest">Trust Score</span>
                            </div>
                            <div className="text-5xl md:text-6xl font-black text-white mb-1 tracking-tighter italic">{trustData.trustScore}</div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${getTrustTier(trustData.trustScore).color}`}>
                                    {getTrustTier(trustData.trustScore).label}
                                </span>
                            </div>
                            {/* Progress to 700 */}
                            {trustData.trustScore < 700 && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-[8px] text-slate-600 font-bold mb-1">
                                        <span>Progress to ETH unlock</span>
                                        <span>{trustData.trustScore} / 700</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.min(100, ((trustData.trustScore - 300) / 400) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between items-center">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Completed Loans</span>
                                <span className="text-lg font-black text-white italic">{trustData.completedLoans}</span>
                            </div>
                        </div>

                        <div className={`premium-card !p-8 border-l-4 ${hasIdentity ? 'border-l-emerald-500/50' : 'border-l-red-500/50'}`}>
                            <div className={`flex items-center gap-3 mb-6 font-black uppercase tracking-widest text-[9px] ${hasIdentity ? 'text-emerald-500' : 'text-red-500'}`}>
                                <FiShield /> Identity Status
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner ${hasIdentity ? 'bg-emerald-500/5 text-emerald-500' : 'bg-red-500/5 text-red-500'}`}>
                                    {identityChecking ? <FiLoader className="animate-spin" /> : hasIdentity ? <FiCheckCircle size={24} /> : <FiInfo size={24} />}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white font-black italic tracking-tight text-lg">
                                        {identityChecking ? 'Checking...' : hasIdentity ? 'Verified SBT' : 'Not Verified'}
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">
                                        {hasIdentity ? 'Authorized Node' : 'Missing Identity'}
                                    </p>
                                </div>
                            </div>
                            {!hasIdentity && !identityChecking && (
                                <button
                                    onClick={checkUserIdentity}
                                    className="mt-6 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                    Force Sync Local Node
                                </button>
                            )}
                        </div>

                        <div className="premium-card !p-6 bg-slate-900/50 border-dashed border-slate-800">
                            <div className="flex items-center gap-2 mb-4 text-[8px] font-black uppercase tracking-widest text-slate-600">
                                <FiActivity /> Protocol Health
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Network</span>
                                    <span className="text-[8px] text-blue-500 font-black uppercase">{chainId === 11155111 ? 'Sepolia' : 'Wrong Network'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Identity Node</span>
                                    <span className="text-[8px] text-slate-400 font-mono italic">{addresses.identity.slice(0, 6)}...{addresses.identity.slice(-4)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Linked Identity</span>
                                    {(() => {
                                        const val = contractLinkInfo.identity;
                                        const isAddr = val && val.startsWith('0x') && val.length === 42;
                                        const isMatch = isAddr && val.toLowerCase() === addresses.identity?.toLowerCase();
                                        return (
                                            <span className={`text-[8px] font-mono italic ${val === 'Checking...' ? 'text-slate-500' :
                                                !isAddr ? 'text-red-400' :
                                                    isMatch ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {val === 'Checking...' ? '...' :
                                                    isAddr ? `${val.slice(0, 6)}...${val.slice(-4)}` :
                                                        val.slice(0, 14)}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Loan List */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8 order-1 lg:order-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">Active Obligations</h2>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-black uppercase tracking-widest w-fit">{myLoans.length} Records</span>
                    </div>

                    {myLoans.length === 0 ? (
                        <div className="premium-card py-20 text-center space-y-6 border-2 border-dashed border-slate-900">
                            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-slate-700">
                                <FiInfo size={40} />
                            </div>
                            <p className="text-slate-500 font-bold italic text-lg">No active protocol history detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 md:space-y-8">
                            {myLoans.map(loan => (
                                <div key={loan._id} className="premium-card !p-8 md:!p-10 border-l-4 border-l-blue-600 group hover:shadow-2xl transition-all duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] md:text-[10px] font-mono text-slate-500 font-black uppercase tracking-widest">Proposal #{loan.simulatedSmartContractId || 'PENDING'}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${loan.status === 'Funded' ? 'bg-blue-500/10 text-blue-500' :
                                                    loan.status === 'Repaid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {loan.status}
                                                </span>
                                            </div>
                                            <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic">{loan.amountRequested} <span className="text-slate-500 text-sm font-normal not-italic ml-1">ETH</span></h3>
                                        </div>

                                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-8 md:gap-12">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Interest</p>
                                                <p className="text-white font-black italic text-lg">{loan.interestRate}%</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Term</p>
                                                <p className="text-white font-black italic text-lg">{loan.durationMonths}m</p>
                                            </div>
                                            <div className="col-span-2 sm:col-auto border-t sm:border-t-0 sm:border-l border-slate-900 pt-6 sm:pt-0 sm:pl-10 space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Total Settle</p>
                                                <p className="text-blue-500 font-black italic text-xl">{(loan.amountRequested * (1 + loan.interestRate / 100)).toFixed(4)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-10 px-2 overflow-x-auto no-scrollbar">
                                        <div className="min-w-[400px]">
                                            <LoanTimeline status={loan.status} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-8 pt-8 border-t border-slate-900">
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">Blockchain Evidence</p>
                                            <TransactionAccordion txHash={loan.status === 'Funded' ? loan.fundingTxHash : loan.repaymentTxHash} />
                                        </div>

                                        {loan.status === 'Funded' && (
                                            <button
                                                onClick={() => handleRepayLoan(loan._id, loan.simulatedSmartContractId, loan.amountRequested)}
                                                disabled={processingLoan === loan._id}
                                                className="btn-primary w-full md:w-auto px-12 !py-4 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10"
                                            >
                                                {processingLoan === loan._id ? <FiLoader className="animate-spin text-white" /> : 'Settle On-Chain'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── My Posted Loan Requests (Factory Ads) ── */}
            <section className="mt-16 pt-16 border-t border-slate-900">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
                            <FiPlus className="text-blue-500" /> My Posted Loan Requests
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">All ads you have broadcast on-chain to the lender marketplace.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {myAdsLoading && <FiLoader className="text-blue-500 animate-spin" />}
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-black uppercase tracking-widest w-fit">{myAds.length} Ad{myAds.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {myAds.length === 0 && !myAdsLoading ? (
                    <div className="premium-card py-16 text-center space-y-4 border-2 border-dashed border-slate-900">
                        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
                            <FiAlertCircle size={32} />
                        </div>
                        <p className="text-slate-500 font-bold italic">You have not posted any loan requests yet.</p>
                        <p className="text-slate-600 text-sm font-medium">Head to the <strong className="text-slate-400">Borrow</strong> page to post your first loan request.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myAds.map(ad => (
                            <div key={ad.adId} className={`premium-card !p-6 border-l-4 transition-all duration-300 hover:shadow-xl ${ad.status === 'Funded' ? 'border-l-emerald-500/60' : 'border-l-blue-500/50'}`}>
                                {/* Ad ID + Status pill */}
                                <div className="flex justify-between items-start mb-5">
                                    <span className="text-[9px] font-mono text-slate-500 font-black uppercase tracking-widest">Ad #{ad.adId}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${ad.status === 'Funded'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                        {ad.status}
                                    </span>
                                </div>

                                {/* Principal */}
                                <div className="mb-5">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Principal</p>
                                    <p className="text-3xl font-black text-white italic tracking-tighter">
                                        {Number(ad.principal).toFixed(4)}
                                        <span className="text-slate-500 text-sm font-normal not-italic ml-2">{ad.loanMode}</span>
                                    </p>
                                </div>

                                {/* Details grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-950/50 rounded-xl p-3 mb-5 border border-slate-900">
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Repay</p>
                                        <p className="text-xs font-black text-white">{Number(ad.totalRepayment).toFixed(4)} <span className="text-slate-500 font-normal">{ad.loanMode}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Duration</p>
                                        <p className="text-xs font-black text-white">{ad.repaymentInterval}m</p>
                                    </div>
                                </div>

                                {/* Mode badge */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${ad.loanMode === 'ETH'
                                    ? 'bg-blue-500/5 border border-blue-500/15 text-blue-400'
                                    : 'bg-emerald-500/5 border border-emerald-500/15 text-emerald-400'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${ad.loanMode === 'ETH' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                    {ad.loanMode === 'ETH' ? 'Native ETH' : 'ERC20 (tUSDT)'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* On-Chain Archive Section */}
            <section className="mt-16 pt-16 border-t border-slate-900">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">On-Chain Protocol Archive</h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Direct cryptographic verification of your protocol interactions.</p>
                    </div>
                    {onChainLoading && <FiLoader className="text-blue-500 animate-spin" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Created Loans */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Created by You
                        </h3>
                        {onChainLoans.created.length === 0 ? (
                            <div className="premium-card !p-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-900">Zero Records</div>
                        ) : (
                            onChainLoans.created.map(loan => (
                                <div key={loan.id} className="premium-card !p-6 flex flex-col gap-4 border-l-2 border-blue-500/30">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-mono text-slate-500 font-black">#ID-{loan.id}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${loan.repaid ? 'bg-emerald-500/10 text-emerald-500' : loan.funded ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                                            {loan.repaid ? 'Settled' : loan.funded ? 'Active' : 'Unfunded'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-black text-white italic tracking-tighter">{loan.amount} <span className="text-[10px] not-italic text-slate-600 ml-1">ETH</span></p>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Interest: {loan.interest} ETH</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Lender</p>
                                            <p className="text-[8px] font-mono text-slate-400">{loan.lender === ethers.ZeroAddress ? 'OPEN MARKET' : `${loan.lender.slice(0, 6)}...${loan.lender.slice(-4)}`}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Funded Loans */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Funded by You
                        </h3>
                        {onChainLoans.funded.length === 0 ? (
                            <div className="premium-card !p-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-900">Zero Records</div>
                        ) : (
                            onChainLoans.funded.map(loan => (
                                <div key={loan.id} className="premium-card !p-6 flex flex-col gap-4 border-l-2 border-emerald-500/30">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-mono text-slate-500 font-black">#ID-{loan.id}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${loan.repaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            {loan.repaid ? 'Settled' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-black text-white italic tracking-tighter">{loan.amount} <span className="text-[10px] not-italic text-slate-600 ml-1">ETH</span></p>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">ROI: +{loan.interest} ETH</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Borrower</p>
                                            <p className="text-[8px] font-mono text-slate-400">{loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* ── Installment Agreements (Factory) ── */}
            {addresses.loanFactory && (
                <section className="mt-16 pt-16 border-t border-slate-900">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">Installment Agreements</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">Active P2P loan contracts — pay monthly installments on-chain.</p>
                        </div>
                        {agreementsLoading && <FiLoader className="text-blue-500 animate-spin" />}
                    </div>

                    {agreements.length === 0 && !agreementsLoading ? (
                        <div className="premium-card py-16 text-center space-y-4 border-2 border-dashed border-slate-900">
                            <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-slate-700">
                                <FiCalendar size={32} />
                            </div>
                            <p className="text-slate-500 font-bold italic">No active factory agreements yet.</p>
                            <p className="text-slate-600 text-sm">Post a loan request on the Borrow page and wait for a lender to fund it.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {agreements.map(agr => {
                                const progress = agr.totalDuration > 0 ? (agr.paymentsMade / agr.totalDuration) * 100 : 0;
                                const nextDue = new Date(agr.nextDueTimestamp * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                return (
                                    <div key={agr.address} className={`premium-card !p-8 border-l-4 ${agr.completed ? 'border-l-emerald-500/50' : agr.isDue ? 'border-l-amber-500/50' : 'border-l-blue-500/50'}`}>
                                        {/* Contract address + status */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[9px] font-mono text-slate-500 font-black uppercase tracking-wider">Agreement</p>
                                                <p className="text-xs font-mono text-slate-400 mt-1">{agr.address.slice(0, 10)}...{agr.address.slice(-6)}</p>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${agr.completed ? 'bg-emerald-500/10 text-emerald-500' : agr.isOverdue ? 'bg-red-500/10 text-red-500' : agr.isDue ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {agr.completed ? 'Completed' : agr.isOverdue ? 'Overdue' : agr.isDue ? 'Payment Due' : 'Active'}
                                            </span>
                                        </div>

                                        {/* Monthly payment */}
                                        <div className="mb-6 flex justify-between items-end">
                                            <div>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Monthly Installment</p>
                                                <p className="text-3xl font-black text-white italic tracking-tighter">
                                                    {agr.monthlyPayment} <span className="text-slate-500 text-sm font-normal not-italic">{agr.mode === 0 ? 'ETH' : 'tUSDT'}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Remaining</p>
                                                <p className="text-lg font-black text-blue-400 italic tracking-tighter">
                                                    {(Number(agr.monthlyPayment) * agr.remainingPayments).toFixed(2)} {agr.mode === 0 ? 'ETH' : 'tUSDT'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Configuration Details */}
                                        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-900/40 rounded-xl p-4 border border-slate-800">
                                            <div>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Currency Mode</p>
                                                <p className="text-xs font-black text-white uppercase">{agr.mode === 0 ? 'Ethereum Base' : 'ERC20 (tUSDT)'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Autopay Execution</p>
                                                {agr.mode === 1 ? (
                                                    <span className="text-xs font-black text-emerald-400 uppercase flex items-center justify-end gap-1"><FiCheckCircle size={10} /> Enabled</span>
                                                ) : (
                                                    <span className="text-xs font-black text-amber-500 uppercase flex items-center justify-end gap-1">Disabled</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-4 gap-2 mb-6 bg-slate-950/50 rounded-xl p-3 text-center">
                                            <div>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Paid</p>
                                                <p className="text-white font-black italic">{agr.paymentsMade}/{agr.totalDuration}</p>
                                            </div>
                                            <div className="border-x border-slate-900">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Left</p>
                                                <p className="text-blue-400 font-black italic">{agr.remainingPayments}</p>
                                            </div>
                                            <div className="border-r border-slate-900">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Missed</p>
                                                <p className="text-red-400 font-black italic">{agr.missedPayments}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-center gap-1">
                                                    <FiCalendar size={9} className="text-slate-500" />
                                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Due</p>
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold">{agr.completed ? '—' : nextDue}</p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Repayment Progress</p>
                                                <p className="text-[8px] text-slate-400 font-black">{progress.toFixed(0)}%</p>
                                            </div>
                                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Pay button */}
                                        {!agr.completed && (
                                            <button
                                                onClick={() => handlePayInstallment(agr)}
                                                disabled={!agr.isDue || payingInstallment === agr.address}
                                                className={`w-full btn-primary !py-4 text-[10px] font-black uppercase tracking-widest ${agr.isDue ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10' : 'opacity-50 cursor-not-allowed'}`}
                                            >
                                                {payingInstallment === agr.address
                                                    ? <><FiLoader className="animate-spin inline mr-2" />Paying...</>
                                                    : agr.isDue
                                                        ? `Pay ${agr.monthlyPayment} ${agr.mode === 0 ? 'ETH' : 'tUSDT'} Now`
                                                        : `Next Due: ${nextDue}`
                                                }
                                            </button>
                                        )}

                                        {agr.completed && (
                                            <div className="flex items-center justify-center gap-2 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                                <FiCheckCircle className="text-emerald-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fully Repaid</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}
            {/* ── Trust Score History Section ── */}
            <section className="mt-16 pt-16 border-t border-slate-900">
                <button
                    onClick={() => setShowTrustHistory(v => !v)}
                    className="w-full flex items-center justify-between px-2 pb-6 group"
                >
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter flex items-center gap-3">
                            <FiAward className="text-blue-500" /> Trust Score History
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Full audit trail of your reputation updates.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest">{showTrustHistory ? 'Collapse' : 'Expand'}</span>
                        {showTrustHistory ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                    </div>
                </button>

                {showTrustHistory && (
                    <div>
                        {trustData.trustHistory.length === 0 ? (
                            <div className="premium-card py-12 text-center border-2 border-dashed border-slate-900">
                                <p className="text-slate-600 font-bold italic">No trust score history yet.</p>
                                <p className="text-slate-700 text-sm font-medium mt-1">Complete KYC, mint your SBT, and repay loans to build history.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {trustData.trustHistory.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between px-5 py-4 rounded-xl border ${entry.points >= 0
                                            ? 'bg-emerald-500/5 border-emerald-500/15'
                                            : 'bg-red-500/5 border-red-500/15'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${entry.points >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {entry.points >= 0 ? '+' : ''}{entry.points}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white">{entry.action}</p>
                                                <p className="text-[9px] text-slate-500 font-bold">
                                                    {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {' · '}
                                                    {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">New Score</p>
                                            <p className="text-lg font-black text-white italic">{entry.newScore}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default BorrowerDashboard;

