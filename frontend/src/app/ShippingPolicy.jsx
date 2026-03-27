import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/styles/App.css';

const ShippingPolicy = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '120px auto 60px', padding: '0 20px', minHeight: '70vh' }}>
            <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px' }}>Shipping Cost Calculation</h1>
            
            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <h2 style={{ color: '#333', marginBottom: '15px' }}>Hub-and-Spoke Logistics Model</h2>
                <p style={{ lineHeight: '1.6', fontSize: '1.05rem', color: '#555', marginBottom: '20px' }}>
                    Agrimart utilizes an advanced Hub-and-Spoke logistics model to reduce delivery overhead and optimize shipping for our customers. Instead of completing expensive individual point-to-point dropoffs from the farmer directly to you, your order is routed through our centrally located regional hubs.
                </p>
                
                <h3 style={{ color: '#333', margin: '20px 0 10px' }}>Distance Slab Fee</h3>
                <p style={{ lineHeight: '1.6', color: '#555', marginBottom: '10px' }}>
                    Your delivery fee is calculated purely based on the driving distance between your delivery address and the <strong>nearest regional Agrimart Hub</strong>. The distance slabs are as follows:
                </p>
                <ul style={{ paddingLeft: '20px', color: '#555', marginBottom: '20px', lineHeight: '1.6' }}>
                    <li><strong>0 – 20 km</strong>: ₹20</li>
                    <li><strong>21 – 50 km</strong>: ₹30</li>
                    <li><strong>51 – 100 km</strong>: ₹50</li>
                    <li><strong>101 – 200 km</strong>: ₹70</li>
                    <li><strong>200+ km</strong>: ₹90</li>
                </ul>

                <h3 style={{ color: '#333', margin: '20px 0 10px' }}>Weight Transport Fee</h3>
                <p style={{ lineHeight: '1.6', color: '#555', marginBottom: '10px' }}>
                    Because moving heavy agricultural produce requires significant fuel and logistics support, a nominal variable weight fee is applied.
                </p>
                <div style={{ background: '#fff', borderLeft: '4px solid var(--primary)', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                    <code style={{ fontSize: '1rem' }}>Weight Fee = Total Cart Weight (kg) × (Hub Distance × ₹0.02)</code>
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 10px' }}>Final Cart Calculation</h3>
                <p style={{ lineHeight: '1.6', color: '#555' }}>
                    There are <strong>no base fees</strong>. Your entire cart's shipping and handling is determined as <code>Distance Slab Fee + Weight Transport Fee</code>. We handle all bulk transport costs between the farmer and the regional hub, meaning you only ever pay for the optimized last-mile delivery!
                </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
                <Link to="/checkout" style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Return to Checkout
                </Link>
            </div>
        </div>
    );
};

export default ShippingPolicy;
