const { getDistance } = require('./distanceHelper');

/**
 * Calculates the First-Mile Logistics (FML) cost for a product.
 * @param {Object} product - The product object containing coordinates and hub data.
 * @param {Object} hub - The nearest hub object.
 * @returns {number} The calculated FML cost.
 */
const calculateFML = (product, hub) => {
    const FML_RATE_PER_KM = 2; // ₹2 per km
    const FIXED_FALLBACK_COST = 10; // ₹10 fallback

    if (hub && hub.latitude && hub.longitude && product.latitude && product.longitude) {
        const distance = getDistance(product.latitude, product.longitude, hub.latitude, hub.longitude);
        return Math.max(FIXED_FALLBACK_COST, Math.round(distance * FML_RATE_PER_KM));
    }

    return FIXED_FALLBACK_COST;
};

/**
 * Encapsulates the product with an effective price including FML.
 * @param {Object} product - The product object from MongoDB.
 * @param {Object} hub - The populated nearest hub.
 * @returns {Object} Product with embedded FML in pricePerKg.
 */
const getEffectiveProduct = (product, hub) => {
    const p = product.toObject ? product.toObject() : product;
    const fml = calculateFML(p, hub || p.nearestHub);
    
    return {
        ...p,
        basePrice: p.pricePerKg,
        fmlCost: fml,
        pricePerKg: p.pricePerKg + fml
    };
};

module.exports = { calculateFML, getEffectiveProduct };
