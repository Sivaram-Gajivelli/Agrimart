import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Save, Loader } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        deliveryPricePerKm: 0,
        minDeliveryFee: 0,
        commissionPercentage: 0,
        hubRadius: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/admin/settings', { withCredentials: true });
                setSettings(res.data);
            } catch (err) {
                toast.error('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put('/api/admin/settings', settings, { withCredentials: true });
            toast.success('Settings updated successfully');
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="admin-loading">Loading...</div>;

    return (
        <div className="admin-users-container">
            <h1 className="admin-page-title">Platform Settings</h1>
            <div className="table-wrapper" style={{ padding: '30px' }}>
                <form onSubmit={handleSave} className="admin-login-form" style={{ maxWidth: '600px', margin: '0' }}>
                    <div className="input-group">
                        <label>Delivery Price per Km (₹)</label>
                        <input type="number" name="deliveryPricePerKm" value={settings.deliveryPricePerKm} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Minimum Delivery Fee (₹)</label>
                        <input type="number" name="minDeliveryFee" value={settings.minDeliveryFee} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Commission Percentage (%)</label>
                        <input type="number" name="commissionPercentage" value={settings.commissionPercentage} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Hub Radius (Km)</label>
                        <input type="number" name="hubRadius" value={settings.hubRadius} onChange={handleChange} />
                    </div>
                    <button type="submit" className="admin-login-btn" disabled={saving}>
                        {saving ? <Loader className="animate-spin" /> : <><Save size={18} /> Save Settings</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminSettings;

