import bcrypt from "bcrypt";
import { Teacher } from "../models/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import Joi from "joi";

// CREATE
const create = async (req, res) => {
  // Validate request body
  const teacherSchema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s]+$/)
      .required(),

    email:Joi.string().email().required(),
    password:Joi.string()
                .min(6)
                .max(100)
                .pattern(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/)
                .message("Password must contain at least one uppercase letter, one special character, and be at least 6 characters long")
                .required()
  });

  const { error, value } = teacherSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }
  try {
    const existingTeacher = await Teacher.findOne({ email: value.email });
    if (existingTeacher) {
      return ResponseHandler.badRequest(res, "Email already registered");
    }
     const hashedPassword = await bcrypt.hash(value.password, 10);

    const teacher = await Teacher.create({
      name: value.name,
      email: value.email,
      password: hashedPassword
    });
    return ResponseHandler.success(res, teacher, "Teacher created", 201);
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// READ by ID
const getById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('-password');
    if (!teacher) return ResponseHandler.notFound(res, "Teacher not found");
    return ResponseHandler.success(res, teacher);
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// READ ALL
const getAll = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password');
    return ResponseHandler.success(res, teachers);
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// UPDATE
const update = async (req, res) => {
  try {
    if(req.body.password){
      req.body.password=await bcrypt.hash(req.body.password, 10);
    }
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select('-password');
    if (!teacher) return ResponseHandler.notFound(res, "Teacher not found");
    return ResponseHandler.success(res, teacher, "Teacher updated");
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const deleted = await Teacher.findByIdAndDelete(req.params.id);
    if (!deleted) return ResponseHandler.notFound(res, "Teacher not found");
    return ResponseHandler.success(res, null, "Teacher deleted");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL
const removeAll = async (req, res) => {
  try {
    await Teacher.deleteMany({});
    return ResponseHandler.success(res, null, "All teachers deleted");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

export default {
  create,
  getAll,
  getById,
  removeAll,
  update,
  remove,
};
