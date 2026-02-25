import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Webcam from "react-webcam";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import addresses from '../contracts/addresses.json';
import soulboundAbi from '../contracts/SoulboundIdentity.json';


const KYCVerification = () => {
    const { userProfile, submitKyc } = useAuth();
    const { address, isConnected, chainId } = useAccount();
    const navigate = useNavigate();
    const webcamRef = useRef(null);

    const [docType, setDocType] = useState('Aadhaar');
    const [docNumber, setDocNumber] = useState('');
    const [step, setStep] = useState(1);
    const [scanProgress, setScanProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [minting, setMinting] = useState(false);
    const [txHash, setTxHash] = useState(null);
    const [verifyingNFT, setVerifyingNFT] = useState(false);

    // Redirect to dashboard if they are already verified
    useEffect(() => {
        if (userProfile?.kycStatus === 'Verified' && userProfile?.nftIssued) {
            navigate('/dashboard');
        }
    }, [userProfile, navigate]);

    // Step 5 -> Check if user already owns an Identity NFT
    useEffect(() => {
        const checkOwnership = async () => {
            if (step === 5 && isConnected && address) {
                setVerifyingNFT(true);
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const contract = new ethers.Contract(addresses.identity, soulboundAbi, provider);
                    const balance = await contract.balanceOf(address);

                    if (Number(balance) > 0) {
                        console.log("Verified Identity detected in wallet.");
                        // Sync with backend to finalize status
                        await submitKyc(docType, docNumber, capturedImage, address, "ALREADY_OWNED");
                        setStep(7); // Jump to success screen
                    } else {
                        setStep(6); // Move to Mint NFT button
                    }
                } catch (error) {
                    console.error("NFT Ownership Check Failed:", error);
                    setStep(6); // Let them try to mint manually if check fails
                } finally {
                    setVerifyingNFT(false);
                }
            }
        };
        checkOwnership();
    }, [isConnected, step, address]);


    const handleDocumentSubmit = (e) => {
        e.preventDefault();
        setStep(2); // Move to Liveliness Check
        setCameraActive(true);
        setCameraReady(false);
    };

    const capture = useCallback(() => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            alert('Unable to capture image. Please make sure the camera has loaded.');
            return;
        }
        setCapturedImage(imageSrc);
        setCameraActive(false);
        startLivelinessScan(imageSrc);
    }, [webcamRef]);

    const startLivelinessScan = (imageStr) => {
        setStep(3); // Simulating scan progress UI
        let progress = 0;
        const interval = setInterval(() => {
            progress += 25;
            setScanProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                verifyFace(imageStr);
            }
        }, 500);
    };

    const verifyFace = async (imageStr) => {
        setStep(4); // AI Analysis step
        const success = await submitKyc(docType, docNumber, imageStr);
        if (success) {
            setStep(5); // Wallet Connection step
        } else {
            alert('KYC Liveliness Verification Failed. Ensure your face is clearly visible.');
            setStep(2); // Go back to camera
            setCameraActive(true);
            setScanProgress(0);
            setCapturedImage(null);
        }
    };

    const handleMintNFT = async () => {
        if (chainId !== 11155111) {
            alert("Please switch to Ethereum Sepolia Testnet!");
            return;
        }

        setMinting(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(addresses.identity, soulboundAbi, signer);

            // Directly call mint from frontend!
            const tx = await contract.mintIdentity(address);
            setTxHash(tx.hash);
            console.log("Mint Tx Hash:", tx.hash);

            const receipt = await tx.wait();
            console.log("Minted!", receipt);

            // Notify backend about the successful mint
            const success = await submitKyc(docType, docNumber, capturedImage, address, tx.hash);
            if (success) {
                setStep(7); // Final success
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 4000);
            }
        } catch (error) {
            console.error("Minting failed", error);
            alert("Minting failed: " + (error.reason || error.message));
        } finally {
            setMinting(false);
        }
    };

    const videoConstraints = {
        width: 400,
        height: 400,
        facingMode: "user"
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Complete Identity Verification</h2>
                <p className="text-slate-400">Unlock your decentralized wallet and Soulbound NFT.</p>
            </div>

            <div className="bg-fintech-card border border-fintech-border p-8 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden">
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                            Document Details
                        </h3>
                        <form onSubmit={handleDocumentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Document Type</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full bg-fintech-dark/50 border border-fintech-border text-white rounded-xl p-3 outline-none focus:border-fintech-accent focus:ring-1 focus:ring-fintech-accent"
                                >
                                    <option value="Aadhaar">Aadhaar Card</option>
                                    <option value="PAN">PAN Card</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Document Number</label>
                                <input
                                    type="text"
                                    value={docNumber}
                                    onChange={(e) => setDocNumber(e.target.value)}
                                    placeholder="Enter your ID"
                                    required
                                    className="w-full bg-fintech-dark/50 border border-fintech-border text-white rounded-xl p-3 outline-none focus:border-fintech-accent focus:ring-1 focus:ring-fintech-accent tracking-widest"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-6 bg-fintech-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                            >
                                Continue to Liveliness Check
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in flex flex-col items-center text-center">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                            <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                            Face Liveliness Check
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">Please position your face within the frame and ensure good lighting.</p>

                        <div className="w-64 h-64 rounded-full border-4 border-slate-600 bg-fintech-dark/50 flex items-center justify-center mb-6 relative overflow-hidden">
                            {cameraActive ? (
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={videoConstraints}
                                    onUserMedia={() => setCameraReady(true)}
                                    className="object-cover w-full h-full transform scale-x-[-1]"
                                />
                            ) : (
                                <svg className="w-20 h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            )}
                        </div>

                        <button
                            onClick={capture}
                            disabled={!cameraActive || !cameraReady}
                            className="w-full bg-fintech-accent hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cameraReady ? 'Capture & Analyze' : 'Starting Camera...'}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in flex flex-col items-center py-8">
                        <div className="relative w-48 h-48 rounded-full border-4 border-fintech-accent bg-fintech-dark/50 flex items-center justify-center mb-8 overflow-hidden">
                            {capturedImage && <img src={capturedImage} alt="Captured" className="object-cover w-full h-full opacity-50 transform scale-x-[-1]" />}
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-fintech-accent/40 transition-all duration-500"
                                style={{ height: `${scanProgress}%` }}
                            ></div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Face Geometry...</h3>
                        <p className="text-fintech-accent font-mono">{scanProgress}%</p>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-fade-in flex flex-col items-center py-12">
                        <div className="w-16 h-16 border-4 border-t-fintech-accent border-r-fintech-accent border-b-transparent border-l-transparent rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-white mb-2">AI Verification in Progress...</h3>
                        <p className="text-slate-400 text-sm text-center">
                            Validating liveliness via Hugging Face model...
                        </p>
                    </div>
                )}

                {step === 5 && (
                    <div className="animate-fade-in flex flex-col items-center text-center py-8">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
                            {verifyingNFT ? (
                                <div className="w-8 h-8 border-3 border-t-blue-400 border-blue-400/20 rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">
                            {verifyingNFT ? 'Checking On-Chain Identity...' : 'Connect Your Private Wallet'}
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            {verifyingNFT ? 'Please wait while we verify your decentralized profile.' : 'Connect the wallet where you\'d like to receive your Soulbound Identity NFT.'}
                        </p>
                        {!verifyingNFT && <ConnectButton showBalance={false} />}
                    </div>
                )}

                {step === 6 && (
                    <div className="animate-fade-in flex flex-col items-center text-center py-8">
                        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/30">
                            <span className="text-xs font-bold uppercase">Ready</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Wallet Connected!</h3>
                        <p className="text-emerald-400 font-mono text-xs mb-4 truncate w-full px-4">{address}</p>
                        <p className="text-slate-400 text-sm mb-8">No non-transferable Identity NFT found. Click below to initiate your decentralized ID.</p>

                        <button
                            onClick={handleMintNFT}
                            disabled={minting}
                            className="w-full bg-fintech-accent hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center"
                        >
                            {minting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-t-white border-white/20 rounded-full animate-spin mr-3"></div>
                                    Minting on Sepolia...
                                </>
                            ) : 'Mint Identity NFT'}
                        </button>
                    </div>
                )}

                {step === 7 && (
                    <div className="animate-fade-in flex flex-col items-center py-10">
                        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">Verified Identity!</h3>
                        <div className="bg-fintech-dark border border-fintech-border p-4 rounded-xl w-full text-center">
                            <p className="text-slate-300 text-sm mb-1">Soulbound Identity Confirmed</p>
                            <p className="text-emerald-400 font-mono text-xs break-all">{address}</p>
                        </div>
                        <p className="text-slate-400 text-sm mt-6">
                            Identity verification successful. Redirecting to your dashboard...
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default KYCVerification;

