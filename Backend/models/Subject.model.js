// models/Subject.js
import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  faculties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  deptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, skipVersioning: true });

export default mongoose.model('Subject', subjectSchema);
