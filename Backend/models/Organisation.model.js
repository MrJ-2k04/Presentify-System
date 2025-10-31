import mongoose from "mongoose";

const organisationSchema=new mongoose.Schema({
    name:{type:String,required:true},
    address:{type:String,required:true},
    website:{type:String,required:true},
    contact:{type:Number, unique: true,required:true},
},{ timestamps: true, skipVersioning: true });


export default mongoose.model('Organisation',organisationSchema);