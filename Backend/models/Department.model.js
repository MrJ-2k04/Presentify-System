import mongoose from "mongoose";



const departmentSchema=new mongoose.Schema({
    name:{type:String,required:true},
    organisationId:{type:mongoose.Schema.ObjectId,ref:'Organisation',required:true},
    totalSemesters:{type:Number,required:true}
},{ timestamps: true, skipVersioning: true });

export default mongoose.model('Department',departmentSchema);