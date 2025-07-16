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
        // Debug information
        console.log('Environment variables loaded:');
        console.log('PORT:', process.env.PORT);
        console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
        if (process.env.MONGODB_URI) {
            // Safely log part of the connection string without exposing credentials
            const sanitizedUri = process.env.MONGODB_URI.replace(
                /(mongodb\+srv:\/\/)([^:]+):([^@]+)@/,
                '$1****:****@'
            );
            console.log('Sanitized MONGODB_URI:', sanitizedUri);
        }
        
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 30000,
            dbName: 'emaildb', // Specify the database name explicitly
            retryWrites: true,
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
const waitForConnection = async (maxAttempts = 5) => {
    for (let i = 0; i < maxAttempts; i++) {
        console.log(`Connection attempt ${i + 1}/${maxAttempts}`);
        if (mongoose.connection.readyState === 1) {
            console.log('Connection is ready');
            return true;
        }
        if (i < maxAttempts - 1) {
            const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff
            console.log(`Waiting ${waitTime}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    console.log('Max connection attempts reached');
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
            console.log('Checking for existing email:', normalizedEmail);
            const existingEmail = await Email.findOne({ email: normalizedEmail });
            if (existingEmail) {
                console.log('Email already exists:', normalizedEmail);
                return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
            }

            console.log('Creating new email document...');
            const newEmail = new Email({ email: normalizedEmail });
            console.log('Saving to database...');
            const savedEmail = await newEmail.save();
            console.log('Email saved successfully:', {
                email: savedEmail.email,
                id: savedEmail._id,
                date: savedEmail.date
            });
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

// Test route to check database contents (Remove in production!)
app.get('/api/check-db', async (req, res) => {
    try {
        // Check connection status
        console.log('Database connection state:', mongoose.connection.readyState);
        
        // Get database statistics
        const stats = await mongoose.connection.db.stats();
        console.log('Database stats:', stats);
        
        // Count emails
        const emailCount = await Email.countDocuments();
        console.log('Number of emails in database:', emailCount);
        
        // Get last 5 emails
        const recentEmails = await Email.find()
            .sort({ date: -1 })
            .limit(5)
            .select('email date -_id');
            
        return res.json({
            connectionState: mongoose.connection.readyState,
            databaseName: mongoose.connection.name,
            emailCount,
            recentEmails
        });
    } catch (error) {
        console.error('Database check error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error checking database',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
