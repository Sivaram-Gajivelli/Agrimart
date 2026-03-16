import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductById, addProductReview } from "../services/productService";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import "../assets/styles/ProductDetails.css";

// Import all images from the produce directory eagerly
const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });
const imageMap = {};
for (const path in produceImages) {
  const filename = path.split('/').pop().toLowerCase();
  const nameWithoutExt = filename.split('.')[0];
  imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const getProductImage = (productName) => {
  if (!productName || productName.trim() === '') return null;
  let normalized = productName.trim().toLowerCase().replace(/\s+/g, '-');
  if (imageMap[normalized]) return imageMap[normalized];
  if (normalized.endsWith('s') && imageMap[normalized.slice(0, -1)]) return imageMap[normalized.slice(0, -1)];
  if (imageMap[normalized + 's']) return imageMap[normalized + 's'];
  for (const key in imageMap) {
    if (normalized.length > 2 && key.length > 2) {
      if (normalized.includes(key) || key.includes(normalized)) return imageMap[key];
    }
  }
  return null;
};

// Helper to render stars
const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rating ? "star-filled" : "star-empty"}>
        {i <= rating ? "★" : "☆"}
      </span>
    );
  }
  return <div className="stars notranslate" translate="no">{stars}</div>;
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCartGlobal } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await getProductById(id);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addProductReview(id, { rating, comment });
      toast.success("Review submitted successfully");
      // Refresh product data
      const response = await getProductById(id);
      setProduct(response.data);
      setComment("");
      setRating(5);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    await addToCartGlobal(id, quantity);
  };

  if (loading) return <div className="loading">Loading product...</div>;
  if (!product) return <div className="not-found">Product not found</div>;

  // Calculate rating stats
  const ratingCounts = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1
  product.reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[5 - r.rating]++;
    }
  });
  const totalReviews = product.reviews.length || 1; // Avoid division by zero
  const ratingStats = ratingCounts.map(count => ({
    count,
    percentage: Math.round((count / totalReviews) * 100)
  }));

  return (
    <div className="product-details-container">
      <div className="product-details-main">
        <div className="product-image-section">
          <img src={getProductImage(product.productName) || "/placeholder-produce.jpg"} alt={product.productName} />
        </div>

        <div className="product-info-section">
          <h1>{product.productName}</h1>
          <div className="rating-summary-top">
            {renderStars(product.rating)}
            <span className="review-count">{product.numReviews} ratings</span>
          </div>
          <hr />
          <div className="price-tag">₹{product.pricePerKg} / {product.unit}</div>
          <div className="producer-info">
            Farmer: <strong>{product.farmer?.name || "Verified Farmer"}</strong>
            <br />
            Location: {product.manualLocation}
          </div>
          <div className="description-box">
            <h3>About this item</h3>
            <p>{product.description || "No description available for this fresh produce."}</p>
          </div>
          <div className="action-buttons">
            <div className="quantity-selector" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Quantity:</label>
              <select 
                className="qty-input" 
                value={quantity} 
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              >
                <option value={0.25}>250 g</option>
                <option value={0.5}>500 g</option>
                <option value={0.75}>750 g</option>
                <option value={1}>1 kg</option>
                <option value={1.25}>1.25 kg</option>
                <option value={1.5}>1.5 kg</option>
                <option value={1.75}>1.75 kg</option>
                <option value={2}>2 kg</option>
                <option value={2.5}>2.5 kg</option>
                <option value={3}>3 kg</option>
                <option value={4}>4 kg</option>
                <option value={5}>5 kg</option>
              </select>
              <div style={{ marginTop: '10px', fontWeight: '700', fontSize: '1.2rem', color: 'var(--primary-dark)' }}>
                Total: ₹{(product.pricePerKg * quantity).toFixed(2)}
              </div>
            </div>
            <button className="btn-add-cart" style={{ width: '100%', padding: '15px', borderRadius: '4px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 'bold' }} onClick={handleAddToCart}>
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <div className="reviews-layout">
        <div className="reviews-sidebar">
          <h2>Customer reviews</h2>
          <div className="overall-rating">
            {renderStars(product.rating)}
            <span>{product.rating.toFixed(1)} out of 5</span>
          </div>
          <div className="rating-histogram">
            {ratingStats.map((stat, index) => (
              <div key={index} className="histogram-row">
                <span className="star-label">{5 - index} star</span>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${stat.percentage}%` }}></div>
                </div>
                <span className="percentage-label">{stat.percentage}%</span>
              </div>
            ))}
          </div>
          <hr />
          <div className="submit-review-form">
            <h3>Review this product</h3>
            <p>Share your thoughts with other customers</p>
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Overall rating</label>
                <div className="star-rating-input notranslate" translate="no">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`star ${star <= rating ? "filled" : "empty"}`}
                      onClick={() => setRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Add a written review</label>
                <textarea 
                  rows="4" 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like or dislike?"
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>

        <div className="reviews-list-container">
          <h2>Top reviews</h2>
          <div className="reviews-list">
            {product.reviews.length === 0 ? (
              <p>No reviews yet. Be the first to review!</p>
            ) : (
              product.reviews.map((review, index) => (
                <div key={index} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-avatar">👤</div>
                    <div className="reviewer-name">{review.name}</div>
                  </div>
                  <div className="review-rating-row">
                    {renderStars(review.rating)}
                    <span className="review-date">Reviewed on {new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="review-comment">{review.comment}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
