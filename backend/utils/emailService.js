const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOrderConfirmationEmail = async (userEmail, userName, orderDetails) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials not configured. Skipping confirmation email.');
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: 'Order Confirmation - Agrimart',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #166534; text-align: center;">Order Confirmed!</h2>
                <p>Hi ${userName},</p>
                <p>Thank you for shopping with Agrimart. Your order has been placed successfully and is currently being processed by the farmer.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Order Details</h3>
                    <p><strong>Tracking ID:</strong> ${orderDetails.trackingId}</p>
                    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                        <tr style="border-bottom: 1px solid #ccc; text-align: left;">
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                        </tr>
                        ${orderDetails.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 5px 0;">${item.productName}</td>
                            <td style="padding: 5px 0;">${item.quantity} ${item.unit}</td>
                            <td style="padding: 5px 0;">₹${item.itemTotal.toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </table>
                    <div style="margin-top: 10px; text-align: right;">
                        <p><strong>Subtotal:</strong> ₹${orderDetails.subtotal.toFixed(2)}</p>
                        <p><strong>Delivery Fee:</strong> ₹${orderDetails.deliveryFee.toFixed(2)}</p>
                        <p><strong>Platform Fee:</strong> ₹${orderDetails.platformFee.toFixed(2)}</p>
                        <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount.toFixed(2)}</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:5173/orders" style="background-color: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Track Your Order</a>
                </div>
                <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
                    If you have any questions, feel free to reply to this email. We're here to help!<br/>
                    <strong>Agrimart Team</strong>
                </p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent to ${userEmail}`);
    } catch (error) {
        console.error('Failed to send order confirmation email:', error);
    }
};

const sendVerificationEmail = async (userEmail, otp, type = 'profile') => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn(`[SECURITY] Email credentials missing. Logging OTP for ${userEmail}: ${otp}`);
            return;
        }

        const isPasswordReset = type === 'password';
        const mailOptions = {
            from: `"Agrimart Security" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: isPasswordReset ? 'Password Change Verification - Agrimart' : 'Verification Code - Agrimart',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #166534; margin: 0; font-size: 24px; font-weight: 800;">Identity Verification</h2>
                </div>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    You are receiving this email because a request was made to ${isPasswordReset ? 'change your password' : 'update your profile credentials'} on Agrimart.
                </p>
                <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 25px; border: 1px dashed #cbd5e1;">
                    <span style="display: block; font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.1em;">Your Verification Code</span>
                    <span style="font-size: 32px; font-weight: 900; color: #166534; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px; text-align: center;">
                    This code is valid for 10 minutes. If you did not request this, please ignore this email or change your password immediately.
                </p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
                <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
                    &copy; 2026 Agrimart Platform. Secure Sustainable Farming.
                </p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${userEmail}`);
    } catch (error) {
        console.error('Failed to send verification email:', error);
    }
};

const sendOrderCancellationEmail = async (userEmail, userName, orderDetails, reason) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials not configured. Skipping cancellation email.');
            return;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: 'Order Cancellation - Agrimart',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #d32f2f; text-align: center;">Order Cancelled</h2>
                <p>Hi ${userName},</p>
                <p>As requested, your order has been successfully cancelled. The farmer has been notified, and any necessary refunds will be processed shortly.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Cancellation Summary</h3>
                    <p><strong>Tracking ID:</strong> ${orderDetails.trackingId}</p>
                    <p><strong>Items:</strong></p>
                    <ul>
                        ${orderDetails.items.map(item => `<li>${item.productName} (${item.quantity} ${item.unit})</li>`).join('')}
                    </ul>
                    <p><strong>Reason:</strong> ${reason || 'Customer Requested'}</p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:5173/orders" style="background-color: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">View Your Orders</a>
                </div>
                <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
                    We hope to see you shopping with us again.<br/>
                    <strong>Agrimart Team</strong>
                </p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Cancellation email sent to ${userEmail}`);
    } catch (error) {
        console.error('Failed to send order cancellation email:', error);
    }
};

const sendFarmerOrderNotification = async (farmer, orderDetails) => {
    try {
        const { email, phone, name } = farmer;
        console.log(`[MOBILE NOTIFICATION] 📢 Farmer ${name || phone}: High demand! Your product was just ordered by a customer (Tracking: ${orderDetails.trackingId})`);

        if (email && process.env.EMAIL_USER) {
            const mailOptions = {
                from: `"Agrimart Marketplace" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'New Order Received! - Agrimart',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #166534; border-radius: 12px;">
                    <h2 style="color: #166534;">🎉 Congratulations, ${name || 'Farmer'}!</h2>
                    <p>One or more of your products have just been purchased on Agrimart.</p>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="margin: 0; color: #14532d;">Sold Items</h3>
                        <p><strong>Tracking ID:</strong> ${orderDetails.trackingId}</p>
                        <ul>
                            ${orderDetails.items.map(item => `<li><strong>${item.productName}:</strong> ${item.quantity} ${item.unit} (₹${item.pricePerKg}/${item.unit})</li>`).join('')}
                        </ul>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">
                        Please head to your portal to begin packing the produce and mark it as <strong>"Ready for Pickup"</strong> to ensure timely delivery.
                    </p>
                </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`Order notification email sent to farmer: ${email}`);
        }
    } catch (e) {
        console.error('Farmer Order Notification Error:', e);
    }
};

const sendFarmerHubArrivalNotification = async (farmer, productName) => {
    try {
        const { email, phone, name } = farmer;
        console.log(`[MOBILE NOTIFICATION] ✅ Farmer ${name || phone}: Great news! Your harvest "${productName}" has arrived safely at the Hub and is being verified.`);

        if (email && process.env.EMAIL_USER) {
            const mailOptions = {
                from: `"Agrimart Logistics" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Produce Arrived at Hub - Agrimart',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #1e3a8a; border-radius: 12px; border-left: 6px solid #1e40af;">
                    <h2 style="color: #1e3a8a;">🛡️ Arrival Confirmation</h2>
                    <p>Dear ${name || 'Farmer'},</p>
                    <p>We are pleased to inform you that your produce has safely reached our collection hub.</p>
                    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Product:</strong> ${productName}</p>
                        <p style="margin: 5px 0 0;"><strong>Status:</strong> At Hub (Awaiting Verification)</p>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">Once verified, the payout process for this batch will be initiated.</p>
                </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`Hub arrival notification email sent to farmer: ${email}`);
        }
    } catch (e) {
        console.error('Farmer Arrival Notification Error:', e);
    }
};

const sendCustomerOrderDeliveredNotification = async (customer, orderDetails) => {
    try {
        const { email, phone, name } = customer;
        console.log(`[MOBILE NOTIFICATION] 📦 Customer ${name || phone}: Great news! Your order #${orderDetails.trackingId.toString().slice(-8).toUpperCase()} has been delivered successfully. Enjoy your fresh harvest!`);

        if (email && process.env.EMAIL_USER) {
            const mailOptions = {
                from: `"Agrimart Fresh" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your Fresh Order has Arrived! - Agrimart',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #166534; border-radius: 12px; background-color: #fefce8;">
                    <h2 style="color: #166534; text-align: center;">📦 Delivered Successfully!</h2>
                    <p>Hi ${name || 'Customer'},</p>
                    <p>Your fresh produce from our farm-to-table network has just been delivered.</p>
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #fef08a;">
                        <p><strong>Tracking ID:</strong> ${orderDetails.trackingId}</p>
                        <ul style="padding-left: 20px;">
                            ${orderDetails.items.map(item => `<li>${item.productName} (${item.quantity} ${item.unit})</li>`).join('')}
                        </ul>
                    </div>
                    <p style="font-size: 14px; color: #64748b; text-align: center;">
                        Thank you for supporting our farmers and choosing a sustainable future!<br/>
                        <strong>Agrimart Team</strong>
                    </p>
                </div>
                `
            };
            await transporter.sendMail(mailOptions);
        }
    } catch (e) {
        console.error('Customer Delivery Notification Error:', e);
    }
};

module.exports = {
    transporter,
    sendOrderConfirmationEmail,
    sendOrderCancellationEmail,
    sendVerificationEmail,
    sendFarmerOrderNotification,
    sendFarmerHubArrivalNotification,
    sendCustomerOrderDeliveredNotification
};
