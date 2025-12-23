// models/OrgAdmin.js
import mongoose from 'mongoose';
import User from './User.model.js';
import { ROLES } from '../utils/constants.js';

const orgAdminSchema = new mongoose.Schema({
    organisationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true
    }
}, { discriminatorKey: 'role' });

export default User.discriminator(ROLES.ORG_ADMIN, orgAdminSchema);
