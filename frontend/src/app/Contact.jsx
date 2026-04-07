import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const Contact = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        category: 'General website issues',
        subject: '',
        message: '',
        orderId: ''
    });
    const [loading, setLoading] = useState(false);
    const [complaintId, setComplaintId] = useState(null);

    // Pre-fill form from URL parameters (e.g. /contact?subject=Order%20Issue)
    useEffect(() => {
        const subject = searchParams.get('subject');
        const message = searchParams.get('message');
        const category = searchParams.get('category');
        const orderId = searchParams.get('orderId');

        if (subject || message || category || orderId) {
            setFormData(prev => ({
                ...prev,
                subject: subject || prev.subject,
                message: message || prev.message,
                category: category || prev.category,
                orderId: orderId || prev.orderId
            }));
        }
    }, [searchParams]);

    const categories = [
        'Order issues (delay, wrong product, cancellation)',
        'Payment issues',
        'Product quality issues',
        'Farmer listing issues',
        'General website issues'
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    name: formData.name,
                    email: formData.email,
                    category: formData.category,
                    subject: formData.subject,
                    description: formData.message,
                    orderId: formData.orderId
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Complaint submitted successfully!");
                setComplaintId(data.complaintId);
                setFormData({ ...formData, subject: '', message: '', orderId: '' });
            } else {
                toast.error(data.message || "Failed to submit complaint.");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '4rem 5%', background: '#f8f9fa', minHeight: '80vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px' }}>
                
                {/* Support Details */}
                <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#2f7d32', marginBottom: '20px' }}>Customer Support</h2>
                    <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '30px' }}>
                        Need help? Our team is available 24/7 to assist you with any issues or queries.
                    </p>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Email Us</h4>
                        <p style={{ margin: 0, color: '#2f7d32', fontWeight: '600' }}>spmproject66@gmail.com</p>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Call Us</h4>
                        <p style={{ margin: 0, color: '#2f7d32', fontWeight: '600' }}>+91 91219 28148</p>
                    </div>

                    <div style={{ marginTop: '40px', padding: '20px', background: '#e8f5e9', borderRadius: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Quick Tip</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#4caf50' }}>
                            Providing your Order ID helps us resolve issues faster!
                        </p>
                    </div>
                </div>

                {/* Contact Form / Complaint Submission */}
                <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#333', marginBottom: '20px' }}>Submit a Complaint</h2>
                    
                    {complaintId && (
                        <div style={{ padding: '15px', background: '#e3f2fd', color: '#1976d2', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                            <strong>Success!</strong> Your Complaint ID is: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{complaintId}</span>. 
                            You can use this ID to check status via our chatbot.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Name</label>
                                <input 
                                    type="text" name="name" value={formData.name} onChange={handleChange} required
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Email</label>
                                <input 
                                    type="email" name="email" value={formData.email} onChange={handleChange} required
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Category</label>
                            <select 
                                name="category" value={formData.category} onChange={handleChange}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
                            >
                                {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Order ID (If applicable)</label>
                            <input 
                                type="text" name="orderId" value={formData.orderId} onChange={handleChange} placeholder="e.g. 65f123abc..."
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Subject</label>
                            <input 
                                type="text" name="subject" value={formData.subject} onChange={handleChange} required placeholder="Brief title of your issue"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Message / Description</label>
                            <textarea 
                                name="message" value={formData.message} onChange={handleChange} required rows="4" placeholder="Please describe your issue in detail..."
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', resize: 'vertical' }}
                            ></textarea>
                        </div>

                        <button 
                            type="submit" disabled={loading}
                            style={{ 
                                background: '#2f7d32', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', 
                                fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#256228'}
                            onMouseOut={(e) => e.target.style.background = '#2f7d32'}
                        >
                            {loading ? "Submitting..." : "Submit Complaint"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
