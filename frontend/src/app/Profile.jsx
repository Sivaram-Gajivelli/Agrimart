import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    User, Phone, Mail, MapPin, 
    ShieldCheck, Key, ShieldAlert,
    Save, Edit2, Shield, Loader2, ArrowRight,
    Briefcase, Activity, CheckCircle2, XCircle, CreditCard
} from 'lucide-react';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', address: '' });
    
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    
    const [verificationStep, setVerificationStep] = useState(null); // 'email', 'phone', or 'password'
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/user/profile', { withCredentials: true });
            setUser(res.data);
            setProfileData({
                name: res.data.name || '',
                email: res.data.email || '',
                phone: res.data.phone || '',
                address: res.data.address || ''
            });
        } catch (error) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        
        // Security: If adding NEW email or phone, or CHANGING them, require OTP
        const isEmailNewOrChanged = profileData.email && profileData.email !== user.email;
        const isPhoneNewOrChanged = profileData.phone && profileData.phone !== user.phone;

        if (isEmailNewOrChanged || isPhoneNewOrChanged) {
            const type = isEmailNewOrChanged ? 'email' : 'phone';
            const contact = type === 'email' ? profileData.email : profileData.phone;
            
            try {
                const res = await axios.post('/api/user/verify-request', { contact, type }, { withCredentials: true });
                toast.info(res.data.message);
                setVerificationStep(type);
            } catch (err) {
                toast.error(err.response?.data?.message || "Verification request failed");
            }
            return;
        }

        // Basic profile update
        try {
            await axios.put('/api/user/profile-update', profileData, { withCredentials: true });
            toast.success("Profile updated!");
            setIsEditingProfile(false);
            fetchProfile();
        } catch (err) {
            toast.error("Failed to update profile");
        }
    };

    const handleVerifyOtp = async () => {
        setIsVerifying(true);
        try {
            const rawContact = (verificationStep === 'email') ? profileData.email 
                           : (verificationStep === 'phone') ? profileData.phone 
                           : user.email || user.phone;
            
            const contact = rawContact.trim().toLowerCase();
            const cleanOtp = otp.trim();

            await axios.post('/api/user/verify-confirm', { contact, otp: cleanOtp }, { withCredentials: true });
            
            if (verificationStep === 'password') {
                await axios.put('/api/user/change-password', { newPassword: passwordData.newPassword, contact, otp: cleanOtp }, { withCredentials: true });
                toast.success("Password changed successfully");
                setIsChangingPassword(false);
                setPasswordData({ newPassword: '', confirmPassword: '' });
            } else {
                await axios.put('/api/user/profile-update', profileData, { withCredentials: true });
                toast.success("Profile details updated and verified");
                setIsEditingProfile(false);
            }
            
            setVerificationStep(null);
            setOtp('');
            fetchProfile();
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid or expired verification code");
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePasswordRequest = async () => {
        if (!passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error("Passwords do not match");
        }
        if (passwordData.newPassword.length < 8) {
            return toast.error("Security requirement: 8+ characters");
        }

        try {
            const contact = user.email || user.phone;
            const type = user.email ? 'email' : 'phone';
            const res = await axios.post('/api/user/verify-request', { contact, type }, { withCredentials: true });
            toast.info(`Authorized user check: Verification code sent to ${contact}`);
            setVerificationStep('password');
        } catch (err) {
            toast.error("Security challenge failed. Please contact support.");
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
            <Loader2 className="spinner" size={48} color="var(--primary)" />
            <p style={{ marginTop: '20px', color: 'var(--primary-dark)', fontWeight: 600 }}>Syncing profile data...</p>
        </div>
    );

    return (
        <div style={{ padding: '100px 5% 60px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* Profile Banner */}
                <div style={{ 
                    background: 'white', border: '1px solid var(--border-color)', borderRadius: '32px', 
                    padding: '40px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '40px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ 
                            width: '140px', height: '140px', borderRadius: '48px', 
                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                            boxShadow: '0 15px 35px rgba(22, 101, 52, 0.25)'
                        }}>
                            <User size={70} />
                        </div>
                        <div style={{ 
                            position: 'absolute', bottom: '-5px', right: '-5px', 
                            background: '#16A34A', color: 'white', padding: '6px 12px', 
                            borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800,
                            border: '4px solid white', display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <ShieldCheck size={14} /> ACTIVE
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '8px', letterSpacing: '-0.02em' }}>{user.name}</h1>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Briefcase size={14} /> {user.role?.toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShieldCheck size={14} /> VERIFIED ACCOUNT
                                    </span>
                                </div>
                            </div>
                            {!isEditingProfile && (
                                <button onClick={() => setIsEditingProfile(true)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 101, 52, 0.2)' }}>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Verification Overlay */}
                {verificationStep && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
                        <div style={{ background: 'white', padding: '50px', borderRadius: '40px', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ background: '#EFF6FF', width: '80px', height: '80px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#2563EB' }}>
                                <Shield size={40} />
                            </div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>Secure Authorization</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.5, marginBottom: '32px' }}>
                                For your security, a verification code was sent to the provided contact via server logs. Enter it to authorize this action.
                            </p>
                            
                            <input 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                maxLength={6}
                                placeholder="******"
                                style={{ width: '100%', padding: '20px', borderRadius: '20px', border: '2px solid #E2E8F0', textAlign: 'center', fontSize: '2rem', fontWeight: 900, letterSpacing: '10px', marginBottom: '32px', color: 'var(--primary-dark)' }}
                            />
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button onClick={() => setVerificationStep(null)} style={{ flex: 1, padding: '18px', borderRadius: '18px', border: 'none', background: '#F1F5F9', fontWeight: 800, cursor: 'pointer', color: '#64748B' }}>Deny</button>
                                <button onClick={handleVerifyOtp} disabled={otp.length < 6 || isVerifying} style={{ flex: 1, padding: '18px', borderRadius: '18px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: isVerifying ? 0.7 : 1 }}>
                                    {isVerifying ? 'Verifying...' : 'Authorize'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px' }}>
                    
                    {/* Left Column: Editable Data */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="glass-panel" style={{ padding: '40px', borderRadius: '32px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={22} color="var(--primary)" /> Profile Information
                            </h3>

                            <form onSubmit={handleProfileSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Full Name</label>
                                    <input 
                                        value={profileData.name} 
                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                        disabled={!isEditingProfile}
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', background: isEditingProfile ? 'white' : '#F8FAFC', fontSize: '1rem', fontWeight: 600, transition: '0.2s' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Email</label>
                                    <input 
                                        value={profileData.email} 
                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                        disabled={!isEditingProfile}
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', background: isEditingProfile ? 'white' : '#F8FAFC', fontSize: '1rem', fontWeight: 600 }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Mobile Number</label>
                                    <input 
                                        value={profileData.phone} 
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                        disabled={!isEditingProfile}
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', background: isEditingProfile ? 'white' : '#F8FAFC', fontSize: '1rem', fontWeight: 600 }}
                                    />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Primary Address</label>
                                    <textarea 
                                        value={profileData.address} 
                                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                        disabled={!isEditingProfile}
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0', background: isEditingProfile ? 'white' : '#F8FAFC', fontSize: '1rem', fontWeight: 600, minHeight: '100px', resize: 'none' }}
                                    />
                                </div>

                                {isEditingProfile && (
                                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                                        <button type="submit" style={{ flex: 1, padding: '18px', borderRadius: '18px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(22, 101, 52, 0.2)' }}>
                                            <Save size={20} /> Deploy Updates
                                        </button>
                                        <button onClick={() => setIsEditingProfile(false)} type="button" style={{ flex: 1, padding: '18px', borderRadius: '18px', border: 'none', background: '#F1F5F9', color: '#64748B', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Security & Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* Status Check UI */}
                        <div className="glass-panel" style={{ padding: '30px', borderRadius: '28px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '24px' }}>System Status</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        <Mail size={16} /> Email Verified
                                    </div>
                                    {user.isVerified ? <CheckCircle2 size={18} color="#16A34A" /> : <XCircle size={18} color="#EF4444" />}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        <Phone size={16} /> Mobile Verified
                                    </div>
                                    {user.isMobileVerified ? <CheckCircle2 size={18} color="#16A34A" /> : <XCircle size={18} color="#EF4444" />}
                                </div>
                                <div style={{ height: '1px', background: '#F1F5F9', margin: '8px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        <MapPin size={16} /> Region Access
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>Authorized</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Action UI */}
                        <div className="glass-panel" style={{ padding: '30px', borderRadius: '28px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldAlert size={18} color="#EF4444" /> Security Actions
                            </h4>
                            
                            {!isChangingPassword ? (
                                <button onClick={() => setIsChangingPassword(true)} style={{ width: '100%', padding: '14px', borderRadius: '14px', background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <Key size={16} /> Initiate Password Reset
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <input 
                                        type="password"
                                        placeholder="New Password"
                                        value={passwordData.newPassword} 
                                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                                    />
                                    <input 
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={passwordData.confirmPassword} 
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                                    />
                                    <button onClick={handlePasswordRequest} style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>Generate OTP</button>
                                    <button onClick={() => setIsChangingPassword(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Back to safety</button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
