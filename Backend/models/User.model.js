// models/User.js

import mongoose from 'mongoose';
import { USER_ROLES_ARRAY } from '../utils/constants.js';

const userBaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: USER_ROLES_ARRAY,
        required: true
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    skipVersioning: true,
    discriminatorKey: 'role', // KEY FOR INHERITANCE
    collection: 'users'
});

const User = mongoose.model('User', userBaseSchema);

export default User;
