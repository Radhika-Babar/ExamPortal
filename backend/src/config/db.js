/**
 * db.js
 * Connects to MongoDB using Mongoose.
 *
 * Why Mongoose over raw MongoDB driver?
 * - Schema validation: defines exactly what shape a document must have
 * - Middleware hooks: run code before/after save, delete, etc.
 * - Cleaner query API and built-in population (like SQL JOINs)
 *
 * Mongoose maintains its own internal connection pool,
 * so you connect once here and reuse across the whole app.
 */

const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(env.mongoUri, {
             // These options silence deprecation warnings
            serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`)
    }catch(err){
        console.log(`❌ MongoDB connection failed:', err.message`)
        process.exit(1); // no point running the server without a database
    }
};

// Log connection events — useful for debugging in production
mongoose.connection.on('disconnected', ()=> console.log('⚠️ MongoDB disconnected'))
mongoose.connection.on('disconnected', ()=> console.log('✅ MongoDB reconnected'))

module.exports = connectDB;