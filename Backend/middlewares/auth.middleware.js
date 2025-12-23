import jwt from 'jsonwebtoken';
import ResponseHandler from '../utils/ResponseHandler.js';
import { User } from '../models/index.js';

export const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return ResponseHandler.unauthorized(res, "Authentication failed: No token provided");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
        const user = await User.findById(decodedToken.userId);

        if (!user) {
            return ResponseHandler.unauthorized(res, "Authentication failed: User not found");
        }

        if (!user.isActive) {
            return ResponseHandler.forbidden(res, "Account is disabled");
        }

        req.user = {
            userId: user._id,
            role: user.role,
            organisationId: user.organisationId,
            departmentId: user.departmentId
        };
        next();
    } catch (err) {
        return ResponseHandler.unauthorized(res, "Authentication failed: Invalid token");
    }
};

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return ResponseHandler.forbidden(res, "Access denied: Insufficient permissions");
        }
        next();
    };
};
