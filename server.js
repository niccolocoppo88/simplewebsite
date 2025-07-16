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
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Don't exit the process, let the application continue
    }
};

// Connect to MongoDB
connectDB();

// MongoDB connection error handling
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectDB();
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

// Routes
app.post('/api/subscribe', async (req, res) => {
    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database connection is not ready');
        }

        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already exists
        const existingEmail = await Email.findOne({ email: normalizedEmail });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
        }

        const newEmail = new Email({ email: normalizedEmail });
        await newEmail.save();
        console.log('New email saved:', normalizedEmail);
        res.json({ success: true, message: 'Thank you for subscribing! 🎉' });
    } catch (error) {
        console.error('Subscription error:', error);
        
        if (error.message === 'Database connection is not ready') {
            return res.status(503).json({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again in a moment.' 
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        if (error.code === 11000) {  // Duplicate key error
            return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
        }

        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your request. Please try again.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
