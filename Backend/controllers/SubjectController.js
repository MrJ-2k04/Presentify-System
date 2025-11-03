import { Subject,Department,Teacher } from "../models/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import Joi from "joi";

// CREATE
const create = async (req, res) => {
  // Validate request body
  const subjectSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    deptId:Joi.string().trim().required(),
    teacherId: Joi.string().trim().required(),
    semester:Joi.number().required()
  });

  const { error, value } = subjectSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }

  // Use validated data
  const validatedData = value;

  try {
    const department = await Department.findById(validatedData.deptId);
    if (!department) {
      return ResponseHandler.notFound(res, "Invalid Department ID");
    }
    const teacher = await Teacher.findById(validatedData.teacherId);
    if (!teacher) {
      return ResponseHandler.notFound(res, "Invalid Teacher ID");
    }

    const subject = await Subject.create(validatedData);
    return ResponseHandler.success(
      res,
      subject,
      "Subject created successfully",
      201
    );
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// READ ALL
const getAll = async (req, res) => {
  try {
    const subjects = await Subject.find().populate("teacherId","-password").populate("deptId");
    return ResponseHandler.success(
      res,
      subjects,
      "Subjects retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// READ BY ID
const getById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate("teacherId","-password").populate("deptId");
    if (!subject) {
      return ResponseHandler.notFound(res, "Subject not found");
    }
    return ResponseHandler.success(
      res,
      subject,
      "Subject retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// UPDATE
const update = async (req, res) => {
  try {
    if (req.body.deptId) {
      return ResponseHandler.badRequest(res, "Department ID cannot be updated");
    }
    if (req.body.teacherId) {
      const teacherExists = await Teacher.findById(req.body.teacherId);
      if (!teacherExists) {
        return ResponseHandler.notFound(res, "Invalid Teacher ID");
      }
    }
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!subject) {
      return ResponseHandler.notFound(res, "Subject not found");
    }
    return ResponseHandler.success(
      res,
      subject,
      "Subject updated successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return ResponseHandler.notFound(res, "Subject not found");
    }
    return ResponseHandler.success(res, null, "Subject deleted successfully");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL
const removeAll = async (req, res) => {
  try {
    await Subject.deleteMany({});
    return ResponseHandler.success(res, null, "All subjects deleted");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

export default { create, getAll, getById, update, remove, removeAll };
