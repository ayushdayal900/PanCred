import React, { useEffect, useState, useCallback } from 'react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import '@aws-amplify/ui-react/styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')?.token;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function RiskBadge({ riskLevel }) {
    const config = {
        Live: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#4ade80', icon: '✅' },
        Suspicious: { bg: 'rgba(234,179,8,0.15)', border: '#eab308', text: '#facc15', icon: '⚠️' },
        Fake: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#f87171', icon: '❌' },
    };
    const c = config[riskLevel] || config.Fake;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '20px',
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
            }}
        >
            {c.icon} {riskLevel}
        </span>
    );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
    const radius = 54;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (score / 100) * circ;
    const color = score >= 70 ? '#22c55e' : score >= 30 ? '#eab308' : '#ef4444';

    return (
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle
                    cx="70" cy="70" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{Math.round(score)}</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>CONFIDENCE</span>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LivenessVerification() {
    const [phase, setPhase] = useState('idle');      // idle | loading | detecting | verified | failed | error
    const [sessionId, setSessionId] = useState(null);
    const [result, setResult] = useState(null);    // { success, riskLevel, confidenceScore, token }
    const [errMsg, setErrMsg] = useState('');

    // ── 1. Create session on mount ──────────────────────────────────────────────
    useEffect(() => {
        startSession();
    }, []);

    const startSession = useCallback(async () => {
        setPhase('loading');
        setResult(null);
        setErrMsg('');
        try {
            const res = await fetch(`${API_URL}/api/liveness/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Session creation failed');
            setSessionId(data.sessionId);
            setPhase('detecting');
        } catch (e) {
            setErrMsg(e.message);
            setPhase('error');
        }
    }, []);

    // ── 2. AWS component fires this when analysis is complete ───────────────────
    const handleAnalysisComplete = useCallback(async () => {
        setPhase('loading');
        try {
            const res = await fetch(`${API_URL}/api/liveness/verify-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ sessionId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Verification failed');
            setResult(data);
            setPhase(data.success ? 'verified' : 'failed');
        } catch (e) {
            setErrMsg(e.message);
            setPhase('error');
        }
    }, [sessionId]);

    const handleError = useCallback((err) => {
        console.error('[Liveness] AWS detector error:', err);
        setErrMsg(err?.message || 'Camera / network error during liveness check');
        setPhase('error');
    }, []);

    // ─── UI ──────────────────────────────────────────────────────────────────────
    const styles = {
        page: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 60%, #101c35 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        },
        card: {
            width: '100%',
            maxWidth: 520,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            backdropFilter: 'blur(20px)',
            padding: '2.5rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        },
        heading: {
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#f1f5f9',
            margin: '0 0 0.25rem',
            textAlign: 'center',
        },
        sub: {
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            marginBottom: '2rem',
        },
        spinner: {
            width: 48, height: 48,
            border: '4px solid rgba(99,179,237,0.2)',
            borderTop: '4px solid #63b3ed',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '1.5rem auto',
        },
        btn: {
            display: 'block',
            width: '100%',
            padding: '0.85rem',
            marginTop: '1.5rem',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'opacity 0.2s',
        },
        tokenBox: {
            marginTop: '1.25rem',
            background: 'rgba(99,179,237,0.07)',
            border: '1px solid rgba(99,179,237,0.2)',
            borderRadius: 10,
            padding: '0.75rem 1rem',
            wordBreak: 'break-all',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'monospace',
        },
    };

    const LoadingSpinner = () => (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={styles.spinner} />
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                {phase === 'loading' ? 'Processing…' : 'Initialising…'}
            </p>
        </>
    );

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.heading}>🔬 Liveness Verification</h1>
                <p style={styles.sub}>Prove you're a real person using your camera</p>

                {/* ── Loading ── */}
                {(phase === 'idle' || phase === 'loading') && <LoadingSpinner />}

                {/* ── AWS FaceLivenessDetector ── */}
                {phase === 'detecting' && sessionId && (
                    <FaceLivenessDetector
                        sessionId={sessionId}
                        region={import.meta.env.VITE_AWS_REGION || 'ap-south-1'}
                        onAnalysisComplete={handleAnalysisComplete}
                        onError={handleError}
                        displayText={{ hintMoveFaceToOvalText: 'Move your face into the oval' }}
                    />
                )}

                {/* ── Verified ── */}
                {phase === 'verified' && result && (
                    <>
                        <ScoreRing score={result.confidenceScore} />
                        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                            <RiskBadge riskLevel={result.riskLevel} />
                            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.75rem' }}>
                                Identity Confirmed
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                Confidence: <strong style={{ color: '#f1f5f9' }}>{result.confidenceScore.toFixed(1)}%</strong>
                            </p>
                        </div>
                        {result.token && (
                            <div style={styles.tokenBox}>
                                <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 4, fontSize: '0.68rem' }}>LIVENESS TOKEN</div>
                                {result.token}
                            </div>
                        )}
                        <button style={styles.btn} onClick={startSession}>Run Again</button>
                    </>
                )}

                {/* ── Suspicious / Failed ── */}
                {phase === 'failed' && result && (
                    <>
                        <ScoreRing score={result.confidenceScore} />
                        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                            <RiskBadge riskLevel={result.riskLevel} />
                            <p style={{ color: result.riskLevel === 'Suspicious' ? '#facc15' : '#f87171', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.75rem' }}>
                                {result.riskLevel === 'Suspicious' ? 'Verification Inconclusive' : 'Liveness Check Failed'}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                Score: <strong style={{ color: '#f1f5f9' }}>{result.confidenceScore.toFixed(1)}%</strong>
                            </p>
                        </div>
                        <button style={styles.btn} onClick={startSession}>Try Again</button>
                    </>
                )}

                {/* ── Error ── */}
                {phase === 'error' && (
                    <>
                        <p style={{ textAlign: 'center', color: '#f87171', fontWeight: 600, marginTop: '1rem' }}>
                            ❌ {errMsg || 'Something went wrong'}
                        </p>
                        <button style={styles.btn} onClick={startSession}>Retry</button>
                    </>
                )}
            </div>
        </div>
    );
}
