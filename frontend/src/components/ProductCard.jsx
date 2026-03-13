import React from "react";
import { Link } from "react-router-dom";
import "../assets/styles/Products.css";

const ProductCard = ({ product }) => {
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(rating) ? "star-filled" : "star-empty"}>
          {i <= Math.round(rating) ? "★" : "☆"}
        </span>
      );
    }
    return <div className="stars-small">{stars} <span className="rating-num">({product.numReviews || 0})</span></div>;
  };

  return (
    <div className="product-card">
      <Link to={`/product/${product._id}`} className="product-link">
        <img src={product.image} alt={product.name} />
        <div className="product-info">
          <h3>{product.name}</h3>
          {renderStars(product.rating || 0)}
          <p className="price">₹{product.price} / {product.unit}</p>
          <p className="producer">Farmer: {product.producer}</p>
          <p className="location" title={product.location}>{product.location}</p>
        </div>
      </Link>
      <div className="card-actions">
        <button>Add to Cart</button>
      </div>
    </div>
  );
};

export default ProductCard;
