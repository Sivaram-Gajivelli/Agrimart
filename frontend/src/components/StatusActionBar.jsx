import React from 'react';
import { CheckCircle, Clock, Package, Truck, ArrowRight, ShieldCheck, Ban } from 'lucide-react';

const PRODUCT_DELIVERY_FLOW = [
    'Listed',
    'Packed',
    'Ready for Pickup',
    'Picked Up',
    'At Hub',
    'Verified',
    'Completed'
];

const StatusActionBar = ({ currentStatus, onUpdate, isMini = false }) => {
    const getStatusIndex = (status) => {
        return PRODUCT_DELIVERY_FLOW.indexOf(status);
    };

    const currentIdx = getStatusIndex(currentStatus);

    const getStepStyle = (index, isRestricted) => {
        const isActive = index === currentIdx + 1;
        const isCompleted = index <= currentIdx;
        
        if (isActive) {
            return {
                // If restricted, we still show the yellow color (secondary) but with a restricted feel
                backgroundColor: isRestricted ? '#FEF3C7' : 'var(--secondary)', // Light yellow if restricted
                color: isRestricted ? '#D97706' : 'white', // Darker yellow/orange if restricted
                borderColor: isRestricted ? '#FCD34D' : 'var(--secondary)',
                boxShadow: (isMini && !isRestricted) ? '0 2px 6px rgba(245, 158, 11, 0.2)' : 'none',
                cursor: isRestricted ? 'not-allowed' : 'pointer',
                opacity: 1 // Keep opacity high to indicate it's the current state
            };
        }
        if (isCompleted) {
            return {
                backgroundColor: '#ecfdf5',
                color: '#059669',
                borderColor: '#10b981',
                cursor: 'default'
            };
        }
        return {
            backgroundColor: '#f8fafc',
            color: '#94a3b8',
            borderColor: '#e2e8f0',
            cursor: 'default'
        };
    };

    if (isMini) {
        return (
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {PRODUCT_DELIVERY_FLOW.map((step, idx) => {
                        const isCompleted = idx <= currentIdx;
                        const isActive = idx === currentIdx + 1;
                        const isRestricted = step === 'Picked Up' || step === 'At Hub' || step === 'Verified' || step === 'Completed';
                        
                        // Only show next 2 steps if not completed, or last 3 if far along
                        const shouldShow = (idx >= currentIdx && idx <= currentIdx + 1) || (idx === 0) || (idx === PRODUCT_DELIVERY_FLOW.length - 1);
                        
                        if (!shouldShow && !isCompleted && !isActive) return null;

                        return (
                            <React.Fragment key={step}>
                                <button
                                    onClick={() => isActive && !isRestricted && onUpdate(step)}
                                    disabled={!isActive || isRestricted}
                                    title={isRestricted ? "Restricted: Handled by Logistics Partners" : isActive ? `Mark as ${step}` : step}
                                    style={{
                                        whiteSpace: 'nowrap', padding: '4px 10px', borderRadius: '8px', 
                                        fontSize: '0.65rem', fontWeight: 800, border: '1px solid', 
                                        transition: '0.2s', ...getStepStyle(idx, isRestricted),
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    {isRestricted && isActive && <Ban size={10} />}
                                    {isCompleted ? `✓ ${step}` : step}
                                </button>
                                {idx < PRODUCT_DELIVERY_FLOW.length - 1 && idx === currentIdx && <ArrowRight size={10} color="#cbd5e1" />}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '16px', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} /> Product Delivery to Hub
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {PRODUCT_DELIVERY_FLOW.slice(0, 3).map((step, idx) => (
                        <React.Fragment key={step}>
                            <button
                                onClick={() => idx === currentIdx + 1 && onUpdate(step)}
                                disabled={idx !== currentIdx + 1}
                                style={{
                                    padding: '8px 16px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                    border: '1px solid', transition: 'all 0.2s',
                                    ...getStepStyle(idx)
                                }}
                            >
                                {idx <= currentIdx ? `✓ ${step}` : step}
                            </button>
                            {idx < 2 && <ArrowRight size={14} color="#cbd5e1" />}
                        </React.Fragment>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {PRODUCT_DELIVERY_FLOW.slice(3).map((step, idx) => {
                        const actualIdx = idx + 3;
                        const isCompleted = actualIdx <= currentIdx;
                        const isNext = actualIdx === currentIdx + 1;
                        
                        return (
                            <div key={step} style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                                borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                                background: isCompleted ? '#ecfdf5' : isNext ? '#eff6ff' : '#f1f5f9',
                                color: isCompleted ? '#059669' : isNext ? '#1e40af' : '#94a3b8',
                                border: `1px solid ${isCompleted ? '#d1fae5' : isNext ? '#dbeafe' : '#e2e8f0'}`
                            }}>
                                {isCompleted ? <CheckCircle size={12} /> : isNext ? <Clock size={12} /> : <Package size={12} />}
                                {step}
                            </div>
                        );
                    })}
                </div>
            </div>

            {currentStatus === 'Completed' && (
                <div style={{ marginTop: '16px', padding: '10px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '0.75rem' }}>
                    <CheckCircle size={16} /> Delivery to Hub Completed successfully.
                </div>
            )}
        </div>
    );
};

export default StatusActionBar;
