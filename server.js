const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something broke!' });
});

// MongoDB connection
let isConnecting = false;
const connectDB = async () => {
    if (isConnecting) return;
    
    isConnecting = true;
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,
            heartbeatFrequencyMS: 2000
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
    } finally {
        isConnecting = false;
    }
};

// Initial connection
connectDB();

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    if (!isConnecting) {
        setTimeout(connectDB, 5000);
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    if (!isConnecting) {
        setTimeout(connectDB, 5000);
    }
});

// Email Schema
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Email = mongoose.model('Email', emailSchema);

// Email validation function
const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

// Helper function to wait for database connection
const waitForConnection = async (maxAttempts = 3) => {
    for (let i = 0; i < maxAttempts; i++) {
        if (mongoose.connection.readyState === 1) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
};

// Routes
app.post('/api/subscribe', async (req, res) => {
    try {
        // Wait for connection with retries
        const isConnected = await waitForConnection();
        if (!isConnected) {
            console.error('Database connection not available after retries');
            return res.status(503).json({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again in a moment.' 
            });
        }

        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        try {
            // Check if email already exists
            const existingEmail = await Email.findOne({ email: normalizedEmail });
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
            }

            const newEmail = new Email({ email: normalizedEmail });
            await newEmail.save();
            console.log('New email saved:', normalizedEmail);
            return res.json({ success: true, message: 'Thank you for subscribing! 🎉' });
        } catch (dbError) {
            console.error('Database operation error:', dbError);
            
            if (dbError.code === 11000) {  // Duplicate key error
                return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
            }

            throw dbError; // Re-throw for general error handling
        }
    } catch (error) {
        console.error('Subscription error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        // Log the full error for debugging
        console.error('Detailed error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });

        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your request. Please try again.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
