import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect, useRef } from 'react';
import '../assets/styles/Chatbot.css';
import chatbotIcon from '../assets/images/chatbot.png';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { message: "Hello! I am your Agrimart assistant. How can I help you today?", isBot: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const isCheckoutPage = location.pathname === '/checkout';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (text) => {
        const messageToSend = text || input;
        if (!messageToSend.trim()) return;

        const newMessage = { 
            message: messageToSend, 
            isBot: false, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        
        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    message: messageToSend,
                    role: user?.role || 'guest',
                    chatHistory: messages.map(m => ({
                        role: m.isBot ? 'model' : 'user',
                        parts: [{ text: String(m.message || m.text || "") }]
                    }))
                })
            });

            const data = await response.json();
            setIsTyping(false);

            if (!response.ok) {
                throw new Error(data.error || `Server Error (${response.status})`);
            }

            const botMessage = {
                ...data, // Include type, headers, data, message, route, footer, etc.
                isBot: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            setIsTyping(false);
            setMessages(prev => [...prev, { 
                message: `Assistant Error: ${error.message}. Please try again later.`, 
                isBot: true, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true 
            }]);
        }
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please try Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleSend(transcript);
        };

        recognition.start();
    };

    if (isCheckoutPage) return null;

    const renderMessageContent = (msg) => {
        const textContent = msg.message || msg.text || "";

        if (msg.type === 'table') {
            return (
                <div style={{ width: '100%', margin: '10px 0', overflowX: 'auto' }}>
                    {textContent && <p style={{ marginBottom: '8px', fontSize: '0.9rem' }}>{textContent}</p>}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {msg.headers.map((h, i) => (
                                    <th key={i} style={{ padding: '6px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {msg.data.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {row.map((cell, j) => (
                                        <td key={j} style={{ padding: '6px', color: '#1e293b' }}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {msg.footer && msg.footer.type === 'navigation' && (
                         <button 
                            onClick={() => {
                                setIsOpen(false);
                                navigate(msg.footer.route);
                            }}
                            style={{
                                marginTop: '10px',
                                width: '100%',
                                padding: '8px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            {msg.footer.message}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    )}
                </div>
            );
        }

        if (msg.type === 'navigation') {
            return (
                <div style={{ margin: '10px 0' }}>
                    <p style={{ marginBottom: '10px' }}>{textContent}</p>
                    <button 
                        onClick={() => {
                            setIsOpen(false);
                            navigate(msg.route);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                    >
                        {msg.route.replace('/', '').replace(/-/g, ' ').toUpperCase() || 'OPEN PAGE'}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            );
        }

        return <ReactMarkdown>{textContent}</ReactMarkdown>;
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'window-open' : ''}`}>
            {!isOpen && (
                <div className="chatbot-label">
                    Chat with AI
                </div>
            )}
            <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)} title="Open Chat">
                <img src={chatbotIcon} alt="Chatbot" />
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={chatbotIcon} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#fff' }} />
                            <h3>Agrimart AI Assistant</h3>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.isBot ? 'bot' : 'user'} ${msg.isError ? 'error' : ''}`}>
                                {msg.isBot ? renderMessageContent(msg) : (msg.message || msg.text)}
                                <span className="timestamp">{msg.time}</span>
                            </div>
                        ))}
                        {isTyping && <div className="typing-indicator">Assistant is thinking...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-input-area">
                        <div className="input-wrapper">
                            <button 
                                className={`voice-btn ${isListening ? 'active' : ''}`} 
                                onClick={startListening}
                                title="Voice Input"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <path d="M8 23h8" />
                                </svg>
                            </button>
                            <input 
                                type="text" 
                                className="chatbot-input" 
                                placeholder="Type your query..." 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button className="send-btn" onClick={() => handleSend()} title="Send Message" disabled={!input.trim() || isTyping}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
