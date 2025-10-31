import Joi from "joi";
import ResponseHandler from "../utils/ResponseHandler.js";
import { Organisation } from "../models/index.js";
import { get } from "mongoose";



// CREATE

const create=async(req,res)=>{
    const organisationSchema=Joi.object({
        name:Joi.string().trim().required(),
        address:Joi.string().trim().required(),
        website:Joi.string().uri().required(),
        contact: Joi.string()
            .pattern(/^[6-9]\d{9}$/) 

    });

    const {error,value}=organisationSchema.validate(req.body,{
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        return ResponseHandler.badRequest(res, errorMessages.join(", "));
    }

    const validatedData=value;
    const existing=await Organisation.findOne({contact:validatedData.contact});
    if(existing){
         return ResponseHandler.badRequest(res, "Contact number already exists");
    }

    try{
        const organisation=await Organisation.create(validatedData);
        return ResponseHandler.success(res,organisation,"Organisation created",201);
    }
    catch(err){
        return ResponseHandler.error(res,err,400);
    }
};


// READ ALL

const getAll=async(req,res)=>{
    try{
        const organisations=await Organisation.find();
        return ResponseHandler.success(
            res,
            organisations,
            "Organisations retrieved successfully"
        );
    }
    catch(err){
        return ResponseHandler.error(res,err);
    }
};

// READ BY ID

const getById=async(req,res)=>{
    try{
        const organisation=await Organisation.findById(req.params.id);
        if(!organisation){
            return ResponseHandler.notFound(res,"Organisation not found");

        }
        return ResponseHandler.success(
            res,
            organisation,
            "Organisation retrieved successfully"
        );
    }
    catch(err){
        return ResponseHandler.error(res,err);
    }
};

// UPDATE

const update=async (req,res)=>{
    try{
        const organisation=await Organisation.findByIdAndUpdate(req.params.id,req.body,{
            new:true,
        });

        if (! organisation){
            return ResponseHandler.notFound(res,"Organisation not found");
        }
        return ResponseHandler.success(
            res,
            organisation,
            "Organisation updated successfully"
        );
    }
    catch(err){
         return ResponseHandler.error(res, err, 400);
    }
};

// DELETE

const remove=async(req,res)=>{
    try{
        const deleted=await Organisation.findByIdAndDelete(req.params.id);
        if(!deleted){
            return ResponseHandler.notFound(res,"Organisation not found");
        }
        return ResponseHandler.success(res,null,"Organisation deleted successfully");
    }
    catch (err) {
        return ResponseHandler.error(res, err);
    }
};

// DELETE ALL
const removeAll=async(req,res)=>{
    try{
        await Organisation.deleteMany({});
        return ResponseHandler.success(res,null,"All organisations deleted");
    }
    catch(err){
        return ResponseHandler.error(res,err);
    }
};

export default{
    create,
    getAll,
    getById,
    update,
    remove,
    removeAll,
}