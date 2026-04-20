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
  Clock,
  Filter,
  Star
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Admin.css';

const AdminDeliveries = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [agents, setAgents] = useState([]);
  const [unassigned, setUnassigned] = useState({ pickups: [], deliveries: [] });
  const [assignments, setAssignments] = useState([]);
  const [hubs, setHubs] = useState([]);

  // Filter States
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedAsng, setSelectedAsng] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [agentsSearch, setAgentsSearch] = useState('');
  const [agentsHubFilter, setAgentsHubFilter] = useState('all');

  const [assignSearch, setAssignSearch] = useState('');
  const [assignTypeFilter, setAssignTypeFilter] = useState('all');

  const [asngSearch, setAsngSearch] = useState('');
  const [asngTypeFilter, setAsngTypeFilter] = useState('all');
  const [asngStatusFilter, setAsngStatusFilter] = useState('all');

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

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [agentsRes, unassignedRes, assignmentsRes, hubsRes] = await Promise.all([
        axios.get('/api/admin/delivery/agents', { withCredentials: true }),
        axios.get('/api/admin/delivery/unassigned', { withCredentials: true }),
        axios.get('/api/admin/delivery/assignments', { withCredentials: true }),
        axios.get('/api/admin/hubs', { withCredentials: true })
      ]);
      
      setAgents(agentsRes.data);
      setUnassigned(unassignedRes.data);
      setAssignments(assignmentsRes.data);
      setHubs(hubsRes.data);
    } catch (err) {
      if (!isSilent) toast.error('Failed to load delivery data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        fetchData(true); 
    }, 30000);
    return () => clearInterval(interval);
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
      fetchData(true);
    } catch (err) {
      toast.error('Failed to delete agent');
    }
  };

  const assignOrder = async (orderId, agentId, type, isStocking = false) => {
    try {
      await axios.post('/api/admin/delivery/assign', { orderId, agentId, type, isStocking }, { withCredentials: true });
      toast.success(`${type} assigned successfully`);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleRateAssignment = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
        await axios.post(`/api/delivery/assignments/${selectedAsng._id}/rate`, { rating, feedback }, { withCredentials: true });
        toast.success('Rating submitted!');
        setShowRatingModal(false);
        fetchData(true);
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
        setSubmittingRating(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading Delivery Management...</div>;

  const filteredAgents = agents.filter(agent => {
    const _s = agentsSearch.toLowerCase();
    const matchSearch = !_s || agent.name?.toLowerCase().includes(_s) || agent.phone?.includes(_s) || agent.vehicleNumber?.toLowerCase().includes(_s);
    const matchHub = agentsHubFilter === 'all' || (agentsHubFilter === 'unassigned' && !agent.assignedHub) || (agent.assignedHub && (agent.assignedHub._id === agentsHubFilter || agent.assignedHub === agentsHubFilter));
    return matchSearch && matchHub;
  });

  const filteredPickups = unassigned.pickups.filter(o => {
    const _s = assignSearch.toLowerCase();
    const matchType = assignTypeFilter === 'all' || assignTypeFilter === 'pickup';
    const matchSearch = !_s || o._id?.toLowerCase().includes(_s) || o.items?.some(i => i.farmer?.name?.toLowerCase().includes(_s));
    return matchType && matchSearch;
  });

  const filteredDeliveries = unassigned.deliveries.filter(o => {
    const _s = assignSearch.toLowerCase();
    const matchType = assignTypeFilter === 'all' || assignTypeFilter === 'delivery';
    const matchSearch = !_s || o._id?.toLowerCase().includes(_s) || o.buyer?.name?.toLowerCase().includes(_s);
    return matchType && matchSearch;
  });

  return (
    <div className="admin-deliveries" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Delivery Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={async () => {
                    if(!window.confirm("Recalculate all delivery revenues based on GPS distance? This will update all agent balances.")) return;
                    try {
                        const res = await axios.post('/api/admin/delivery/backfill-revenue', {}, { withCredentials: true });
                        toast.success(res.data.message);
                        fetchData();
                    } catch(err) { toast.error("Backfill failed"); }
                }}
                style={{ background: '#f8fafc', color: '#64748b', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
                Recalculate Revenues
            </button>
            {activeTab === 'agents' && (
            <button 
                onClick={() => { 
                    setEditingAgent(null); 
                    setAgentForm({ name: '', email: '', phone: '', password: '', vehicleType: '', vehicleNumber: '', assignedHub: '' }); 
                    resetVerification();
                    setShowAgentModal(true); 
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
                <Plus size={20} /> Add Agent
            </button>
            )}
        </div>
      </div>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Monitor agents and track active delivery assignments.</p>

      {/* Tabs */}
      <div className="admin-tab-group">
        {[
          { id: 'agents', label: 'Delivery Agents', icon: <Users size={18} /> },
          { id: 'assign', label: 'New Assignments', icon: <Plus size={18} /> },
          { id: 'assigned', label: 'Assigned Orders', icon: <Package size={18} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'white', padding: '15px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                <Search size={18} color="#64748b" />
                <input type="text" placeholder="Search agents..." value={agentsSearch} onChange={(e) => setAgentsSearch(e.target.value)} style={{ padding: '10px', border: 'none', outline: 'none', flex: 1 }} />
                <select value={agentsHubFilter} onChange={(e) => setAgentsHubFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
                    <option value="all">All Hubs</option>
                    <option value="unassigned">Unassigned</option>
                    {hubs.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredAgents.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: 'white', borderRadius: '24px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <Users size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
                    <p style={{ fontWeight: 600 }}>No delivery agents found matching your search.</p>
                </div>
            ) : filteredAgents.map(agent => (
                // ... agent card code ...
                <div key={agent._id} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <Truck size={24} />
                                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: agent.isOnline ? '#10b981' : '#94a3b8', border: '2px solid white' }}></div>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>{agent.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{agent.assignedHub?.name || 'No Hub'}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                        <Star size={10} fill="#f59e0b" color="#f59e0b" />
                                        <span style={{ fontWeight: 800, color: '#d97706' }}>{agent.deliveryRating?.toFixed(1) || '0.0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => { setEditingAgent(agent); setAgentForm({...agent, password: '', assignedHub: agent.assignedHub?._id || agent.assignedHub || ''}); setEmailVerified(true); setMobileVerified(true); setShowAgentModal(true); }} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#3b82f6', cursor: 'pointer' }}><Edit size={16}/></button>
                            <button onClick={() => deleteAgent(agent._id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>ACTIVE</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 700 }}>{agent.activeAssignments || 0}</p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>REVENUE</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#10b981' }}>₹{Number(agent?.revenue || 0).toLocaleString()}</p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>STATUS</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 700, color: agent.isOnline ? '#10b981' : '#64748b', fontSize: '0.75rem' }}>{agent.isOnline ? 'ONLINE' : 'OFFLINE'}</p>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </>
      )}

      {/* Assign Tab */}
      {activeTab === 'assign' && (
        <div style={{ display: 'grid', gap: '30px' }}>
            <div style={{ background: 'white', padding: '15px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                <Search size={18} color="#64748b" />
                <input type="text" placeholder="Search orders..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1 }} />
                <select value={assignTypeFilter} onChange={(e) => setAssignTypeFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
                    <option value="all">All Types</option>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                </select>
            </div>
            
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '15px 20px' }}>Order/Type</th>
                            <th style={{ padding: '15px 20px' }}>Address</th>
                            <th style={{ padding: '15px 20px' }}>Items</th>
                            <th style={{ padding: '15px 20px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...filteredPickups, ...filteredDeliveries].length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                                    <div style={{ opacity: 0.2, marginBottom: '15px' }}><Package size={48} /></div>
                                    <p style={{ fontWeight: 600 }}>No new orders pending assignment at the moment.</p>
                                </td>
                            </tr>
                        ) : [...filteredPickups, ...filteredDeliveries].map(order => {
                            const isPickup = !!order.items?.[0]?.farmer;
                            return (
                                <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px' }}>
                                        <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                                        <div><span style={{ fontSize: '0.7rem', fontWeight: 800, color: isPickup ? '#f59e0b' : '#3b82f6' }}>{isPickup ? 'PICKUP' : 'DELIVERY'}</span></div>
                                    </td>
                                    <td style={{ padding: '20px', fontSize: '0.85rem' }}>
                                        <strong>{isPickup ? (order.items[0]?.farmer?.name || 'Farmer') : (order.buyer?.name || 'Customer')}</strong>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>📞 {isPickup ? (order.items[0]?.farmer?.phone || 'N/A') : (order.buyer?.phone || 'N/A')}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>📍 {isPickup ? order.items[0]?.farmer?.address : order.deliveryAddress}</div>
                                    </td>
                                    <td style={{ padding: '20px' }}>{order.items?.map((it, idx) => <span key={idx} style={{ fontSize: '0.8rem' }}>{it.product?.productName} ({it.quantity}kg){idx < order.items.length - 1 ? ', ' : ''}</span>)}</td>
                                    <td style={{ padding: '20px' }}>
                                        {order.assignment ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CheckCircle size={14} />
                                                </div>
                                                Agent Assigned: {order.assignment.agent?.name || 'Assigned'}
                                            </div>
                                        ) : (
                                            <select 
                                                onChange={(e) => assignOrder(order._id, e.target.value, isPickup ? 'Pickup' : 'Delivery', !!order.isStocking)} 
                                                defaultValue="" 
                                                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="" disabled>Assign Agent</option>
                                                {agents.filter(a => a.isOnline).map(a => (
                                                    <option key={a._id} value={a._id}>{a.name} ({a.activeAssignments || 0})</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Assigned Orders Tab */}
      {activeTab === 'assigned' && (
        <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', background: 'white', padding: '15px 20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                <Search size={18} color="#64748b" />
                <input type="text" placeholder="Search assigned orders..." value={asngSearch} onChange={(e) => setAsngSearch(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1 }} />
                <select value={asngStatusFilter} onChange={(e) => setAsngStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}>
                    <option value="all">All Statuses</option>
                    <option value="assigned">Assigned</option>
                    <option value="picked up">Picked Up</option>
                    <option value="delivered">Delivered</option>
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {(() => {
                const filteredAssignments = assignments.filter(asng => {
                    const _s = asngSearch.toLowerCase();
                    const matchSearch = !_s || asng.order?._id?.toLowerCase().includes(_s) || asng.agent?.name?.toLowerCase().includes(_s) || asng.product?.productName?.toLowerCase().includes(_s);
                    const matchStatus = asngStatusFilter === 'all' || asng.status?.toLowerCase() === asngStatusFilter;
                    return matchSearch && matchStatus;
                });

                if (filteredAssignments.length === 0) {
                    return (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#64748b' }}>
                            <div style={{ opacity: 0.1, marginBottom: '15px' }}><Clock size={64} /></div>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No Assigned Orders Found</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Active and completed assignments will appear here.</p>
                        </div>
                    );
                }

                return filteredAssignments.map(asng => {
                const isPickup = asng.type === 'Pickup';
                const items = asng.order ? (asng.order.items || []) : (asng.product ? [{ product: asng.product, quantity: asng.product.quantityAvailable }] : []);
                const mainName = isPickup 
                    ? (asng.order ? asng.order.items?.[0]?.farmer?.name : asng.product?.farmer?.name) 
                    : asng.order?.buyer?.name;
                const totalQty = asng.order 
                    ? (asng.order.items || []).reduce((h,i)=>h + (i.quantity || 0), 0) 
                    : (asng.product ? asng.product.quantityAvailable : 0);
                
                const mainPhone = isPickup 
                    ? (asng.order ? asng.order.items?.[0]?.farmer?.phone : asng.product?.farmer?.phone) 
                    : asng.order?.buyer?.phone;
                const mainAddress = isPickup 
                    ? (asng.order ? asng.order.items?.[0]?.farmer?.address : asng.product?.farmer?.address) 
                    : asng.order?.deliveryAddress;
                
                return (
                    <div key={asng._id} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                        {/* Type Flag */}
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '6px 16px', background: isPickup ? '#fff7ed' : '#eff6ff', color: isPickup ? '#f59e0b' : '#3b82f6', borderBottomLeftRadius: '15px', fontSize: '0.75rem', fontWeight: 800 }}>
                            {asng.type.toUpperCase()}
                        </div>

                        {/* Top Header */}
                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Assigned To Agent</span>
                            <h3 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{asng.agent?.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>#{asng._id.slice(-8).toUpperCase()} · {new Date(asng.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>

                        {/* Product List */}
                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '15px', marginBottom: '20px' }}>
                            <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, marginBottom: '10px', textTransform: 'uppercase' }}>Shipment Contents</p>
                            {items.map((it, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx === items.length-1 ? 0 : '8px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{it.product?.productName || 'Produce'}</span>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{it.quantity} {it.product?.unit || 'kg'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Middle Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>STATUS</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, color: asng.status === 'Delivered' ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>{asng.status}</p>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>WEIGHT</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.75rem' }}>{totalQty} kg</p>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>DISTANCE</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.75rem' }}>{asng.distance || 0} km</p>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>EARNING</p>
                                <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#6366f1', fontSize: '0.75rem' }}>₹{asng.earnings || 0}</p>
                            </div>
                        </div>

                        {/* Details Footer */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>{isPickup ? 'PICKUP FROM FARMER' : 'DELIVERY TO CUSTOMER'}</p>
                            <p style={{ margin: '4px 0 0', fontWeight: 700 }}>{mainName || 'N/A'}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>📞 {mainPhone || 'No contact'}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineBreak: 'anywhere' }}>📍 {mainAddress || 'No address provided'}</p>
                            </div>
                            {asng.status === 'Delivered' && (
                                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                                        <Clock size={12} style={{ marginRight: '4px' }} /> Delivered at {new Date(asng.completedAt || asng.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                    {!asng.rating ? (
                                        <button 
                                            onClick={() => { setSelectedAsng(asng); setRating(5); setFeedback(''); setShowRatingModal(true); }}
                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Rate Agent
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '4px 8px', borderRadius: '6px' }}>
                                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#d97706' }}>{asng.rating}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            });
        })()}
            </div>
        </div>
      )}

      {/* Agent Modal */}
      {showAgentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '30px' }}>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
            <form onSubmit={handleAgentSubmit} style={{ display: 'grid', gap: '15px' }}>
                <input placeholder="Name" value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} required />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input placeholder="Email" type="email" value={agentForm.email} onChange={e => setAgentForm({...agentForm, email: e.target.value})} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} required disabled={emailVerified && !editingAgent} />
                    {!emailVerified && !editingAgent && <button type="button" onClick={sendEmailOtp} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', padding: '0 15px' }}>{emailOtpSent ? 'Sent' : 'OTP'}</button>}
                </div>
                {emailOtpSent && !emailVerified && !editingAgent && <div style={{ display: 'flex', gap: '8px' }}><input placeholder="OTP" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} /><button type="button" onClick={verifyEmailOtp} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', padding: '0 15px' }}>Verify</button></div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input placeholder="Phone" value={agentForm.phone} onChange={e => setAgentForm({...agentForm, phone: e.target.value})} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} required disabled={mobileVerified && !editingAgent} />
                    {!mobileVerified && !editingAgent && <button type="button" onClick={sendMobileOtp} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', padding: '0 15px' }}>{mobileOtpSent ? 'Sent' : 'OTP'}</button>}
                </div>
                {mobileOtpSent && !mobileVerified && !editingAgent && <div style={{ display: 'flex', gap: '8px' }}><input placeholder="OTP" value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} /><button type="button" onClick={verifyMobileOtp} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', padding: '0 15px' }}>Verify</button></div>}
                <input placeholder="Password" type="password" value={agentForm.password} onChange={e => setAgentForm({...agentForm, password: e.target.value})} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} required={!editingAgent} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input placeholder="Vehicle Type" value={agentForm.vehicleType} onChange={e => setAgentForm({...agentForm, vehicleType: e.target.value})} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                    <input placeholder="Vehicle No" value={agentForm.vehicleNumber} onChange={e => setAgentForm({...agentForm, vehicleNumber: e.target.value})} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                </div>
                <select value={agentForm.assignedHub} onChange={e => setAgentForm({...agentForm, assignedHub: e.target.value})} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <option value="">Select Hub</option>
                    {hubs.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" disabled={!editingAgent && (!emailVerified || !mobileVerified)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: (!editingAgent && (!emailVerified || !mobileVerified)) ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', fontWeight: 700 }}>{editingAgent ? 'Save' : 'Create'}</button>
                    <button type="button" onClick={() => setShowAgentModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: 600 }}>Cancel</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ width: '60px', height: '60px', background: '#fef3c7', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                    <Star size={30} color="#f59e0b" fill="#f59e0b" />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Rate Delivery Agent</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>How was the pickup performance of {selectedAsng?.agent?.name}?</p>
            </div>

            <form onSubmit={handleRateAssignment}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
                    {[1,2,3,4,5].map(star => (
                        <Star 
                            key={star} 
                            size={32} 
                            onClick={() => setRating(star)}
                            style={{ cursor: 'pointer', transition: '0.2s transform' }}
                            fill={star <= rating ? '#f59e0b' : 'none'}
                            color={star <= rating ? '#f59e0b' : '#cbd5e1'}
                        />
                    ))}
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Feedback (Optional)</label>
                    <textarea 
                        value={feedback} 
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Write a brief note about the service..."
                        style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', minHeight: '100px', outline: 'none', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" disabled={submittingRating} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                        {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </button>
                    <button type="button" onClick={() => setShowRatingModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveries;
