const User = require('../models/userModel');
const DeliveryAssignment = require('../models/deliveryAssignmentModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

/**
 * Common distance calculation (Same logic as distanceHelper if it exists)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2-lat1);
    const dLon = deg2rad(lon2-lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; 
    return d;
};

const deg2rad = (deg) => deg * (Math.PI/180);

/**
 * Shared Auto-Assignment Logic for Delivery Logistics
 * @param {string} orderId - ID of the order (or product for stocking)
 * @param {string} type - 'Pickup' or 'Delivery'
 * @param {string} hubId - Origin/Location Hub of the task
 */
const autoAssignDeliveryAgent = async (orderId, type = 'Pickup', hubId = null) => {
    try {
        console.log(`[LOGISTICS] Auto-assigning ${type} for order: ${orderId} (Hub: ${hubId})`);
        
        // 1. Fetch available agents
        // Query agents who are online
        let query = { role: 'delivery_partner', isOnline: true };
        if (hubId) {
            query.assignedHub = hubId;
        }

        let agents = await User.find(query);

        // Fallback: If no agents in the specific hub, look for ANY online agent (Hub Hub Alignment requirement)
        if (agents.length === 0 && hubId) {
            console.log(`[LOGISTICS] No agents in hub ${hubId}. Falling back to global online agents.`);
            agents = await User.find({ role: 'delivery_partner', isOnline: true });
        }

        if (agents.length === 0) {
            console.log(`[LOGISTICS] No online agents available for assignment.`);
            return null;
        }

        const Hub = require('../models/hubModel');
        const targetHub = hubId ? await Hub.findById(hubId) : null;

        // 2. Rank by distance and workload
        const rankedAgents = await Promise.all(agents.map(async (agent) => {
            const activeCount = await DeliveryAssignment.countDocuments({
                agent: agent._id,
                status: { $in: ['Assigned', 'Picked Up'] }
            });
            
            let distance = 0;
            if (targetHub && agent.assignedHub) {
                const agentHub = await Hub.findById(agent.assignedHub);
                if (agentHub) {
                    distance = getDistance(
                        targetHub.latitude, targetHub.longitude,
                        agentHub.latitude, agentHub.longitude
                    );
                }
            }

            return { agent, activeCount, distance };
        }));

        // Sort by workload first, then distance
        rankedAgents.sort((a, b) => {
            if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
            return a.distance - b.distance;
        });

        const selectedAgent = rankedAgents[0].agent;

        // 3. Create assignment
        const assignmentData = {
            agent: selectedAgent._id,
            type,
            status: 'Assigned'
        };

        if (type === 'Pickup') {
            // Check if it's a Stocking Pickup (Product)
            if (orderId.length > 20) { // Simple check for ObjectId
                assignmentData.order = orderId;
            } else {
                assignmentData.product = orderId;
            }
        } else {
            assignmentData.order = orderId;
        }

        const assignment = await DeliveryAssignment.create(assignmentData);
        console.log(`[LOGISTICS] Task auto-assigned to agent: ${selectedAgent.name} (Active Tasks: ${rankedAgents[0].activeCount})`);
        
        return assignment;
    } catch (err) {
        console.error('[LOGISTICS] Auto-assignment utility error:', err);
        return null;
    }
};

module.exports = {
    autoAssignDeliveryAgent,
    getDistance
};
