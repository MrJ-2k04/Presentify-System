// models/SystemAdmin.js
import mongoose from 'mongoose';
import User from './User.model.js';
import { ROLES } from '../utils/constants.js';

const systemAdminSchema = new mongoose.Schema({
    // System Admin specific fields (if any)
}, { discriminatorKey: 'role' });

export default User.discriminator(ROLES.SYSTEM_ADMIN, systemAdminSchema);
