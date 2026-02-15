const path = require('path');
const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });


const cors = require('cors');

const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
// Middleware to parse cookies from incoming requests


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

const staff = require('./routes/staffRoutes');
app.use('/api/staff', staff);

const packageRoutes = require('./routes/packageRoutes');
app.use('/api/packages', packageRoutes);


const member = require('./routes/memberRoutes');
app.use('/api/members', member);


const subscription = require('./routes/subscriptionRoutes');
app.use('/api/subscriptions', subscription);


const checkin = require('./routes/checkinRoutes');
app.use('/api/checkins', checkin); 


const classes = require('./routes/classRoutes');
app.use('/api/classes', classes);


const booking = require('./routes/bookingRoutes');
app.use('/api/bookings', booking);

module.exports = app;
