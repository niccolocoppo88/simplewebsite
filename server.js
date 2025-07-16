const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emaildb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Successfully connected to MongoDB.');
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// MongoDB connection error handling
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// Email Schema
const emailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Email = mongoose.model('Email', emailSchema);

// Routes
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        // Check if email already exists
        const existingEmail = await Email.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'This email is already subscribed!' });
        }

        const newEmail = new Email({ email });
        await newEmail.save();
        console.log('New email saved:', email);
        res.json({ success: true, message: 'Thank you for subscribing! 🎉' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Subscription failed. Please try again.' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
