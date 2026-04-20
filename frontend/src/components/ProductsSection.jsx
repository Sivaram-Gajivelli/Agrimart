import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import "../assets/styles/Products.css";
import { getMarketplaceProducts } from "../services/productService";
import { useLocationContext } from "../context/LocationContext";

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

const ProductsSection = ({ activeFilter = 'All', onSeeAll }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { latitude: lat, longitude: lng } = useLocationContext();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getMarketplaceProducts({ lat, lng });
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching marketplace products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [lat, lng]);

  // Map display labels to DB categories
  const categoryMap = {
    'Fresh vegetables': 'Vegetables',
    'Fresh fruits': 'Fruits',
    'Grains & Pulses': 'Grains & Pulses'
  };

  const getDBValue = (label) => categoryMap[label] || label;

  // Group and filter products
  const categorizedProducts = products.reduce((acc, product) => {
    // Determine the display category
    let displayCategory = product.category;
    // Normalize if it's one of our known ones
    for (const [label, dbValue] of Object.entries(categoryMap)) {
      if (product.category === dbValue) {
        displayCategory = label;
        break;
      }
    }

    if (!acc[displayCategory]) acc[displayCategory] = [];
    acc[displayCategory].push(product);
    return acc;
  }, {});

  if (loading) {
    return <section className="products-section"><div className="loading">Loading products...</div></section>;
  }

  const effectiveFilter = (activeFilter === 'All' || activeFilter === 'All Products') ? 'All' : activeFilter;

  return (
    <section className="products-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>{effectiveFilter === 'All' ? 'Featured Products' : activeFilter}</h2>
      </div>

      {Object.entries(categorizedProducts)
        .filter(([category]) => effectiveFilter === 'All' || category === activeFilter)
        .map(([category, items]) => {
          const displayItems = effectiveFilter === 'All' ? items.slice(0, 4) : items;
          const dbCategory = getDBValue(category);
          return (
            <div key={category} className="category-block" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>{category}</h3>
                {effectiveFilter === 'All' && items.length > 4 && (
                  <span 
                    onClick={() => onSeeAll && onSeeAll(dbCategory)}
                    style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    See All &gt;
                  </span>
                )}
              </div>
              <div className="product-grid">
                {displayItems.map((product) => (
                   <div key={product._id} style={{ position: 'relative' }}>
                     <ProductCard
                       product={{
                         ...product,
                         name: product.productName,
                         price: product.pricePerKg,
                         producer: product.farmer?.name || "Verified Farmer",
                         location: product.manualLocation,
                         image: getProductImage(product.productName) || null
                       }}
                     />
                     {product.distanceToUser < 50 && (
                       <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#166534', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 2 }}>
                         Nearest 📍
                       </div>
                     )}
                   </div>
                ))}
              </div>
            </div>
          );
        })}
      
      {products.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No products found in the marketplace.
        </div>
      )}
    </section>
  );
};

export default ProductsSection;
