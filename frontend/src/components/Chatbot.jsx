import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect, useRef } from 'react';
import '../assets/styles/Chatbot.css';
import chatbotIcon from '../assets/images/chatbot.png';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I am your Agrimart assistant. How can I help you today?", isBot: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    // Hide on checkout page
    if (location.pathname === '/checkout') return null;

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
            text: messageToSend, 
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
                        parts: [{ text: m.text }]
                    }))
                })
            });

            const data = await response.json();
            setIsTyping(false);

            // Handle quota exceeded specially (don't throw, show it as a bot message)
            if (response.status === 429 || data.type === 'quota_exceeded') {
                const botMessage = {
                    text: data.text || "🔄 The AI assistant is temporarily at its daily limit. However, you can still ask about live prices or navigate to features.",
                    isBot: true,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isError: true,
                    type: 'quota_exceeded'
                };
                setMessages(prev => [...prev, botMessage]);
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || `Server Error (${response.status})`);
            }

            const botMessage = {
                text: data.text || data.message || '',
                isBot: true,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            if (data.actions && data.actions.length > 0) {
                botMessage.actions = data.actions;
            }

            if (data.type === "price_table") {
                const headers = ["Commodity", "Price", "Location", "Trend"];
                const rowsHtml = data.data.map(row => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${row.commodity}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${row.price}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${row.location}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${row.trend}</td>
                    </tr>
                `).join('');

                const tableHTML = `
                    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                        <thead>
                            <tr style="background-color: #f5f5f5;">
                                ${headers.map(header => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                `;

                botMessage.text = tableHTML;
                botMessage.isHTML = true;
                setMessages(prev => [...prev, botMessage]);
            } else if (data.type === "price_prediction") {
                // For price prediction, render as detailed cards with trend info
                const predictionHTML = `
                    <div style="width: 100%; margin: 10px 0;">
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                            <h4 style="margin: 0; color: #1e293b; font-size: 1.1rem;">${data.product}</h4>
                            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9rem;">Current Price: ${data.current_price}</p>
                            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.9rem;">7 Day Market Forecast Dashboard</p>
                        </div>
                        ${data.data.map((day, idx) => `
                            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <div>
                                        <strong style="color: #1e293b;">${day.day_label}</strong>
                                        <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">${day.day_label === 'Tomorrow' ? day.day_label : day.date}</span>
                                    </div>
                                    <div>
                                        <strong style="color: #1e293b; font-size: 1.1rem;">${day.predicted_price}</strong>
                                        <span style="color: ${day.trend_direction === 'up' ? '#10b981' : day.trend_direction === 'down' ? '#ef4444' : '#64748b'}; font-size: 0.9rem; margin-left: 8px;">
                                            ${day.trend_direction === 'up' ? '▲' : day.trend_direction === 'down' ? '▼' : '—'} ${day.trend_percent}
                                        </span>
                                    </div>
                                </div>
                                <div style="font-size: 0.85rem; color: #64748b;">
                                    Expected Range: ${day.range_min} – ${day.range_max}
                                </div>
                                <div style="font-size: 0.85rem; color: #10b981; font-weight: 500;">
                                    ${day.confidence} Confidence
                                </div>
                            </div>
                        `).join('')}
                        <div style="background: #e0f2fe; padding: 12px; border-radius: 8px; margin-top: 12px;">
                            <strong style="color: #0369a1;">📊 Insight:</strong>
                            <p style="margin: 4px 0 0 0; color: #0369a1; font-size: 0.9rem;">${data.suggestion}</p>
                        </div>
                    </div>
                `;
                botMessage.text = predictionHTML;
                botMessage.isHTML = true;
                setMessages(prev => [...prev, botMessage]);
            } else if (data.type === "no_data" || data.text) {
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            setIsTyping(false);
            setMessages(prev => [...prev, { 
                text: `Assistant Error: ${error.message}. Please try again later.`, 
                isBot: true, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true 
            }]);
        }
    };

    // Voice Input Setup
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please try Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; // Default, but it handles mixed input well
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

    const handleNavigation = (target) => {
        const role = user?.role || 'customer';
        const routes = {
            'HOME': '/',
            'PRODUCTS': '/products',
            'ORDERS': role === 'farmer' ? '/orders-received' : '/orders',
            'MY_PRODUCTS': '/my-products',
            'SELL': '/sell-produce',
            'REVENUE': '/orders-received',
            'CART': '/cart',
            'PROFILE': '/profile',
            'PRICES': '/prices',
            'PREDICTIONS': '/price-prediction',
            'CONTACT': '/contact'
        };

        const path = routes[target];
        if (path) {
            setIsOpen(false); // Close chatbot on navigation for better UX
            navigate(path);
        }
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
                                {msg.isBot ? (
                                    msg.isHTML ? (
                                        <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                    ) : (
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    )
                                ) : (
                                    msg.text
                                )}
                                {msg.buttonText && msg.buttonTarget && (
                                    <button
                                        className="chatbot-action-btn"
                                        onClick={() => handleNavigation(msg.buttonTarget)}
                                        style={{
                                            marginTop: '10px',
                                            padding: '8px 12px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {msg.buttonText}
                                    </button>
                                )}
                                {msg.actions && msg.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        className="chatbot-action-btn"
                                        onClick={() => navigate(action.route)}
                                        style={{
                                            marginTop: '10px',
                                            marginRight: '5px',
                                            padding: '8px 12px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {action.label}
                                    </button>
                                ))}
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
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
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
