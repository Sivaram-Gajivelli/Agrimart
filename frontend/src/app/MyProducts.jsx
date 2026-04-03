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

const MyProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products/my-products', {
                credentials: 'include' // Important to send cookie
            });
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error("Error fetching my products:", error);
            toast.error("Could not load your listed products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleRemove = async (productId) => {
        if (!window.confirm("Are you sure you want to remove this listing?")) return;

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete product');

            toast.success("Product removed successfully");
            fetchProducts(); // Refresh list
        } catch (error) {
            console.error("Error removing product:", error);
            toast.error("Failed to remove product");
        }
    };

    const handleEditClick = (product) => {
        setEditingProduct(product);
        setEditFormData({
            pricePerKg: product.pricePerKg,
            quantityAvailable: product.quantityAvailable,
            description: product.description,
            unit: product.unit,
            manualLocation: product.manualLocation
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/products/${editingProduct._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) throw new Error('Failed to update product');

            toast.success("Product updated successfully");
            setEditingProduct(null);
            fetchProducts(); // Refresh list
        } catch (error) {
            console.error("Error updating product:", error);
            toast.error("Failed to update product");
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '120px 5% 40px', minHeight: '100vh', background: 'var(--bg-main)', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--primary-dark)' }}>Loading your products...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2.5rem' }}>My Listed Products</h1>

                {products.length === 0 ? (
                    <div style={{ background: 'white', padding: '50px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '15px' }}>You haven't listed any products yet.</h3>
                        <p style={{ color: '#64748b', marginBottom: '25px' }}>Start selling your fresh produce directly to customers and retailers.</p>
                        <a href="/sell-produce" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>List a Product Now</a>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                        {products.map((product) => (
                            <div key={product._id} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '200px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {getProductImage(product.productName) ? (
                                        <img src={getProductImage(product.productName)} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>No Image</span>
                                    )}
                                </div>
                                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary-dark)', margin: 0 }}>{product.productName}</h3>
                                        <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                            {product.category}
                                        </span>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '15px', flex: 1 }}>{product.description}</p>

                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Price:</span>
                                            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{parseFloat(product.pricePerKg).toFixed(2)} / {product.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Stock:</span>
                                            <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>{product.quantityAvailable} {product.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Pickup:</span>
                                            <span style={{ color: 'var(--text-dark)', fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{product.manualLocation}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Listed on:</span>
                                            <span style={{ color: 'var(--text-dark)', fontSize: '0.9rem' }}>{new Date(product.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="btn btn-secondary" onClick={() => handleEditClick(product)} style={{ flex: 1, padding: '10px' }}>Edit</button>
                                        <button onClick={() => handleRemove(product._id)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ color: 'var(--primary-dark)', marginBottom: '20px' }}>Edit {editingProduct.productName}</h2>

                        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Price</label>
                                <input type="number" name="pricePerKg" value={editFormData.pricePerKg} onChange={handleEditChange} required step="0.01" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity</label>
                                    <input type="number" name="quantityAvailable" value={editFormData.quantityAvailable} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Unit</label>
                                    <select name="unit" value={editFormData.unit} onChange={handleEditChange} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                                        <option value="kg">kg</option>
                                        <option value="quintal">quintal</option>
                                        <option value="ton">ton</option>
                                        <option value="pieces">pieces</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Pickup Location</label>
                                <input type="text" name="manualLocation" value={editFormData.manualLocation} onChange={handleEditChange} required style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description</label>
                                <textarea name="description" value={editFormData.description} onChange={handleEditChange} rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', resize: 'vertical' }}></textarea>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setEditingProduct(null)} style={{ flex: 1, padding: '12px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProducts;

