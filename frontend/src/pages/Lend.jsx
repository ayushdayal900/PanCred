import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import {
    FiDollarSign, FiLoader, FiRefreshCw, FiUser,
    FiCalendar, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiZap
} from 'react-icons/fi';
import { parseBlockchainError } from '../blockchainService';
import addresses from '../contracts/addresses.json';
import _factoryJson from '../contracts/LoanAgreementFactory.json';

const factoryAbi = Array.isArray(_factoryJson) ? _factoryJson : _factoryJson.abi;
const INSURANCE_FEE = 0.01; // ETH

const Lend = () => {
    const { address: walletAddress, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [funding, setFunding] = useState(null); // id of request being funded

    const hasFactory = !!addresses.loanFactory;

    const fetchRequests = useCallback(async () => {
        if (!hasFactory) return;
        setLoading(true);
        try {
            const provider = walletClient
                ? new ethers.BrowserProvider(walletClient.transport)
                : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

            const factory = new ethers.Contract(addresses.loanFactory, factoryAbi, provider);
            const raw = await factory.getAllRequests();
            console.log('[Lend] getAllRequests() returned:', raw.length, 'entries');

            const formatted = raw
                .filter(r => !r.funded) // Only show open (unfunded) requests
                .map(r => {
                    const rMode = Number(r.mode) || 0; // The struct was updated to have `mode`
                    const decimals = rMode === 0 ? 18 : 6;

                    return {
                        id: Number(r.id),
                        borrower: r.borrower,
                        mode: rMode,
                        principal: ethers.formatUnits(r.principal, decimals),
                        totalRepayment: ethers.formatUnits(r.totalRepayment, decimals),
                        durationInMonths: Number(r.durationInMonths),
                        funded: r.funded,
                        agreementAddress: r.agreementAddress,
                        monthlyPayment: (Number(ethers.formatUnits(r.totalRepayment, decimals)) / Number(r.durationInMonths)).toFixed(6),
                        yield: (Number(ethers.formatUnits(r.totalRepayment, decimals)) - Number(ethers.formatUnits(r.principal, decimals))).toFixed(6),
                        yieldPct: ((
                            (Number(ethers.formatUnits(r.totalRepayment, decimals)) - Number(ethers.formatUnits(r.principal, decimals)))
                            / Number(ethers.formatUnits(r.principal, decimals))
                        ) * 100).toFixed(1),
                    };
                })
                .filter(r => r.borrower.toLowerCase() !== walletAddress?.toLowerCase()); // Exclude own requests

            setRequests(formatted);
        } catch (err) {
            console.error('[Lend] fetchRequests failed:', err);
            toast.error('Failed to load marketplace. Try again.');
        } finally {
            setLoading(false);
        }
    }, [hasFactory, walletClient, walletAddress]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleFund = async (request) => {
        if (!isConnected) return toast.error('Connect your wallet first');
        if (!walletClient) return toast.error('Wallet not ready');

        const tid = toast.loading(`Funding loan #${request.id}...`);
        setFunding(request.id);
        try {
            const provider = new ethers.BrowserProvider(walletClient.transport);
            const signer = await provider.getSigner();
            const factory = new ethers.Contract(addresses.loanFactory, factoryAbi, signer);

            let tx;
            if (request.mode === 0) {
                // native ETH
                const principalWei = ethers.parseEther(request.principal);
                toast.loading('Confirm in wallet — send exact principal...', { id: tid });
                tx = await factory.fundLoanRequest(request.id, { value: principalWei });
            } else {
                // ERC20 token setup - approval needed for lender so Factory can transferFrom
                const tokenAbi = ["function approve(address spender, uint256 amount) public returns (bool)", "function allowance(address owner, address spender) view returns (uint256)"];
                const usdt = new ethers.Contract(addresses.mockUSDT, tokenAbi, signer);
                const principalUnits = ethers.parseUnits(request.principal, 6);

                const currentAllowance = await usdt.allowance(walletAddress, addresses.loanFactory);
                if (currentAllowance < principalUnits) {
                    toast.loading('Approving tUSDT for loan bridge...', { id: tid });
                    const approvetx = await usdt.approve(addresses.loanFactory, principalUnits);
                    await approvetx.wait();
                }

                toast.loading('Confirm in wallet...', { id: tid });
                tx = await factory.fundLoanRequest(request.id); // zero msg.value for ERC20
            }

            toast.loading('Deploying LoanAgreement contract...', { id: tid });
            await tx.wait();

            toast.success(`Loan #${request.id} funded! Agreement contract deployed. Principal sent to borrower.`, { id: tid });
            fetchRequests(); // refresh list
        } catch (err) {
            console.error('[Lend] fundLoanRequest failed:', err);
            toast.error(parseBlockchainError(err), { id: tid });
        } finally {
            setFunding(null);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <FiDollarSign className="text-emerald-500" /> P2P Loan Marketplace
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium italic">
                        Fund verified borrower requests. Earn monthly installment returns.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl font-black uppercase tracking-widest">
                        {requests.length} Open Requests
                    </span>
                    <button
                        onClick={fetchRequests}
                        disabled={loading}
                        title="Refresh"
                        className="w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                    >
                        <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Factory not deployed */}
            {!hasFactory && (
                <div className="premium-card !p-8 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start gap-4">
                        <FiAlertCircle className="text-amber-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h3 className="text-white font-black italic mb-2">Factory Contract Not Deployed</h3>
                            <p className="text-slate-400 text-sm font-medium mb-4">
                                The LoanAgreementFactory contract has not been deployed yet. Run the deploy script first:
                            </p>
                            <code className="block bg-slate-950 text-emerald-400 font-mono text-xs px-4 py-3 rounded-xl">
                                npx hardhat run scripts/deployFactory.js --network sepolia
                            </code>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && hasFactory && (
                <div className="premium-card !p-12 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <FiLoader size={32} className="animate-spin text-emerald-500" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Syncing marketplace from Sepolia...</p>
                </div>
            )}

            {/* Empty state */}
            {!loading && hasFactory && requests.length === 0 && (
                <div className="premium-card py-20 text-center space-y-6 border-2 border-dashed border-slate-900">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-slate-700">
                        <FiDollarSign size={40} />
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold italic text-lg">No open loan requests detected.</p>
                        <p className="text-slate-600 text-sm mt-2 font-medium">Borrowers haven't posted any requests yet, or all have been funded.</p>
                    </div>
                </div>
            )}

            {/* Loan Request Cards */}
            {!loading && requests.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {requests.map(request => (
                        <div
                            key={request.id}
                            className="premium-card !p-8 border-l-4 border-l-emerald-500/40 hover:border-l-emerald-500 transition-all duration-300 group"
                        >
                            {/* Top: ID + borrower */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[9px] font-mono text-slate-500 font-black uppercase tracking-widest">
                                        Request #{request.id}
                                    </span>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                            <FiUser size={12} className="text-blue-500" />
                                        </div>
                                        <span className="text-xs font-mono text-slate-400">
                                            {request.borrower.slice(0, 6)}...{request.borrower.slice(-4)}
                                        </span>
                                    </div>
                                </div>
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                    +{request.yieldPct}% Yield
                                </span>
                            </div>

                            {/* Principal */}
                            <div className="mb-6">
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">You Lend</p>
                                <p className="text-4xl font-black text-white italic tracking-tighter">
                                    {request.principal} <span className="text-slate-500 text-sm font-normal not-italic">{request.mode === 0 ? 'ETH' : 'tUSDT'}</span>
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-950/50 rounded-2xl p-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <FiTrendingUp size={11} className="text-emerald-500" />
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">You Earn</p>
                                    </div>
                                    <p className="text-emerald-400 font-black italic">{request.totalRepayment} {request.mode === 0 ? 'ETH' : 'tUSDT'}</p>
                                </div>
                                <div className="text-center border-x border-slate-900">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <FiCalendar size={11} className="text-blue-500" />
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Duration</p>
                                    </div>
                                    <p className="text-white font-black italic">{request.durationInMonths}m</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <FiZap size={11} className="text-amber-500" />
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Monthly</p>
                                    </div>
                                    <p className="text-white font-black italic text-[11px]">{request.monthlyPayment} {request.mode === 0 ? 'ETH' : 'tUSDT'}</p>
                                </div>
                            </div>

                            {/* Insurance info */}
                            <p className="text-[9px] text-slate-600 font-medium mb-6">
                                Insurance: {INSURANCE_FEE} ETH total distributed to treasury across installments.
                                Your net per month: <span className="text-slate-400 font-black">
                                    {(Number(request.monthlyPayment) - (request.mode === 0 ? INSURANCE_FEE / request.durationInMonths : 0)).toFixed(6)} {request.mode === 0 ? 'ETH' : 'tUSDT'}
                                </span>
                            </p>

                            {/* Fund button */}
                            <button
                                onClick={() => handleFund(request)}
                                disabled={!isConnected || funding === request.id}
                                className="w-full btn-primary !py-4 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 group-hover:shadow-emerald-500/20 transition-all"
                            >
                                {funding === request.id
                                    ? <><FiLoader className="animate-spin inline mr-2" />Deploying Agreement...</>
                                    : <><FiCheckCircle size={14} className="inline mr-2" />Fund {request.principal} {request.mode === 0 ? 'ETH' : 'tUSDT'}</>
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Protocol note */}
            {hasFactory && (
                <div className="premium-card !p-6 bg-slate-950/40 border-dashed border-slate-800 flex items-start gap-4">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                    <div className="text-[10px] text-slate-500 font-medium leading-relaxed space-y-1">
                        <p><strong className="text-slate-400">How it works:</strong> When you fund a request, a <code className="font-mono bg-slate-900 px-1 rounded text-slate-300">LoanAgreement</code> contract is instantly deployed on Sepolia. The principal is forwarded directly to the borrower's wallet. You receive monthly installments minus a small insurance cut (0.01 ETH total per loan).</p>
                        <p className="mt-1">All logic is enforced by the smart contract. No backend involvement required.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lend;
