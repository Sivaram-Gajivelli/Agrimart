import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../assets/styles/Checkout.css';

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

const Checkout = () => {
    const { cart, loading, refreshCart } = useCart();
    const { user, isAuthenticated } = useAuth();
    const { latitude: userLat, longitude: userLng, address: detectedAddr, detectLocation } = useLocationContext();
    const navigate = useNavigate();

    const [address, setAddress] = useState('');
    const [isChangingAddress, setIsChangingAddress] = useState(false);
    const [orderLoading, setOrderLoading] = useState(false);
    const [deliveryData, setDeliveryData] = useState({});
    const [calculatingDelivery, setCalculatingDelivery] = useState(false);
    const [hubs, setHubs] = useState([]);

    const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4NmIzNzMzZmRkNzQ4M2Y4MTZhNDlmZWFmMDkwYzMyIiwiaCI6Im11cm11cjY0In0=";

    const geocodeAddress = async (addressText) => {
        try {
            const currentLang = document.documentElement.lang || 'en';
            // First try Nominatim as it has better Indian locality data
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText)}&accept-language=${currentLang}`, {
                headers: { 'User-Agent': 'Agrimart/1.0' }
            });
            const data = await res.json();
            
            if (data && data.length > 0) {
                const feature = data[0];
                return {
                    coordinates: [parseFloat(feature.lon), parseFloat(feature.lat)], // [lng, lat]
                    district: feature.display_name
                };
            }

            // Fallback to OpenRouteService if Nominatim fails
            const orsRes = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(addressText)}`);
            const orsData = await orsRes.json();
            if (orsData && orsData.features && orsData.features.length > 0) {
                const feature = orsData.features[0];
                return {
                    coordinates: feature.geometry.coordinates, // [lng, lat]
                    district: feature.properties?.county || feature.properties?.region || feature.properties?.locality || ""
                };
            }

            return null;
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    };

    // Fetch hubs from database
    useEffect(() => {
        const fetchHubs = async () => {
            try {
                const res = await axios.get('/api/admin/hubs/public');
                if (res.data && res.data.length > 0) {
                    setHubs(res.data.map(h => ({
                        name: h.name,
                        coordinates: [h.longitude, h.latitude]
                    })));
                }
            } catch (err) {
                // Fallback to hardcoded hubs if db fetch fails
                setHubs([
                    { name: "Visakhapatnam", coordinates: [83.218481, 17.686815] },
                    { name: "Vizianagaram",  coordinates: [83.401490, 18.114757] },
                    { name: "Rajahmundry",   coordinates: [81.804034, 17.000538] },
                    { name: "Kakinada",      coordinates: [82.247500, 16.989100] },
                    { name: "Vijayawada",    coordinates: [80.648015, 16.506174] },
                    { name: "Guntur",        coordinates: [80.436540, 16.306652] },
                    { name: "Nellore",       coordinates: [79.986456, 14.442598] },
                    { name: "Tirupati",      coordinates: [79.419179, 13.628755] },
                    { name: "Kurnool",       coordinates: [78.037279, 15.828125] },
                    { name: "Kadapa",        coordinates: [78.824167, 14.467377] },
                    { name: "Anantapur",     coordinates: [77.600591, 14.681887] },
                ]);
            }
        };
        fetchHubs();
    }, []);

    const getHaversineDistance = (coords1, coords2) => {
        const toRad = p => p * Math.PI / 180;
        const [lon1, lat1] = coords1;
        const [lon2, lat2] = coords2;
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const getDistance = async (startCoords, endCoords) => {
        try {
            const startStr = `${startCoords[0]},${startCoords[1]}`;
            const endStr = `${endCoords[0]},${endCoords[1]}`;
            const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${startStr}&end=${endStr}`);
            const data = await res.json();
            if (data && data.features && data.features.length > 0) {
                return data.features[0].properties.segments[0].distance / 1000;
            }
            return null;
        } catch(error) {
            console.error("Directions error:", error);
            return null;
        }
    };

    useEffect(() => {
        const calculateDelivery = async () => {
            if (!cart || !cart.items || cart.items.length === 0 || !address.trim() || isChangingAddress || hubs.length === 0) {
                return;
            }
            
            setCalculatingDelivery(true);
            const deliveryFees = {};
            
            try {
                const geocodeResult = await geocodeAddress(address);
                
                if (geocodeResult && hubs.length > 0) {
                    const buyerCoords = geocodeResult.coordinates;
                    const buyerDistrict = geocodeResult.district;

                    let nearestHub = null;
                    let minDistance = Infinity;

                    const hubCoverage = {
                        "Visakhapatnam": ["vizag", "visakhapatnam", "vizianagaram", "srikakulam", "anakapalli"],
                        "Rajahmundry": ["east godavari", "west godavari", "konaseema", "eluru", "kakinada"],
                        "Vijayawada": ["ntr", "krishna"],
                        "Guntur": ["guntur", "palnadu", "bapatla"],
                        "Nellore": ["nellore", "prakasam"],
                        "Tirupati": ["tirupati", "chittoor", "annamayya"],
                        "Kadapa": ["ysr kadapa", "kadapa", "ysr"],
                        "Kurnool": ["kurnool", "nandyal"],
                        "Anantapur": ["anantapur", "sri sathya sai"]
                    };

                    let assignedHubName = null;
                    const searchStr = (buyerDistrict || "") + " " + address;
                    const distLower = searchStr.toLowerCase();
                    
                    for (const [hubName, districts] of Object.entries(hubCoverage)) {
                        if (districts.some(d => distLower.includes(d))) {
                            assignedHubName = hubName;
                            break;
                        }
                    }

                    if (assignedHubName) {
                        nearestHub = hubs.find(h => h && h.name && h.name.toLowerCase() === assignedHubName.toLowerCase());
                    }

                    if (!nearestHub) {
                        for (const hub of hubs) {
                            if (hub && hub.coordinates) {
                                const dist = getHaversineDistance(buyerCoords, hub.coordinates);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearestHub = hub;
                                }
                            }
                        }
                    } else if (nearestHub.coordinates) {
                        minDistance = getHaversineDistance(buyerCoords, nearestHub.coordinates);
                    }

                    // Only proceed if we found a hub and its coordinates
                    if (nearestHub && nearestHub.coordinates) {
                        let drivingDistance = await getDistance(nearestHub.coordinates, buyerCoords);
                        if (drivingDistance === null) {
                            drivingDistance = minDistance; // Fallback to straight line
                        }

                        const totalCartWeight = validCartItems.reduce((total, item) => total + (item.quantity || 0), 0);
                        
                        if (totalCartWeight > 0) {
                            let slabFee = 0;
                            if (drivingDistance <= 20) slabFee = 20;
                            else if (drivingDistance <= 50) slabFee = 30;
                            else if (drivingDistance <= 100) slabFee = 50;
                            else if (drivingDistance <= 200) slabFee = 70;
                            else slabFee = 90;

                            const transportRatePerKg = drivingDistance * 0.02;
                            const totalWeightFee = totalCartWeight * transportRatePerKg;
                            const cartTotalDeliveryFee = slabFee + totalWeightFee;
                            const cartPlatformFee = 5;

                            for (let item of validCartItems) {
                                if (item.product && item.product._id) {
                                    const weightRatio = item.quantity / totalCartWeight;
                                    const itemDeliveryFee = cartTotalDeliveryFee * weightRatio;
                                    const itemPlatformFee = cartPlatformFee * weightRatio;

                                    deliveryFees[item.product._id] = {
                                        distance: drivingDistance,
                                        nearestHub: nearestHub.name,
                                        itemDeliveryFee,
                                        itemPlatformFee
                                    };
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Delivery calculation error:", err);
            }
            setDeliveryData(deliveryFees);
            setCalculatingDelivery(false);
        };
        
        const timeoutId = setTimeout(calculateDelivery, 1500);
        return () => clearTimeout(timeoutId);
    }, [cart, address, isChangingAddress, hubs]);

    useEffect(() => {
        if (user && user.address) {
            setAddress(user.address);
        } else if (detectedAddr) {
            setAddress(detectedAddr);
        }
    }, [user, detectedAddr]);

    useEffect(() => {
        refreshCart();
    }, []);

    const isCartFetchPending = isAuthenticated && user?.role === 'customer' && cart === null;

    if (loading || isCartFetchPending) {
        return (
            <div className="checkout-container">
                <div className="checkout-loading">
                    <h2>Loading checkout...</h2>
                </div>
            </div>
        );
    }

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="checkout-container">
                <div className="empty-checkout">
                    <h2>Your cart is empty</h2>
                    <button onClick={() => navigate('/products')}>Return to Shop</button>
                </div>
            </div>
        );
    }

    // Filter valid items once to avoid repetitive checks
    const validCartItems = cart.items.filter(item => item && item.product);

    if (validCartItems.length === 0) {
        return (
            <div className="checkout-container">
                <div className="empty-checkout">
                    <h2>Your cart contains invalid items</h2>
                    <p>Some products are no longer available. Please update your cart.</p>
                    <button onClick={() => navigate('/cart')}>Go to Cart</button>
                </div>
            </div>
        );
    }

    const calculateTotals = () => {
        try {
            let subtotal = 0;
            let totalWeight = 0;
            let shippingHandling = 0;
            let platformFee = 0;
            
            validCartItems.forEach(item => {
                if (item && item.product) {
                    const price = Number(item.product.pricePerKg) || 0;
                    const qty = Number(item.quantity) || 0;
                    subtotal += (price * qty);
                    totalWeight += qty;
                    
                    const data = deliveryData[item.product._id];
                    if (data) {
                        shippingHandling += (Number(data.itemDeliveryFee) || 0);
                        platformFee += (Number(data.itemPlatformFee) || 0);
                    }
                }
            });
            
            if (platformFee === 0 && validCartItems.length > 0) platformFee = 5; // Fallback
            
            const tax = 0; // GST is 0
            
            // 🚀 NEW: Free Delivery Scheme (Threshold: ₹299)
            let effectiveShipping = shippingHandling;
            if (subtotal >= 299) {
                effectiveShipping = 0;
            }

            const orderTotal = Number(subtotal) + Number(platformFee) + Number(effectiveShipping) + Number(tax);
            
            return { 
                subtotal: Number(subtotal) || 0, 
                platformFee: Number(platformFee) || 0, 
                shippingHandling: Number(shippingHandling) || 0, 
                effectiveShipping: Number(effectiveShipping) || 0,
                tax: Number(tax) || 0, 
                orderTotal: Number(orderTotal) || 0, 
                totalWeight: Number(totalWeight) || 0 
            };
        } catch (error) {
            console.error("Critical error in calculateTotals:", error);
            return { subtotal: 0, platformFee: 0, shippingHandling: 0, tax: 0, orderTotal: 0, totalWeight: 0 };
        }
    };

    const totals = (cart && validCartItems.length > 0) ? calculateTotals() : { subtotal: 0, platformFee: 0, shippingHandling: 0, tax: 0, orderTotal: 0, totalWeight: 0 };

    const handlePlaceOrder = async () => {
        if (!address.trim()) {
            toast.error('Please enter a delivery address');
            return;
        }

        const validItemsForCheckout = validCartItems.filter(item => item.product?.quantityAvailable > 0);
        const outOfStockItems = validCartItems.filter(item => (item.product?.quantityAvailable || 0) <= 0);

        if (validItemsForCheckout.length === 0) {
            toast.error('All available items are out of stock. Please remove them from cart.');
            return;
        }

        if (outOfStockItems.length > 0) {
            toast.warning(`${outOfStockItems.map(i => i.product?.productName).join(', ')} is out of stock and will be skipped.`);
        }

        setOrderLoading(true);
        try {
            if (address !== user.address) {
                    await axios.put('/api/user/profile-update', { address }, { withCredentials: true });
            }

            const checkoutItems = validItemsForCheckout.map(item => {
                const orderQty = Math.min(item.quantity, item.product?.quantityAvailable || item.quantity);
                return {
                    productId: item.product?._id,
                    quantity: orderQty
                };
            });

            // Calculate overall fees based on what was precalculated
            let totalDeliveryFee = 0;
            let totalPlatformFee = 0;
            validItemsForCheckout.forEach(item => {
                if (item.product?._id && deliveryData[item.product._id]) {
                    totalDeliveryFee += deliveryData[item.product._id].itemDeliveryFee || 0;
                    totalPlatformFee += deliveryData[item.product._id].itemPlatformFee || 0;
                }
            });
            
            // Fallback for platform fee if deliveryData wasn't fully processed
            if (totalPlatformFee === 0) totalPlatformFee = 5;

            await axios.post('/api/orders', {
                items: checkoutItems,
                deliveryAddress: address,
                deliveryFee: totals.effectiveShipping, // Pass the effective (potentially waived) fee
                platformFee: totalPlatformFee
            }, { withCredentials: true });
            await axios.delete('/api/cart/all/clear', { withCredentials: true });

            toast.success(outOfStockItems.length > 0 ? 'Order placed for available items!' : 'Order placed successfully!');
            await refreshCart();
            navigate('/orders');
        } catch (error) {
            console.error('Error placing order:', error);
            toast.error(error.response?.data?.message || 'Failed to place order.');
        } finally {
            setOrderLoading(false);
        }
    };

    const handleGetCurrentLocation = async () => {
        if (navigator.geolocation) {
            toast.info("Fetching location...");
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const currentLang = document.documentElement.lang || 'en';
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${currentLang}`);
                        const data = await response.json();
                        const addr = data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
                        setAddress(addr);
                        toast.success("Location fetched successfully!");
                    } catch (error) {
                        toast.error("Failed to get address. Using coordinates.");
                        setAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
                    }
                },
                (error) => {
                    toast.error("Unable to get location. Please enter manually.");
                }
            );
        } else {
            toast.error("Geolocation is not supported by your browser");
        }
    };

    return (
        <div className="checkout-container">
            <div className="checkout-layout">
                <div className="checkout-main">
                    <section className="address-section">
                        <h2>1. Shipping Address</h2>
                        <div className="address-card">
                            {(user?.address && !isChangingAddress) ? (
                                <div className="saved-address">
                                    <p>{address}</p>
                                    <button className="change-link" onClick={() => setIsChangingAddress(true)}>Change</button>
                                </div>
                            ) : (
                                <div className="address-form">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Enter your address or use current location</p>
                                        <button 
                                            type="button" 
                                            onClick={detectLocation}
                                            className="location-btn"
                                        >
                                            📍 Use current location
                                        </button>
                                    </div>
                                    <textarea
                                        placeholder="Enter your full delivery address..."
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        rows="4"
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {user?.address && (
                                            <button className="cancel-link" onClick={() => {
                                                setAddress(user.address);
                                                setIsChangingAddress(false);
                                            }}>Cancel</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="payment-section">
                        <h2>2. Payment Method</h2>
                        <div className="payment-card">
                            <p>Cash on Delivery (COD)</p>
                            <span className="info-text">Pay when you receive your fresh produce.</span>
                        </div>
                    </section>

                    <section className="items-section">
                        <h2>3. Review items and shipping</h2>
                        <div className="items-list">
                            {validCartItems.map(item => (
                                <div key={item.product._id} className="checkout-item">
                                    <div className="item-thumbnail">
                                        <img 
                                            src={getProductImage(item.product.productName) || item.product.image || "/placeholder.png"} 
                                            alt={item.product.productName} 
                                        />
                                    </div>
                                    <div className="item-info">
                                        <h4>{item.product.productName}</h4>
                                        <p>Quantity: {item.quantity} {item.product.unit || 'kg'}</p>
                                        <p className="item-price" style={{ fontWeight: 'bold' }}>
                                            ₹{(item.product.pricePerKg * item.quantity).toFixed(2)}
                                        </p>
                                        
                                        {deliveryData[item.product._id] ? (
                                            <div className="delivery-info" style={{marginTop: '5px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem'}}>
                                                <p>Routed via: <strong>{deliveryData[item.product._id].nearestHub} Hub</strong></p>
                                            </div>
                                        ) : (
                                            <p style={{fontSize: '0.9rem', color: '#666', marginTop: '5px'}}>
                                                {calculatingDelivery ? "Calculating delivery routing..." : "Enter valid address for delivery routing."}
                                            </p>
                                        )}
                                        <p className="sold-by" style={{marginTop: '10px'}}>Sold by: <strong>{item.product.farmer?.name || 'Unknown Farmer'}</strong></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="checkout-sidebar">
                    <div className="order-summary-card">
                        <div className="top-action">
                            <button 
                                className="place-order-btn" 
                                disabled={orderLoading || !address.trim() || calculatingDelivery}
                                onClick={handlePlaceOrder}
                            >
                                {calculatingDelivery ? 'Wait, Calculating...' : orderLoading ? 'Processing...' : 'Place your order'}
                            </button>
                            <p className="agreement-text">
                                By placing your order, you agree to Agrimart's <span className="link-text">privacy notice</span> and <span className="link-text">conditions of use</span>.
                            </p>
                        </div>
                        
                        <div className="summary-details">
                            <h3>Order Summary</h3>
                            <div className="summary-row">
                                <span>Items:</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Platform Fee:</span>
                                <span>₹{totals.platformFee.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Shipping & handling ({totals.totalWeight}kg):</span>
                                <span style={{ color: totals.subtotal >= 299 ? '#166534' : 'inherit', fontWeight: totals.subtotal >= 299 ? 'bold' : 'normal' }}>
                                    {totals.subtotal >= 299 ? 'FREE' : `₹${totals.shippingHandling.toFixed(2)}`}
                                </span>
                            </div>
                            {totals.subtotal < 299 && (
                                <div className="delivery-promo" style={{ fontSize: '0.8rem', color: '#15803d', textAlign: 'right', marginBottom: '10px' }}>
                                    Add ₹{(299 - totals.subtotal).toFixed(2)} more for FREE delivery
                                </div>
                            )}
                            <div className="summary-row">
                                <span>Total before tax:</span>
                                <span>₹{(totals.subtotal + totals.platformFee + totals.effectiveShipping).toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Estimated tax (GST):</span>
                                <span>₹{totals.tax.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="summary-row total-row">
                            <span>Order Total:</span>
                            <span>₹{totals.orderTotal.toFixed(2)}</span>
                        </div>

                        <div className="bottom-promo" style={{textAlign: 'center', marginTop: '15px'}}>
                            <Link to="/shipping-policy" className="shipping-policy-link" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold'}}>How are shipping costs calculated?</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;

