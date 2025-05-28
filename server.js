const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const footballRoutes = require('./routes/football');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://football-livescore.vercel.app'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/football', footballRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});