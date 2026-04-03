import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../context/CartContext';

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

const ProductItem = ({ product, navigate }) => {
    const { addToCartGlobal } = useCart();
    const [selectedWeight, setSelectedWeight] = useState(1);
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

    return (
        <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/product/${product._id}`)}>
            <div style={{ height: '150px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getProductImage(product.productName) ? (
                    <img src={getProductImage(product.productName)} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <img src={product.image} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#166534', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={product.productName}>{product.productName}</h3>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: '#B12704', display: 'block' }}>₹{(product.pricePerKg * selectedWeight).toFixed(2)}</span>
                    </div>
                </div>
                
                <div style={{ marginBottom: '15px' }} onClick={(e) => e.stopPropagation()}>
                    <select 
                        value={selectedWeight} 
                        onChange={(e) => setSelectedWeight(parseFloat(e.target.value))}
                        style={{ 
                            width: '100%', 
                            padding: '10px', 
                            borderRadius: '6px', 
                            border: '1px solid #e2e8f0', 
                            fontSize: '0.9rem', 
                            background: '#ffffff', 
                            cursor: 'pointer',
                            color: '#334155',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center'
                        }}
                    >
                        {weights.map(w => (
                            <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '10px', marginBottom: '15px', fontSize: '0.8rem', marginTop: 'auto' }}>
                    <p style={{ margin: '0 0 5px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Farmer:</strong> {product.farmer?.name || 'Unknown'}</p>
                    <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={product.manualLocation}><strong>Pickup:</strong> {product.manualLocation}</p>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ 
                        width: '100%', 
                        borderRadius: '4px', 
                        background: 'var(--primary)', 
                        color: 'white', 
                        border: 'none', 
                        fontWeight: 'bold',
                        padding: '10px',
                        cursor: 'pointer'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        addToCartGlobal(product._id, selectedWeight);
                    }}
                    disabled={product.quantityAvailable <= 0}
                >
                    {product.quantityAvailable <= 0 ? 'Out of Stock' : 'Add to cart'}
                </button>
            </div>
        </div>
    );
};

const Products = () => {
    const [searchParams] = useSearchParams();
    const categoryFilter = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMarketplace = async () => {
            try {
                let response;
                if (searchQuery) {
                    response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
                } else {
                    response = await fetch('/api/products/marketplace');
                }
                
                if (!response.ok) throw new Error('Failed to fetch products');
                let data = await response.json();
                
                if (categoryFilter) {
                    data = data.filter(p => p.category === categoryFilter);
                }

                setProducts(data);
            } catch (error) {
                console.error("Error:", error);
                toast.error("Could not load products at this time.");
            } finally {
                setLoading(false);
            }
        };
        fetchMarketplace();
    }, [categoryFilter, searchQuery]);

    const getPageTitle = () => {
        if (searchQuery) return `Search Results for "${searchQuery}"`;
        if (categoryFilter) return `Fresh ${categoryFilter}`;
        return "Fresh Produce Marketplace";
    };

    if (loading) {
        return <div style={{ padding: '120px 5% 40px', minHeight: '60vh', textAlign: 'center' }}><h2>Loading Marketplace...</h2></div>;
    }

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2.5rem' }}>{getPageTitle()}</h1>

                {products.length === 0 ? (
                    <div style={{ background: 'white', padding: '50px', borderRadius: '15px', textAlign: 'center' }}>
                        <h3>No products are currently available in the marketplace.</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                        {products.map(product => (
                           <ProductItem key={product._id} product={product} navigate={navigate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;

