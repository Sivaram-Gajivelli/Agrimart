import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Mail, Truck, MapPin, Save, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Delivery.css';

const DeliveryProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        vehicleType: '',
        vehicleNumber: ''
    });

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/delivery/profile', { withCredentials: true });
            setProfile(res.data);
            setFormData({
                name: res.data.name || '',
                phone: res.data.phone || '',
                vehicleType: res.data.vehicleType || '',
                vehicleNumber: res.data.vehicleNumber || ''
            });
        } catch (err) {
            toast.error('Failed to fetch profile details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone') {
            value = value.replace(/\D/g, '').slice(0, 10);
        }
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!/^\d{10}$/.test(formData.phone)) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        try {
            await axios.put('/api/delivery/profile', formData, { withCredentials: true });
            toast.success('Profile updated successfully');
            setIsEditing(false);
            fetchProfile();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    };

    if (loading) return <div>Loading Profile...</div>;

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ marginBottom: '8px', fontSize: '1.875rem', fontWeight: 800 }}>My Profile</h1>
            <p style={{ color: '#64748b', marginBottom: '32px' }}>Manage your personal details and vehicle information.</p>

            <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <User size={40} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{profile.name}</h2>
                            <p style={{ margin: 0, color: '#64748b' }}>Delivery Professional</p>
                        </div>
                    </div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                            <Edit2 size={18} /> Edit Profile
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: isEditing ? 'white' : '#f8fafc' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} placeholder="10-digit mobile number" style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: isEditing ? 'white' : '#f8fafc' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input value={profile.email} disabled style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', color: '#94a3b8' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Assigned Hub</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input value={profile.assignedHub?.name || 'Not assigned'} disabled style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', color: '#94a3b8' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Vehicle Type</label>
                            <div style={{ position: 'relative' }}>
                                <Truck size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input name="vehicleType" value={formData.vehicleType} onChange={handleChange} disabled={!isEditing} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: isEditing ? 'white' : '#f8fafc' }} placeholder="e.g. Pickup Truck, Motorcycle" />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Vehicle Number</label>
                            <div style={{ position: 'relative' }}>
                                <Truck size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#94a3b8' }} />
                                <input name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} disabled={!isEditing} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: isEditing ? 'white' : '#f8fafc' }} placeholder="e.g. AP 01 AB 1234" />
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
                            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#6366f1', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                <Save size={18} /> Save Changes
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '12px 24px', borderRadius: '12px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default DeliveryProfile;
