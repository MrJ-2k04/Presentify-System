// models/Student.js
import mongoose from 'mongoose';
import { imageSchema } from './OtherModels.js';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  division: { type: String, required: true },
  email: { type: String, require: true },
  embeddings: {
    type: [
      {
        _id: false, // disable _id for each embedding object
        image: { type: String, required: true },
        embedding: { type: [Number], required: true },
      }
    ],
    default: undefined // make the embeddings array itself optional
  },
  images: [imageSchema],
  deptId: { type: mongoose.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: Number, required: true },
  batch: { type: String }, // e.g., "A1", "B2"
  isAlumni: { type: Boolean, default: false }
}, { timestamps: true, skipVersioning: true });

export default mongoose.model('Student', studentSchema);

