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
                    <p><strong>Product:</strong> ${orderDetails.productName}</p>
                    <p><strong>Quantity:</strong> ${orderDetails.quantity} ${orderDetails.unit}</p>
                    <p><strong>Total Price:</strong> ₹${orderDetails.totalPrice.toFixed(2)}</p>
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
                    <p><strong>Product:</strong> ${orderDetails.productName}</p>
                    <p><strong>Quantity:</strong> ${orderDetails.quantity} ${orderDetails.unit}</p>
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

module.exports = {
    transporter,
    sendOrderConfirmationEmail,
    sendOrderCancellationEmail
};
