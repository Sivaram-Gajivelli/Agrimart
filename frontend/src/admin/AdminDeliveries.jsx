import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Truck, 
  MapPin, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Package,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Admin.css';

const AdminDeliveries = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [agents, setAgents] = useState([]);
  const [unassigned, setUnassigned] = useState({ pickups: [], deliveries: [] });
  const [activeTracking, setActiveTracking] = useState([]);
  const [hubOrders, setHubOrders] = useState([]);
  const [hubs, setHubs] = useState([]);

  // Modal states
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState({
    name: '', email: '', phone: '', password: '', 
    vehicleType: '', vehicleNumber: '', assignedHub: ''
  });

  // Verification states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, unassignedRes, trackingRes, hubQCRes, hubsRes] = await Promise.all([
        axios.get('/api/admin/delivery/agents', { withCredentials: true }),
        axios.get('/api/admin/delivery/unassigned', { withCredentials: true }),
        axios.get('/api/admin/delivery/tracking', { withCredentials: true }),
        axios.get('/api/admin/delivery/hub-quality-check', { withCredentials: true }),
        axios.get('/api/admin/hubs', { withCredentials: true })
      ]);
      
      setAgents(agentsRes.data);
      setUnassigned(unassignedRes.data);
      setActiveTracking(trackingRes.data);
      setHubOrders(hubQCRes.data);
      setHubs(hubsRes.data);
    } catch (err) {
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const sendEmailOtp = async () => {
    if (!agentForm.email) return toast.error('Enter email first');
    try {
      await axios.post('/api/auth/send-email-verify', { 
        email: agentForm.email, 
        name: agentForm.name || 'Agent',
        role: 'delivery_partner'
      });
      setEmailOtpSent(true);
      toast.success('Email OTP sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email OTP');
    }
  };

  const verifyEmailOtp = async () => {
    try {
      await axios.post('/api/auth/verify-email-otp', { email: agentForm.email, otp: emailOtp });
      setEmailVerified(true);
      toast.success('Email verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email OTP');
    }
  };

  const sendMobileOtp = async () => {
    if (!agentForm.phone || agentForm.phone.length !== 10) return toast.error('Enter valid 10-digit phone');
    try {
      await axios.post('/api/auth/send-mobile-otp', { 
        phone: agentForm.phone,
        name: agentForm.name || 'Agent',
        role: 'delivery_partner'
      });
      setMobileOtpSent(true);
      toast.success('Mobile OTP sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send mobile OTP');
    }
  };

  const verifyMobileOtp = async () => {
    try {
      await axios.post('/api/auth/verify-mobile-otp', { phone: agentForm.phone, otp: mobileOtp });
      setMobileVerified(true);
      toast.success('Mobile verified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid mobile OTP');
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    if (!editingAgent && (!emailVerified || !mobileVerified)) {
      return toast.error('Please verify both email and mobile first');
    }
    try {
      if (editingAgent) {
        await axios.put(`/api/admin/delivery/agents/${editingAgent._id}`, agentForm, { withCredentials: true });
        toast.success('Agent updated');
      } else {
        await axios.post('/api/admin/delivery/agents', agentForm, { withCredentials: true });
        toast.success('Agent created');
      }
      setShowAgentModal(false);
      resetVerification();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const resetVerification = () => {
    setEmailVerified(false);
    setMobileVerified(false);
    setEmailOtpSent(false);
    setMobileOtpSent(false);
    setEmailOtp('');
    setMobileOtp('');
  };

  const deleteAgent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await axios.delete(`/api/admin/delivery/agents/${id}`, { withCredentials: true });
      toast.success('Agent deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete agent');
    }
  };

  const assignOrder = async (orderId, agentId, type) => {
    try {
      await axios.post('/api/admin/delivery/assign', { orderId, agentId, type }, { withCredentials: true });
      toast.success(`${type} assigned successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const updateQC = async (orderId, status) => {
    try {
      await axios.put(`/api/admin/delivery/hub-quality-check/${orderId}`, { trackingStatus: status }, { withCredentials: true });
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const renderTabs = () => (
    <div className="admin-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
      {[
        { id: 'agents', label: 'Delivery Agents', icon: <Users size={18} /> },
        { id: 'assign', label: 'Assign Orders', icon: <Plus size={18} /> },
        { id: 'track', label: 'Active Tracking', icon: <Truck size={18} /> },
        { id: 'qc', label: 'Hub Quality Check', icon: <CheckCircle size={18} /> }
      ].map(tab => (
        <button 
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: activeTab === tab.id ? '#10b981' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#64748b',
            fontWeight: 600, cursor: 'pointer', transition: '0.2s'
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );

  if (loading) return <div>Loading Delivery Management...</div>;

  return (
    <div className="admin-deliveries">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Logistics & Delivery</h1>
        {activeTab === 'agents' && (
          <button 
            onClick={() => { 
                setEditingAgent(null); 
                setAgentForm({ name: '', email: '', phone: '', password: '', vehicleType: '', vehicleNumber: '', assignedHub: '' }); 
                resetVerification();
                setShowAgentModal(true); 
            }}
            className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={20} /> Add Agent
          </button>
        )}
      </div>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>Manage the end-to-end flow of produce from farmer to hub to customer.</p>

      {renderTabs()}

      {/* AGENTS TAB */}
      {activeTab === 'agents' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {agents.length === 0 ? <p>No delivery agents found.</p> : agents.map(agent => (
            <div key={agent._id} style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', shadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{agent.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{agent.assignedHub?.name || 'Unassigned Hub'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => { 
                    setEditingAgent(agent); 
                    setAgentForm({
                      ...agent,
                      password: '', // Don't show hashed password, leave empty for optional update
                      assignedHub: agent.assignedHub?._id || agent.assignedHub || ''
                    }); 
                    resetVerification();
                    // Auto-verify existing for editing unless changed
                    setEmailVerified(true);
                    setMobileVerified(true);
                    setShowAgentModal(true); 
                  }} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#3b82f6', cursor: 'pointer' }}><Edit size={16}/></button>
                  <button onClick={() => deleteAgent(agent._id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '1.25rem' }}>{agent.activeAssignments || 0}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '1.25rem' }}>{agent.totalDeliveries || 0}</p>
                </div>
              </div>
              <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Vehicle:</strong> {agent.vehicleType || 'N/A'} ({agent.vehicleNumber || '-'})</p>
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem' }}><strong>Phone:</strong> {agent.phone || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGN TAB */}
      {activeTab === 'assign' && (
        <div style={{ display: 'grid', gap: '40px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Package size={20} color="#f59e0b" /> Ready for Pickup (Farmer ➔ Hub)</h2>
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '15px 20px' }}>Order ID</th>
                    <th style={{ padding: '15px 20px' }}>Farmer / Pickup Address</th>
                    <th style={{ padding: '15px 20px' }}>Items</th>
                    <th style={{ padding: '15px 20px' }}>Assign Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {unassigned.pickups.length === 0 ? <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No orders pending pickup assignment.</td></tr> : unassigned.pickups.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px' }}><strong>#{order._id.slice(-8).toUpperCase()}</strong></td>
                      <td style={{ padding: '20px' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{order.items[0]?.farmer?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{order.items[0]?.farmer?.address}</p>
                      </td>
                      <td style={{ padding: '20px' }}>
                        {order.items.map((i,idx) => <div key={idx} style={{ fontSize: '0.85rem' }}>{i.product?.productName} ({i.quantity}kg)</div>)}
                      </td>
                      <td style={{ padding: '20px' }}>
                        <select 
                          onChange={(e) => assignOrder(order._id, e.target.value, 'Pickup')}
                          defaultValue=""
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', outline: 'none' }}
                        >
                          <option value="" disabled>Select Agent</option>
                          {agents.map(a => <option key={a._id} value={a._id}>{a.name} ({a.activeAssignments} active)</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Truck size={20} color="#3b82f6" /> Ready for Delivery (Hub ➔ Customer)</h2>
            <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '15px 20px' }}>Order ID</th>
                    <th style={{ padding: '15px 20px' }}>Customer / Delivery Address</th>
                    <th style={{ padding: '15px 20px' }}>Items</th>
                    <th style={{ padding: '15px 20px' }}>Assign Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {unassigned.deliveries.length === 0 ? <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No orders pending delivery assignment.</td></tr> : unassigned.deliveries.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px' }}><strong>#{order._id.slice(-8).toUpperCase()}</strong></td>
                      <td style={{ padding: '20px' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{order.buyer?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{order.deliveryAddress}</p>
                      </td>
                      <td style={{ padding: '20px' }}>
                        {order.items.map((i,idx) => <div key={idx} style={{ fontSize: '0.85rem' }}>{i.product?.productName} ({i.quantity}kg)</div>)}
                      </td>
                      <td style={{ padding: '20px' }}>
                        <select 
                          onChange={(e) => assignOrder(order._id, e.target.value, 'Delivery')}
                          defaultValue=""
                          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', outline: 'none' }}
                        >
                          <option value="" disabled>Select Agent</option>
                          {agents.map(a => <option key={a._id} value={a._id}>{a.name} ({a.activeAssignments} active)</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING TAB */}
      {activeTab === 'track' && (
        <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                        <th style={{ padding: '15px 20px' }}>Order ID</th>
                        <th style={{ padding: '15px 20px' }}>Task Type</th>
                        <th style={{ padding: '15px 20px' }}>Assigned Agent</th>
                        <th style={{ padding: '15px 20px' }}>Current Status</th>
                        <th style={{ padding: '15px 20px' }}>Assigned At</th>
                    </tr>
                </thead>
                <tbody>
                    {activeTracking.length === 0 ? <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No active deliveries in progress.</td></tr> : activeTracking.map(asng => (
                        <tr key={asng._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '20px' }}><strong>#{asng.order?._id?.slice(-8).toUpperCase()}</strong></td>
                            <td style={{ padding: '20px' }}>
                                <span style={{ background: asng.type === 'Pickup' ? '#fff7ed' : '#eff6ff', color: asng.type === 'Pickup' ? '#f59e0b' : '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {asng.type.toUpperCase()}
                                </span>
                            </td>
                            <td style={{ padding: '20px' }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>{asng.agent?.name}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{asng.agent?.vehicleNumber}</p>
                            </td>
                            <td style={{ padding: '20px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: asng.status === 'Picked Up' ? '#3b82f6' : '#64748b', fontWeight: 600 }}>
                                    {asng.status === 'Picked Up' ? <Truck size={16}/> : <Clock size={16}/>} {asng.status}
                                </span>
                            </td>
                            <td style={{ padding: '20px', fontSize: '0.9rem', color: '#64748b' }}>{new Date(asng.assignedAt).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* QC TAB */}
      {activeTab === 'qc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
            {hubOrders.length === 0 ? <p>No orders pending check at hub.</p> : hubOrders.map(order => (
                <div key={order._id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b' }}>Order #{order._id.slice(-8).toUpperCase()}</span>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>{order.trackingStatus}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        {order.items.map((it, idx) => (
                            <div key={idx} style={{ textAlign: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#f8fafc', padding: '5px' }}>
                                    <img src={it.product?.image} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                                <p style={{ margin: '5px 0 0', fontSize: '0.7rem', fontWeight: 600 }}>{it.product?.productName}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {order.trackingStatus === 'Delivered to Hub' && (
                            <button onClick={() => updateQC(order._id, 'Quality Checked')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#ecfdf5', color: '#10b981', fontWeight: 700, cursor: 'pointer' }}>Pass Quality Check</button>
                        )}
                        {order.trackingStatus === 'Quality Checked' && (
                            <button onClick={() => updateQC(order._id, 'Hub Packed')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Pack for Customer</button>
                        )}
                         {order.trackingStatus === 'Hub Packed' && (
                            <button onClick={() => updateQC(order._id, 'Ready for Delivery')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Set Ready for Delivery</button>
                        )}
                        <button onClick={() => updateQC(order._id, 'Cancelled')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>Reject / Fail</button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* AGENT MODAL */}
      {showAgentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '30px' }}>{editingAgent ? 'Edit Agent' : 'Create New Delivery Agent'}</h2>
            <form onSubmit={handleAgentSubmit} style={{ display: 'grid', gap: '15px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Full Name *</label>
                <input placeholder="Enter full name" value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} required />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Email Address *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                        placeholder="agent@agrimart.com" 
                        type="email" 
                        value={agentForm.email} 
                        onChange={e => { setAgentForm({...agentForm, email: e.target.value}); setEmailVerified(false); }} 
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} 
                        required 
                        disabled={emailVerified && !editingAgent}
                    />
                    {!emailVerified && !editingAgent && (
                        <button type="button" onClick={sendEmailOtp} style={{ padding: '0 15px', borderRadius: '10px', border: 'none', background: '#6366f1', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            {emailOtpSent ? 'Resend' : 'Send OTP'}
                        </button>
                    )}
                    {emailVerified && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8rem' }}><CheckCircle size={16} style={{ marginRight: '4px' }}/> Verified</span>}
                </div>
                {emailOtpSent && !emailVerified && !editingAgent && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input placeholder="6-digit OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <button type="button" onClick={verifyEmailOtp} style={{ padding: '0 15px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Verify</button>
                    </div>
                )}
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Phone Number *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                        placeholder="10-digit mobile" 
                        value={agentForm.phone} 
                        onChange={e => { setAgentForm({...agentForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)}); setMobileVerified(false); }} 
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} 
                        required 
                        disabled={mobileVerified && !editingAgent}
                    />
                    {!mobileVerified && !editingAgent && (
                        <button type="button" onClick={sendMobileOtp} style={{ padding: '0 15px', borderRadius: '10px', border: 'none', background: '#6366f1', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            {mobileOtpSent ? 'Resend' : 'Send OTP'}
                        </button>
                    )}
                    {mobileVerified && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8rem' }}><CheckCircle size={16} style={{ marginRight: '4px' }}/> Verified</span>}
                </div>
                {mobileOtpSent && !mobileVerified && !editingAgent && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input placeholder="6-digit OTP" value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <button type="button" onClick={verifyMobileOtp} style={{ padding: '0 15px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Verify</button>
                    </div>
                )}
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  {editingAgent ? "Update Password (Optional)" : "Password *"}
                </label>
                <input 
                  placeholder={editingAgent ? "Leave blank to keep current" : "Set login password"} 
                  type="password" 
                  autoComplete="new-password"
                  value={agentForm.password} 
                  onChange={e => setAgentForm({...agentForm, password: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} 
                  required={!editingAgent} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Vehicle Type</label>
                  <input placeholder="e.g. Truck, Van" value={agentForm.vehicleType} onChange={e => setAgentForm({...agentForm, vehicleType: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Vehicle Number</label>
                  <input placeholder="e.g. AP16CC3001" value={agentForm.vehicleNumber} onChange={e => setAgentForm({...agentForm, vehicleNumber: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Assigned Hub</label>
                <select value={agentForm.assignedHub} onChange={e => setAgentForm({...agentForm, assignedHub: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <option value="">Select Primary Hub</option>
                  {hubs.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="submit" 
                  disabled={!editingAgent && (!emailVerified || !mobileVerified)}
                  style={{ 
                    flex: 1, padding: '12px', borderRadius: '12px', 
                    background: (!editingAgent && (!emailVerified || !mobileVerified)) ? '#cbd5e1' : '#10b981', 
                    color: 'white', border: 'none', fontWeight: 700, 
                    cursor: (!editingAgent && (!emailVerified || !mobileVerified)) ? 'not-allowed' : 'pointer' 
                  }}
                >
                    {editingAgent ? 'Save Changes' : 'Verify & Create'}
                </button>
                <button type="button" onClick={() => setShowAgentModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveries;
