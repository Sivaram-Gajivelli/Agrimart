import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "../context/CartContext";
import "../assets/styles/Products.css";

const ProductCard = ({ product }) => {
  const { addToCartGlobal } = useCart();
  const [selectedWeight, setSelectedWeight] = useState(1); // Default to 1kg

  const weights = [
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

  const handleAddToCart = async (e) => {
    e.preventDefault();
    console.log("Adding to cart from card:", product._id, selectedWeight);
    await addToCartGlobal(product._id, selectedWeight);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(rating) ? "star-filled" : "star-empty"}>
          {i <= Math.round(rating) ? "★" : "☆"}
        </span>
      );
    }
    return <div className="stars-small notranslate" translate="no">{stars} <span className="rating-num">({product.numReviews || 0})</span></div>;
  };

  return (
    <div className="product-card">
      <Link to={`/product/${product._id}`} className="product-link" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <img src={product.image} alt={product.name} />
        <div className="product-info" style={{ flexGrow: 1 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={product.name}>{product.name}</h3>
          {renderStars(product.rating || 0)}
          <p className="price" style={{ margin: '8px 0', color: 'var(--primary-dark)', fontWeight: 'bold' }}>₹{(product.price * selectedWeight).toFixed(2)}</p>
          
          <div style={{ margin: '10px 0' }} onClick={(e) => e.preventDefault()}>
            <select 
              value={selectedWeight} 
              onChange={(e) => setSelectedWeight(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {weights.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <p className="producer" style={{ fontSize: '0.85rem', margin: '0 0 4px 0' }}>Farmer: {product.producer}</p>
            <p 
              className="location" 
              title={product.location} 
              style={{ 
                fontSize: '0.85rem', 
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#64748b'
              }}
            >
              {product.location}
            </p>
          </div>
        </div>
      </Link>
      <div className="card-actions">
        <button className="add-btn" onClick={handleAddToCart} style={{ width: '100%', padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: '4px', fontWeight: 'bold', color: 'white', cursor: 'pointer' }}>
          Add to cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
