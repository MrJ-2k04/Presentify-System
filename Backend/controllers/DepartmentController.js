import Joi from "joi";
import ResponseHandler from "../utils/ResponseHandler.js";
import { Department,Organisation } from "../models/index.js";
import mongoose from "mongoose";

// CREATE


const create=async(req,res)=>{
    const departmentSchema=Joi.object({
        name:Joi.string()
            .trim()
            .min(2)
            .max(100)
            .pattern(/^[a-zA-Z\s]+$/)
            .required(),
        organisationId:Joi.string().trim().required(),
        totalSemesters:Joi.number().positive().required()
    });

    const { error, value } = departmentSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        return ResponseHandler.badRequest(res, errorMessages.join(", "));
    }

    try{
        const organisation = await Organisation.findById(value.organisationId);
        if (!organisation) {
            return ResponseHandler.badRequest(res, "Organisation not found");
        }
        const existingDepartment = await Department.findOne({
            name: value.name,
            organisationId: value.organisationId,
        });

        if(existingDepartment){
            return ResponseHandler.badRequest(
                res,
                "Department already exists in this organisation"
            );
        }
        const department=await Department.create(value);
        return ResponseHandler.success(res,department,"Department created successfully",201);

    }
    catch(err){
        return ResponseHandler.error(res,err,400);
    }
}

//  READ ALL BY ORGANISATION ID

const getAllByOrganisation=async(req,res)=>{
    try{
        const {organisationId} = req.params;
        if (!organisationId || !mongoose.Types.ObjectId.isValid(organisationId)) {
            return ResponseHandler.badRequest(res, "Organisation ID is required");
        }
        const organisation = await Organisation.findById(organisationId);
        if (!organisation) {
            return ResponseHandler.badRequest(res, "Organisation not found");
        }
        const departments = await Department.find({ organisationId });
        if (departments.length === 0) {
            return ResponseHandler.success(
                res,
                [],
                "No departments found for this organisation"
            );
        }
        return ResponseHandler.success(
            res,
            departments,
            "Departments retrieved successfully"
         );
    } 

    catch (err) {
        return ResponseHandler.error(res, err);
    }
}

// READ ALL DEPARTMENT

const getAllDepartment=async(req,res)=>{
    try{
        const departments = await Department.find();
        if (!departments || departments.length === 0) {
            return ResponseHandler.success(
                res,
                [],
                "No departments found"
            );
        }
        return ResponseHandler.success(
            res,
            departments,
            "Departments retrieved successfully"
        );
    }  
    catch (err) {
        return ResponseHandler.error(res, err);
    }
}

// READ BY ID

const getDepartment=async(req,res)=>{
    try{

        const department=await Department.findById(req.params.id);
        if(!department){
            return ResponseHandler.notFound(res,"Department not found");

        }
        return ResponseHandler.success(
            res,
            department,
            "Department retrieved successfully"
        );
    }
     catch(err){
        return ResponseHandler.error(res,err);
    }
}

// UPDATE

const update=async(req,res)=>{
    try{
        const existingDepartment = await Department.findById(req.params.id);
        if (!existingDepartment) {
            return ResponseHandler.notFound(res, "Department not found");
        }

        if (
            req.body.organisationId &&
            req.body.organisationId !== existingDepartment.organisationId.toString()
        ) {
            return ResponseHandler.badRequest(
                res,
                "Organisation ID cannot be changed"
            );
        }

        const department=await Department.findByIdAndUpdate(req.params.id,
            {name:req.body.name,totalSemesters:req.body.totalSemesters},{
            new:true,
        });

       
        return ResponseHandler.success(
                    res,
                    department,
                    "Department updated successfully"
        );
    }
    catch(err){
             return ResponseHandler.error(res, err, 400);
    }
}

// DELETE BY ID

const remove=async(req,res)=>{
    try{
        const deleted=await Department.findByIdAndDelete(req.params.id);
        if(!deleted){
            return ResponseHandler.notFound(res,"Department not found");
        }
        return ResponseHandler.success(res,null,"Department deleted successfully");
    }
    catch(err){
        return ResponseHandler.error(res, err);
    }
}

// DELETE ALL
const removeAll=async(req,res)=>{
    try{
        await Department.deleteMany({});
        return ResponseHandler.success(res,null,"All Departments deleted");
    }
    catch(err){
        return ResponseHandler.error(res,err);
    }
};

// DELETE DEPARTMENT BY ORGANISATION ID

const removeByOrganisation=async(req,res)=>{
    try{
        const { organisationId } = req.params;
        if (!organisationId || !mongoose.Types.ObjectId.isValid(organisationId)) {
            return ResponseHandler.badRequest(res, "Invalid Organisation ID");
        }

        const organisation = await Organisation.findById(organisationId);
        if (!organisation) {
            return ResponseHandler.notFound(res, "Organisation not found");
        }
         const result = await Department.deleteMany({ organisationId });

        if (result.deletedCount === 0) {
            return ResponseHandler.success(
                res,
                [],
                "No departments found for this organisation"
            );
        }
        return ResponseHandler.success(
            res,
            null,
            `${result.deletedCount} department(s) deleted successfully`
        );
    }
    catch(err){
        return ResponseHandler.error(res, err);
    }
}

export default{
    create,
    getAllByOrganisation,
    getAllDepartment,
    getDepartment,
    update,
    remove,
    removeAll,
    removeByOrganisation
}