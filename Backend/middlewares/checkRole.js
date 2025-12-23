import { ROLES } from "../utils/constants.js";
import ResponseHandler from "../utils/ResponseHandler.js";

/**
 * Middleware to check if user has one of the allowed roles
 * @param {Array} allowedRoles - Array of allowed role strings
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return ResponseHandler.unauthorized(res, "User role not found");
        }

        if (!allowedRoles.includes(userRole)) {
            return ResponseHandler.forbidden(
                res,
                `Access denied. Required roles: ${allowedRoles.join(", ")}`
            );
        }

        next();
    };
};

export default checkRole;
