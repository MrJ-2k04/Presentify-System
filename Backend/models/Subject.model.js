// models/Subject.js
import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  deptId:{type:mongoose.Schema.Types.ObjectId,ref:'Department',required:true},
  semester:{type:Number,required:true},
}, { timestamps: true, skipVersioning: true });

export default mongoose.model('Subject', subjectSchema);
