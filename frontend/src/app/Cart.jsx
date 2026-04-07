import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../assets/styles/Cart.css';

// Import images
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

const Cart = () => {
    const { cart, loading, updateQuantity, removeFromCart } = useCart();
    const navigate = useNavigate();

    const weightOptions = [
        { label: '250 g', value: 0.25 },
        { label: '500 g', value: 0.5 },
        { label: '750 g', value: 0.75 },
        { label: '1 kg', value: 1 },
        { label: '1.25 kg', value: 1.25 },
        { label: '1.5 kg', value: 1.5 },
        { label: '1.75 kg', value: 1.75 },
        { label: '2 kg', value: 2 },
        { label: '2.5 kg', value: 2.5 },
        { label: '3 kg', value: 3 },
        { label: '4 kg', value: 4 },
        { label: '5 kg', value: 5 },
    ];

    const handleQuantityChange = async (productId, newQuantity) => {
        if (newQuantity < 0.1) return;
        updateQuantity(productId, newQuantity);
    };

    const handleRemove = async (productId) => {
        removeFromCart(productId);
    };

    const calculateSubtotal = () => {
        if (!cart || !cart.items) return 0;
        return cart.items.reduce((total, item) => {
            return total + (item.product.pricePerKg * item.quantity);
        }, 0).toFixed(2);
    };

    const calculateTotalItems = () => {
        if (!cart || !cart.items) return 0;
        return cart.items.length;
    };

    if (loading) return <div className="cart-loading">Loading your cart...</div>;

    return (
        <div className="cart-container">
            <div className="cart-layout">
                <div className="cart-main">
                    <h1>Shopping Cart</h1>
                    {(!cart || cart.items.length === 0) ? (
                        <div className="empty-cart">
                            <p>Your Agrimart cart is empty.</p>
                            <Link to="/" className="shop-link">Continue shopping</Link>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cart.items.map((item) => (
                                <div key={item.product._id} className="cart-item">
                                    <div className="cart-item-image">
                                        <img 
                                            src={getProductImage(item.product.productName) || item.product.image || "/placeholder.png"} 
                                            alt={item.product.productName} 
                                        />
                                    </div>
                                    <div className="cart-item-details">
                                        <div className="item-header">
                                            <h3>{item.product.productName}</h3>
                                            <p className="item-price" style={{ fontWeight: 'bold' }}>
                                                ₹{(item.product.pricePerKg * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                        <p className="stock-info">In Stock</p>
                                        <p className="farmer-info">Sold by: <strong>{item.product.farmer?.name || "Verified Farmer"}</strong></p>
                                        
                                        <div className="item-actions">
                                            <div className="quantity-control">
                                                <label>Qty:</label>
                                                <select 
                                                    value={item.quantity} 
                                                    onChange={(e) => handleQuantityChange(item.product._id, parseFloat(e.target.value))}
                                                    style={{ cursor: 'pointer', border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }}
                                                >
                                                    {weightOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <span className="separator">|</span>
                                            <button onClick={() => handleRemove(item.product._id)} className="delete-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9534f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="cart-subtotal-row">
                                <p>Subtotal ({calculateTotalItems()} items): <strong>₹{calculateSubtotal()}</strong></p>
                            </div>
                        </div>
                    )}
                </div>

                {cart && cart.items.length > 0 && (
                    <div className="cart-sidebar">
                        <div className="checkout-card">
                            <div className="subtotal-info">
                                <p>Subtotal ({calculateTotalItems()} items): <strong>₹{calculateSubtotal()}</strong></p>
                            </div>
                            <button type="button" className="proceed-btn" onClick={() => navigate('/checkout')}>Proceed to Buy</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cart;

