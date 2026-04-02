require("dotenv").config();

const required = ["PORT", "MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {   // ✅ FIXED
  if (!process.env[key]) {
    console.log(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d", // ⚠️ typo fixed
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  frontendUri: process.env.FRONTEND_URL || "http://localhost:5173",
};