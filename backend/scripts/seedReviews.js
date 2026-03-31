const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('../models/userModel');
const Product = require('../models/productModel');
const connectDB = require('../config/db');

dotenv.config({ path: '.env' }); // Adjusted for running from backend dir

// Connect to MongoDB
connectDB().then(() => {

const maleNames = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Sai', 'Krishna', 'Ishaan', 'Shaurya', 'Ayaan', 'Atharv', 'Karan', 'Rohit', 'Suresh', 'Ramesh', 'Rakesh', 'Siddharth'];
const femaleNames = ['Aadhya', 'Kiara', 'Pari', 'Saanvi', 'Myra', 'Ira', 'Avni', 'Riya', 'Sneha', 'Deepa', 'Priya', 'Pooja', 'Neha', 'Sunita', 'Anjali', 'Kavita', 'Smriti'];

const goodComments = [
    'Very fresh and good quality.',
    'Excellent produce! Fast delivery.',
    'I love the taste, very natural.',
    'The size and quality match the description perfectly.',
    'Best organic produce I have had in a while.',
    'My family loved this. Will buy again.',
    'Good value for money.',
    'Nicely packed and delivered fresh.',
    'Smells very good and fresh.',
    'Highly recommended for everyday use.'
];

const averageComments = [
    'Quality is okay, not the best.',
    'A bit overpriced for the quality.',
    'Some pieces were not fresh, but overall decent.',
    'Standard quality. Nothing special.',
    'Delivery took longer than expected.',
    'It was fine, just regular farm produce.'
];

const badComments = [
    'Not fresh at all. Disappointed.',
    'Many pieces were spoiled.',
    'Quality does not match the photos.',
    'Taste was very bland.',
    'Will not be ordering this again from this farmer.',
    'Too costly for what I received.'
];

const generateRandomReview = () => {
    const isMale = Math.random() > 0.5;
    const name = isMale ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const roll = Math.random();
    
    let rating, comment;
    if (roll > 0.3) {
        // 70% chance of 4-5 stars
        rating = Math.random() > 0.4 ? 5 : 4;
        comment = goodComments[Math.floor(Math.random() * goodComments.length)];
    } else if (roll > 0.1) {
        // 20% chance of 3 stars
        rating = 3;
        comment = averageComments[Math.floor(Math.random() * averageComments.length)];
    } else {
        // 10% chance of 1-2 stars
        rating = Math.random() > 0.5 ? 2 : 1;
        comment = badComments[Math.floor(Math.random() * badComments.length)];
    }

    // subtract some random number of days from exactly now to make reviews look historical
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
        user: new mongoose.Types.ObjectId(), // generating a random user ID for the review
        name: name,
        rating: rating,
        comment: comment,
        createdAt: date
    };
};

const seedReviews = async () => {
    try {
        const products = await Product.find({});
        console.log(`Found ${products.length} products to update...`);

        let updatedCount = 0;

        for (const product of products) {
            // we will overwrite existing reviews or just prepend. Let's just create new ones.
            const numReviewsToGenerate = Math.floor(Math.random() * 6) + 3; // 3 to 8 reviews
            
            const newReviews = [];
            for (let i = 0; i < numReviewsToGenerate; i++) {
                newReviews.push(generateRandomReview());
            }

            // sort reviews by date desc
            newReviews.sort((a, b) => b.createdAt - a.createdAt);

            product.reviews = newReviews;
            product.numReviews = newReviews.length;
            
            const totalRating = newReviews.reduce((sum, review) => sum + review.rating, 0);
            product.rating = (totalRating / newReviews.length).toFixed(1); // Calculate average

            await product.save();
            updatedCount++;
        }

        console.log(`Successfully seeded reviews for ${updatedCount} products!`);
        process.exit();
    } catch (error) {
        console.error('Error seeding reviews:', error);
        process.exit(1);
    }
};

seedReviews();
}); // close connectDB().then()
