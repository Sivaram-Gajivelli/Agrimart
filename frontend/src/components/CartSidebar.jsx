import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../assets/styles/CartSidebar.css';

const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });
const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const getProductImage = (productName) => {
    if (!productName || productName.trim() === '') return null;
    
    // Normalize: lowercase, trim, and replace spaces with both dash and underscore
    const name = productName.trim().toLowerCase();
    const withDash = name.replace(/\s+/g, '-');
    const withUnderscore = name.replace(/\s+/g, '_');
    
    // Check exact matches
    if (imageMap[withDash]) return imageMap[withDash];
    if (imageMap[withUnderscore]) return imageMap[withUnderscore];
    
    // Check plural/singular matches
    const checkPlural = (n) => {
        if (imageMap[n]) return imageMap[n];
        if (n.endsWith('s') && imageMap[n.slice(0, -1)]) return imageMap[n.slice(0, -1)];
        if (imageMap[n + 's']) return imageMap[n + 's'];
        return null;
    };
    
    let res = checkPlural(withDash) || checkPlural(withUnderscore);
    if (res) return res;

    // Substring matching as fallback
    for (const key in imageMap) {
        if (name.length > 2 && key.length > 2) {
            if (name.includes(key) || key.includes(name)) return imageMap[key];
        }
    }
    return null;
};

const CartSidebar = () => {
    const { cart, removeFromCart, updateQuantity } = useCart();
    const navigate = useNavigate();

    const weightOptions = [
        0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5
    ];

    const formatWeight = (val) => {
        return val < 1 ? `${val * 1000} g` : `${val} kg`;
    };

    const totalItems = cart?.items?.length || 0;
    const totalPrice = cart?.items?.reduce((sum, item) => sum + (item.product?.pricePerKg * item.quantity), 0) || 0;

    return (
        <div className="cart-sidebar-container">
            <div className="cart-sidebar-header">
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.4rem', margin: 0, fontWeight: '800', letterSpacing: '1px' }}>
                        Agrimart Cart
                    </h2>
                </div>
                
                <div className="cart-summary-mini">
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <span className="items-count" style={{ display: 'block', fontSize: '0.9rem' }}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                        <span className="cart-total" style={{ fontSize: '1.2rem', fontWeight: '700' }}>₹{totalPrice.toFixed(2)}</span>
                    </div>

                    <button 
                        className="view-cart-btn" 
                        onClick={() => navigate('/cart')}
                        style={{ 
                            width: '100%', 
                            padding: '10px', 
                            background: 'var(--primary)', 
                            border: 'none', 
                            borderRadius: '4px', 
                            fontWeight: 'bold', 
                            color: 'white',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        Go to Cart
                    </button>
                </div>
            </div>

            <div className="cart-sidebar-items" style={{ padding: '0 15px', overflowY: 'auto', flex: 1 }}>
                {cart?.items?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                        <p className="empty-msg" style={{ color: '#666' }}>Your cart is empty</p>
                    </div>
                ) : (
                    cart?.items?.map(item => (
                        <div key={item.product?._id} className="mini-cart-item" style={{ display: 'flex', gap: '12px', padding: '15px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <img 
                                src={getProductImage(item.product?.productName) || item.product?.image} 
                                alt="" 
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                            <div className="mini-item-info" style={{ flex: 1 }}>
                                <p className="mini-item-name" style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: '600', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.product?.productName}
                                </p>
                                <p className="mini-item-price" style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#B12704', fontWeight: 'bold' }}>
                                    ₹{(item.product?.pricePerKg * item.quantity).toFixed(2)}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <select 
                                        value={item.quantity} 
                                        style={{ 
                                            fontSize: '0.8rem', 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            color: '#334155',
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                        }}
                                        onChange={(e) => updateQuantity(item.product?._id, parseFloat(e.target.value))}
                                    >
                                        {weightOptions.map(w => (
                                            <option key={w} value={w}>{formatWeight(w)}</option>
                                        ))}
                                    </select>
                                    <button 
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#ef4444', 
                                            fontSize: '1rem', 
                                            cursor: 'pointer', 
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '5px'
                                        }}
                                        onClick={() => removeFromCart(item.product?._id)}
                                        title="Delete"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CartSidebar;
