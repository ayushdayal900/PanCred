import React, { useState, useRef, useEffect } from "react";
import "./SupportBot.css";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const SupportBot = () => {
    const { userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Translations for UI elements (Default to English)
    const translations = {
        title: "Support",
        placeholder: "Type a message...",
        sendBtn: "Send",
        initialBotMsg: "Hi! How can I help you today?",
        botResponseDelay: "I am a support bot. How else may I assist you?",
        errorMsg: "Sorry, I am having trouble connecting to the server right now.",
    };

    // Conversation state management
    const [mode, setMode] = useState("faq");
    const [collectedData, setCollectedData] = useState({});
    const [escalated, setEscalated] = useState(false);

    // Hardcoded escalation trigger words
    const escalationKeywords = [
        "complaint",
        "fraud",
        "problem",
        "issue",
        "refund",
    ];

    const formatTimestamp = (date) => {
        return new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(date);
    };

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: translations.initialBotMsg,
            sender: "bot",
            timestamp: formatTimestamp(new Date()),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleReset = () => {
        setMessages([
            {
                id: Date.now(),
                text: translations.initialBotMsg,
                sender: "bot",
                timestamp: formatTimestamp(new Date()),
            },
        ]);
        setMode("faq");
        setCollectedData({});
        setEscalated(false);
    };

    const confirmLoanRequest = async (intent) => {
        setIsTyping(true);
        try {
            const userInfo = localStorage.getItem('userInfo');
            let token = "";
            if (userInfo) {
                token = JSON.parse(userInfo).token;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` })
                },
                body: JSON.stringify({
                    confirmLoan: true,
                    loanData: {
                        borrowerId: userProfile?._id,
                        amountRequested: Number(intent.amount) || 50,
                        interestRate: 12,
                        durationMonths: Number(intent.duration_months) || 3,
                        purpose: "Requested via AI SupportBot",
                        loanMode: 1
                    }
                })
            });

            const data = await response.json();
            setIsTyping(false);

            if (data.success) {
                setMessages(prev => prev.map(m => {
                    if (m.loanIntent === intent) {
                        return { ...m, text: "✅ Loan request submitted successfully and matched on-chain in the background!", loanIntent: null };
                    }
                    return m;
                }));
                toast.success("Loan request created successfully!");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errMsg = data.message || data.error || "Unknown error";
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    text: `❌ Failed to create loan: ${errMsg}`,
                    sender: "bot",
                    timestamp: formatTimestamp(new Date())
                }]);
            }
        } catch (err) {
            console.error("Failed to confirm loan:", err);
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: "❌ An error occurred during loan creation.",
                sender: "bot",
                timestamp: formatTimestamp(new Date())
            }]);
        }
    };

    const cancelLoanRequest = (msgId) => {
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                return { ...m, text: "Loan request cancelled.", loanIntent: null };
            }
            return m;
        }));
    };

    const handleSend = async () => {
        if (!inputValue.trim() || escalated || isTyping) return;

        const rawInput = inputValue.trim();
        const lowerInput = rawInput.toLowerCase();

        // Handle explicit local resets
        if (lowerInput === "reset" || lowerInput === "start over") {
            handleReset();
            setInputValue("");
            return;
        }

        // Local Regex Intercept for Complaints
        const hasComplaint = escalationKeywords.some((keyword) =>
            lowerInput.includes(keyword),
        );
        if (hasComplaint) {
            const newUserMessage = {
                id: Date.now(),
                text: rawInput,
                sender: "user",
                timestamp: formatTimestamp(new Date()),
            };
            const escalationResponse = {
                id: Date.now() + 1,
                text: "I'm transferring this to human support. Please email us at pancred.support@gmail.com with your details.",
                sender: "bot",
                timestamp: formatTimestamp(new Date()),
            };

            setMessages((prev) => [...prev, newUserMessage, escalationResponse]);
            setInputValue("");
            setEscalated(true);
            return; // Halt AI logic entirely
        }

        const newUserMessage = {
            id: Date.now(),
            text: rawInput,
            sender: "user",
            timestamp: formatTimestamp(new Date()),
        };

        setMessages((prev) => {
            const updatedMessages = [...prev, newUserMessage];
            if (updatedMessages.length > 10) {
                return updatedMessages.slice(updatedMessages.length - 10);
            }
            return updatedMessages;
        });
        setInputValue("");
        setIsTyping(true);

        try {
            const userInfo = localStorage.getItem('userInfo');
            let token = "";
            if (userInfo) {
                token = JSON.parse(userInfo).token;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` })
                },
                body: JSON.stringify({
                    message: rawInput,
                    sessionId: userProfile?._id || "session-guest",
                    language: "English"
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            setIsTyping(false);

            if (data.type === "loan_intent") {
                const botResponse = {
                    id: Date.now() + 1,
                    text: `Drafting loan request for ${data.data.amount} USDT for ${data.data.duration_months} months. Please confirm details below:`,
                    sender: "bot",
                    timestamp: formatTimestamp(new Date()),
                    loanIntent: data.data
                };
                setMessages((prev) => {
                    const updatedMessages = [...prev, botResponse];
                    if (updatedMessages.length > 10) {
                        return updatedMessages.slice(updatedMessages.length - 10);
                    }
                    return updatedMessages;
                });
            } else {
                const botResponse = {
                    id: Date.now() + 1,
                    text: data.data,
                    sender: "bot",
                    timestamp: formatTimestamp(new Date()),
                };
                setMessages((prev) => {
                    const updatedMessages = [...prev, botResponse];
                    if (updatedMessages.length > 10) {
                        return updatedMessages.slice(updatedMessages.length - 10);
                    }
                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error("Failed to fetch bot response:", error);
            setIsTyping(false);
            const errorResponse = {
                id: Date.now() + 1,
                text: translations.errorMsg,
                sender: "bot",
                timestamp: formatTimestamp(new Date()),
            };
            setMessages((prev) => [...prev, errorResponse]);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSend();
        }
    };

    return (
        <div className="support-bot-container">
            {isOpen ? (
                <div className="support-bot-window">
                    <div className="support-bot-header">
                        <h4>{translations.title}</h4>
                        <div className="support-bot-header-controls">
                            <button
                                className="support-bot-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close Chat"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <div className="support-bot-messages">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`support-bot-message-wrapper ${msg.sender}`}
                            >
                                <div className={`support-bot-message ${msg.sender}`}>
                                    {msg.text}
                                    {msg.loanIntent && (
                                        <div className="support-bot-loan-card text-left">
                                            <h5>AI Loan Assistant</h5>
                                            <div className="support-bot-loan-card-grid">
                                                <div className="support-bot-loan-card-field">
                                                    <span className="support-bot-loan-card-label">Amount:</span>
                                                    <span className="support-bot-loan-card-value">{msg.loanIntent.amount || "50"} USDT</span>
                                                </div>
                                                <div className="support-bot-loan-card-field">
                                                    <span className="support-bot-loan-card-label">Duration:</span>
                                                    <span className="support-bot-loan-card-value">{msg.loanIntent.duration_months || "3"} Months</span>
                                                </div>
                                                <div className="support-bot-loan-card-field">
                                                    <span className="support-bot-loan-card-label">Interest Rate:</span>
                                                    <span className="support-bot-loan-card-value">12% / Year</span>
                                                </div>
                                                <div className="support-bot-loan-card-field">
                                                    <span className="support-bot-loan-card-label">Security:</span>
                                                    <span className="support-bot-loan-card-value">1% Fee Pool</span>
                                                </div>
                                            </div>
                                            <div className="support-bot-loan-card-actions">
                                                <button 
                                                    onClick={() => confirmLoanRequest(msg.loanIntent)}
                                                    className="support-bot-loan-card-confirm"
                                                >
                                                    Confirm Request
                                                </button>
                                                <button 
                                                    onClick={() => cancelLoanRequest(msg.id)}
                                                    className="support-bot-loan-card-cancel"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {msg.timestamp && (
                                    <span className="support-bot-timestamp">{msg.timestamp}</span>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="support-bot-message-wrapper bot">
                                <div className="support-bot-message bot typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="support-bot-input-area">
                        <input
                            type="text"
                            placeholder={
                                escalated
                                    ? "Chat closed. Please email support."
                                    : translations.placeholder
                            }
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={escalated || isTyping}
                            className="support-bot-input"
                        />
                        <button
                            className="support-bot-send"
                            onClick={handleSend}
                            disabled={escalated || isTyping || !inputValue.trim()}
                        >
                            {translations.sendBtn}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="support-bot-toggle"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open support chat"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default SupportBot;
