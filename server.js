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
        const newEmail = new Email({ email });
        await newEmail.save();
        res.json({ success: true, message: 'Email subscribed successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Subscription failed. Email might already exist.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
