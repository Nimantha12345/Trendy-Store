const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. Import කරලා තියෙනවා
require('dotenv').config();

const app = express();

// --- Middleware ---

// 🟢 CORS එක මෙතනදී තමයි Active කරන්නේ. 
// මේක Routes වලට උඩින් තියෙන්නම ඕනේ.
app.use(cors()); 

// Base64 Images වල දත්ත ප්‍රමාණය වැඩි නිසා මේ limit එක අනිවාර්යයි
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully..."))
    .catch(err => console.error("❌ Connection Error: ", err));

// --- Routes ---
const productRoutes = require('./routes/product');
app.use('/api/products', productRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));