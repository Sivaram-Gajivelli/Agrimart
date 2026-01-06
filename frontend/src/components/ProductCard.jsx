import React from "react";
import "../assets/styles/Products.css";

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      
      <h3>{product.name}</h3>
      <p className="price">₹{product.price} / {product.unit}</p>
      <p className="producer">{product.producer}</p>
      <p className="location">{product.location}</p>

      <button>Add to Cart</button>
    </div>
  );
};

export default ProductCard;
