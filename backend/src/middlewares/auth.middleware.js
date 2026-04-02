/**
 * auth.js (middleware)
 *
 * Runs before any protected route handler.
 * Checks: "Is there a valid JWT in the Authorization header?"
 *
 * Flow: client sends "Authorization: Bearer <token>" → we verify the signature
 * → if valid, decode payload and attach to req.user → call next()
 * → if invalid, return 401 immediately.
 *
 * The token payload contains { id, email, role } so we skip a DB lookup
 * on every request — the signature IS the proof of authenticity.
 */
const {verifyAccessToken} = require("../services/token.service");
const {unauthorized} = require("../utils/apiResponse");

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]      // "Bearer <token>"

    if(!token) return unauthorized(res, 'No token provided. Please login');

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded         // now available as req.user in every downstream handler
        next();
    } catch (err) {
        if(err.name === 'TokenExpiredError'){
            return unauthorized(res, 'Session expired. Please log in again');
        }
        return unauthorized(res, 'Invalid token.')
    }
};

module.exports = {authenticate};