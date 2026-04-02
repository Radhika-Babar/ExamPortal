/**
 * role.js (middleware)
 *
 * Role-Based Access Control. Runs after authenticate() sets req.user.
 * Returns a middleware function configured for the allowed roles.
 *
 * Usage:
 *   router.post('/exam', authenticate, requireRole('faculty', 'admin'), handler)
 *
 * This pattern is called a "middleware factory" — a function that returns
 * a middleware, which lets you pass configuration (the role list) to it.
 */
const {forbidden} = require("../utils/apiResponse");

const requireRole = (...roles) => (req, res, next) => {
    if(!req.user) return forbidden(res, 'Authentication required');
    if(!roles.includes(req.user.role)){
        return forbidden(res, `Access denied. Requires role: ${roles.join(' or ')}`)
    }
    next();
};

module.exports = {requireRole};