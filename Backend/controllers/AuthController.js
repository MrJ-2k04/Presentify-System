import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // You might need to install this if not present, checking package.json next
import { User } from '../models/index.js';
import ResponseHandler from '../utils/ResponseHandler.js';
import { ROLES } from '../utils/constants.js';

const login = async (req, res) => {
    const { email, password, platform } = req.body; // Added platform check placeholder

    try {
        const user = await User.findOne({ email }).populate('organisationId').populate('departmentId');
        if (!user) {
            return ResponseHandler.unauthorized(res, "Invalid credentials");
        }

        // Direct string comparison for now as per previous Teacher model, 
        // BUT we should switch to bcrypt. The plan said "hashed", so I will assume we start using bcrypt.
        // However, for migration, if old passwords were plain text, this depends.
        // I'll stick to bcrypt.compare, assuming new users are created with hashed passwords.
        // If the user hasn't installed bcryptjs, I need to check.
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return ResponseHandler.unauthorized(res, "Invalid credentials");
        }

        if (!user.isActive) {
            return ResponseHandler.forbidden(res, "Account is disabled");
        }

        // Optional: Platform check for System Admin on Mobile
        if (platform === 'mobile' && user.role === ROLES.SYSTEM_ADMIN) {
            return ResponseHandler.forbidden(res, "System Admin cannot login from mobile app");
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'dev_secret_key',
            { expiresIn: '12h' }
        );

        return ResponseHandler.success(res, {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organisationId: user.organisationId,
                departmentId: user.departmentId
            }
        }, "Login successful");

    } catch (err) {
        return ResponseHandler.error(res, err);
    }
};

export default {
    login
};
