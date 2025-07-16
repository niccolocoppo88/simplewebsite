const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Successfully connected to MongoDB!');
        
        // Try to perform a simple operation
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
    } catch (error) {
        console.error('Connection error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testConnection();
