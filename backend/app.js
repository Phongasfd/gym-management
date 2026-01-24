require('dotenv').config({ path: __dirname + '/.env' });
// Loads environment variables from a .env file into process.env.

const cors = require('cors');

const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
// Middleware to parse cookies from incoming requests

const passport = require('passport');
// Authentication middleware



// Allow request from other port, server
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true // Allow cookies or auth header to be sent 
}));


app.use(express.json());
// Middleware to parse JSON bodies from incoming requests

app.use(cookieParser());
// Use cookie parser middleware

app.get('/', (req, res) => {
    res.send('Gym Management System Backend is running');
});

const auth = require('./routes/authRoutes');
app.use('/api/auth', auth);


module.exports = app; 