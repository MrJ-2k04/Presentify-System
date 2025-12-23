// models/Faculty.js
import mongoose from 'mongoose';
import User from './User.model.js';
import { ROLES } from '../utils/constants.js';

const facultySchema = new mongoose.Schema({
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    organisationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true
    }
}, { discriminatorKey: 'role' });

export default User.discriminator(ROLES.FACULTY, facultySchema);
