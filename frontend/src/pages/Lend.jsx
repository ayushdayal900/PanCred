import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import {
    FiDollarSign, FiLoader, FiRefreshCw, FiUser,
    FiCalendar, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiZap
} from 'react-icons/fi';
import { parseBlockchainError, getSharedProvider } from '../blockchainService';
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
                : getSharedProvider();

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
        <div className="space-y-8 md:space-y-10 p-1">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-3">
                        <FiDollarSign style={{ color: '#2563EB' }} /> P2P Marketplace
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Fund verified requests and earn protocol-secured yields.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <span className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {requests.length} Open Requests
                    </span>
                    <button
                        onClick={fetchRequests}
                        disabled={loading}
                        className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-50 transition-all"
                    >
                        <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Factory not deployed */}
            {!hasFactory && (
                <div className="premium-card !border-red-100 bg-red-50">
                    <div className="flex items-start gap-4">
                        <FiAlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h3 className="text-red-900 font-bold mb-2">Factory Not Deployed</h3>
                            <p className="text-red-700 text-sm mb-4">
                                The protocol factory is missing on this network. Please deploy it to continue.
                            </p>
                            <code className="block bg-white/50 border border-red-200 text-red-600 font-mono text-xs px-4 py-3 rounded-xl">
                                npx hardhat run scripts/deployFactory.js --network sepolia
                            </code>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && hasFactory && (
                <div className="premium-card flex flex-col items-center justify-center gap-4 py-20">
                    <FiLoader size={32} className="animate-spin" style={{ color: '#2563EB' }} />
                    <p className="text-sm text-text-secondary font-medium animate-pulse uppercase tracking-widest">Syncing Marketplace...</p>
                </div>
            )}

            {/* Empty state */}
            {!loading && hasFactory && requests.length === 0 && (
                <div className="premium-card py-24 text-center border-2 border-dashed border-slate-200 bg-transparent">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-slate-50 text-slate-300 mb-6">
                        <FiDollarSign size={40} />
                    </div>
                    <div>
                        <p className="text-text-primary font-bold text-xl mb-2">Marketplace is Empty</p>
                        <p className="text-text-secondary text-sm max-w-sm mx-auto">
                            No active loan requests detected. Check back later or verify your network connection.
                        </p>
                    </div>
                </div>
            )}

            {/* Loan Request Cards */}
            {!loading && requests.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {requests.map(request => (
                        <div
                            key={request.id}
                            className="premium-card hover:shadow-lg transition-all duration-300 group"
                            style={{ borderLeft: '4px solid #10B981' }}
                        >
                            {/* Top: ID + borrower */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                        Request #{request.id}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <FiUser size={13} className="text-text-secondary" />
                                        <span className="text-xs font-mono text-text-secondary">
                                            {request.borrower.slice(0, 6)}...{request.borrower.slice(-4)}
                                        </span>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    +{request.yieldPct}% Yield
                                </span>
                            </div>

                            {/* Principal */}
                            <div className="mb-8">
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1.5">Principal Amount</p>
                                <p className="text-4xl font-bold text-text-primary tracking-tight">
                                    {request.principal} <span className="text-text-secondary text-lg font-medium tracking-normal">{request.mode === 0 ? 'ETH' : 'tUSDT'}</span>
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mb-1">Total Return</p>
                                    <p className="text-sm font-bold text-text-primary">{request.totalRepayment} {request.mode === 0 ? 'ETH' : 'tUSDT'}</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mb-1">Duration</p>
                                    <p className="text-sm font-bold text-text-primary">{request.durationInMonths}m</p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mb-1">Monthly</p>
                                    <p className="text-sm font-bold text-text-primary">{request.monthlyPayment}</p>
                                </div>
                            </div>

                            {/* Fund button */}
                            <button
                                onClick={() => handleFund(request)}
                                disabled={!isConnected || funding === request.id}
                                className="w-full btn-primary !py-4"
                            >
                                {funding === request.id
                                    ? <><FiLoader className="animate-spin" size={16} /> Deploying Agreement...</>
                                    : <><FiZap size={15} /> Fund Loan Request</>
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Protocol note */}
            {hasFactory && (
                <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200 border-dashed flex items-start gap-4">
                    <FiCheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-text-primary mb-1">Protocol Execution Protocol</p>
                        <p>Funding a request triggers the instant on-chain deployment of a <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">LoanAgreement</code>. Principal moves directly to the borrower. All returns are secured by the smart contract's immutable logic.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lend;
