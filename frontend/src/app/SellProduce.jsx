import React, { useState } from 'react';
import { toast } from 'react-toastify';
// Import all images from the produce directory eagerly
const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });

// Create a map of normalized filenames to their imported URLs
const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const SellProduce = () => {
    const [formData, setFormData] = useState({
        productName: '',
        category: '',
        description: '',
        pricePerKg: '',
        quantityAvailable: '',
        unit: 'kg',
        locationType: 'manual', // 'manual' or 'current'
        manualLocation: '',
    });

    const categories = ['Vegetables', 'Fruits', 'Grains & Pulses', 'Spices', 'Others'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGetCurrentLocation = async () => {
        if (navigator.geolocation) {
            toast.info("Fetching location...");
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();

                        // Extract a readable address
                        const address = data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;

                        setFormData(prev => ({
                            ...prev,
                            locationType: 'current',
                            manualLocation: address
                        }));
                        toast.success("Location fetched successfully!");
                    } catch (error) {
                        toast.error("Failed to get address. Using coordinates.");
                        setFormData(prev => ({
                            ...prev,
                            locationType: 'current',
                            manualLocation: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
                        }));
                    }
                },
                (error) => {
                    toast.error("Unable to get location. Please enter manually.");
                    setFormData(prev => ({ ...prev, locationType: 'manual' }));
                }
            );
        } else {
            toast.error("Geolocation is not supported by your browser");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Submitting Produce Data:", formData);
        toast.success("Product listed successfully!");
        // Reset form after standard submission
        setFormData({
            productName: '',
            category: '',
            description: '',
            pricePerKg: '',
            quantityAvailable: '',
            unit: 'kg',
            locationType: 'manual',
            manualLocation: '',
        });
    };

    // Advanced image matching logic
    const getProductImage = (productName) => {
        if (!productName || productName.trim() === '') return null;

        let normalized = productName.trim().toLowerCase().replace(/\s+/g, '-');

        // Exact match
        if (imageMap[normalized]) return imageMap[normalized];

        // Try singular/plural match (basic)
        if (normalized.endsWith('s') && imageMap[normalized.slice(0, -1)]) {
            return imageMap[normalized.slice(0, -1)];
        }
        if (imageMap[normalized + 's']) {
            return imageMap[normalized + 's'];
        }

        // Substring match (if normalized contains the key or key contains normalized)
        for (const key in imageMap) {
            // Ensure significant length for substring matching to avoid false positives
            if (normalized.length > 2 && key.length > 2) {
                if (normalized.includes(key) || key.includes(normalized)) {
                    return imageMap[key];
                }
            }
        }

        return null; // Not found
    };

    const imageSrc = getProductImage(formData.productName);

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Sell Produce</h1>

                <form onSubmit={handleSubmit}>
                    {/* Section 1: Basic Information */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>1</span>
                            Basic Information
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Product Name</label>
                                <input
                                    type="text"
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleChange}
                                    placeholder="e.g., Tomatoes, Wheat, Apples"
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white' }}
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe your produce (e.g., Freshly harvested, organic...)"
                                    required
                                    rows="4"
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Pricing & Stock */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>2</span>
                            Pricing & Stock
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Price (₹)</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        name="pricePerKg"
                                        value={formData.pricePerKg}
                                        onChange={handleChange}
                                        placeholder="Ask price"
                                        min="0"
                                        step="0.01"
                                        required
                                        style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px 0 0 8px', fontSize: '1rem' }}
                                    />
                                    <span style={{ padding: '12px', background: '#f5f5f5', border: '1px solid #ccc', borderLeft: 'none', borderRadius: '0 8px 8px 0', color: '#555' }}>
                                        per {formData.unit}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Quantity Available</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="number"
                                        name="quantityAvailable"
                                        value={formData.quantityAvailable}
                                        onChange={handleChange}
                                        placeholder="Stock"
                                        min="1"
                                        required
                                        style={{ flex: 2, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}
                                    />
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white' }}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="quintal">quintal</option>
                                        <option value="ton">ton</option>
                                        <option value="pieces">pieces</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Location */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>3</span>
                            Location
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="manual"
                                        checked={formData.locationType === 'manual'}
                                        onChange={handleChange}
                                    />
                                    Enter manually
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="current"
                                        checked={formData.locationType === 'current'}
                                        onChange={handleChange}
                                    />
                                    Use current location
                                </label>
                            </div>

                            {formData.locationType === 'manual' ? (
                                <input
                                    type="text"
                                    name="manualLocation"
                                    value={formData.manualLocation}
                                    onChange={handleChange}
                                    placeholder="Enter farm address, village, or pincode"
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        name="manualLocation"
                                        value={formData.manualLocation}
                                        onChange={handleChange}
                                        placeholder="Location coordinates will appear here"
                                        required
                                        readOnly
                                        style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', background: '#f9f9f9' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        className="btn btn-secondary"
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        Fetch Location
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Image Preview Box */}
                    <div style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1' }}>
                            {imageSrc ? (
                                <img
                                    src={imageSrc}
                                    alt={formData.productName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '10px' }}>
                                    {formData.productName ? 'Image not found' : 'Image Preview'}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Product Image</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                                An image will be automatically selected based on the your product name (e.g., tomatoes.jpg).
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginTop: '10px' }}
                    >
                        List Product for Sale
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SellProduce;
