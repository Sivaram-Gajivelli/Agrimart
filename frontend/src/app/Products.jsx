import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

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

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyingProduct, setBuyingProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchMarketplace = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/products/marketplace');
                if (!response.ok) throw new Error('Failed to fetch marketplace');
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Error:", error);
                toast.error("Could not load products at this time.");
            } finally {
                setLoading(false);
            }
        };
        fetchMarketplace();
    }, []);

    const handleBuyClick = (product) => {
        setBuyingProduct(product);
        setQuantity(1);
    };

    const handleConfirmPurchase = async (e) => {
        e.preventDefault();

        if (quantity > buyingProduct.quantityAvailable) {
            toast.error(`Only ${buyingProduct.quantityAvailable} available!`);
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    productId: buyingProduct._id,
                    quantity: Number(quantity)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to place order');
            }

            toast.success("Order placed successfully!");
            setBuyingProduct(null);

            // Refresh products since stock might have decreased
            const fetchMarketplace = await fetch('http://localhost:3000/api/products/marketplace');
            setProducts(await fetchMarketplace.json());

        } catch (error) {
            toast.error(error.message || "Please login as a customer to buy products.");
        }
    };

    if (loading) {
        return <div style={{ padding: '120px 5% 40px', minHeight: '60vh', textAlign: 'center' }}><h2>Loading Marketplace...</h2></div>;
    }

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2.5rem' }}>Fresh Produce Marketplace</h1>

                {products.length === 0 ? (
                    <div style={{ background: 'white', padding: '50px', borderRadius: '15px', textAlign: 'center' }}>
                        <h3>No products are currently available in the marketplace.</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                        {products.map(product => (
                            <div key={product._id} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                <div style={{ height: '200px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {getProductImage(product.productName) ? (
                                        <img src={getProductImage(product.productName)} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>No Image</span>
                                    )}
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-dark)', margin: 0 }}>{product.productName}</h3>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{product.pricePerKg} / {product.unit}</span>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '15px' }}>{product.description || "No description provided."}</p>

                                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', marginBottom: '15px', fontSize: '0.9rem' }}>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Farmer:</strong> {product.farmer?.name || 'Unknown'}</p>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Pickup:</strong> {product.manualLocation}</p>
                                        <p style={{ margin: 0 }}><strong>Available:</strong> {product.quantityAvailable} {product.unit}</p>
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%' }}
                                        onClick={() => handleBuyClick(product)}
                                        disabled={product.quantityAvailable <= 0}
                                    >
                                        {product.quantityAvailable <= 0 ? 'Out of Stock' : 'Buy Now'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Buy Modal */}
            {buyingProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
                        <h2 style={{ color: 'var(--primary-dark)', marginBottom: '20px' }}>Order {buyingProduct.productName}</h2>

                        <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                            <p style={{ margin: '0 0 5px 0' }}><strong>Price:</strong> ₹{buyingProduct.pricePerKg} / {buyingProduct.unit}</p>
                            <p style={{ margin: '0 0 5px 0' }}><strong>Available:</strong> {buyingProduct.quantityAvailable} {buyingProduct.unit}</p>
                            <p style={{ margin: 0 }}><strong>Total:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{buyingProduct.pricePerKg * quantity}</span></p>
                        </div>

                        <form onSubmit={handleConfirmPurchase}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity ({buyingProduct.unit})</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={buyingProduct.quantityAvailable}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setBuyingProduct(null)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Confirm Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
