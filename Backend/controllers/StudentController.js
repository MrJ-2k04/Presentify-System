import AWS from "aws-sdk";
import Joi from "joi";
import path from "path";
import { AWS_CONFIG } from "../config.js";
import { Student, Department } from "../models/index.js";
import { generateEmbeddings } from "../services/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import { ROLES } from "../utils/constants.js";

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: AWS_CONFIG.accessKeyId,
  secretAccessKey: AWS_CONFIG.secretAccessKey,
  region: AWS_CONFIG.region,
});

// CREATE
const create = async (req, res) => {
  // Permission Check: only DEPT_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can create students");
  }

  // Validate request body
  const StudentSchema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s]+$/)
      .required(),

    rollNumber: Joi.string().trim().alphanum().min(1).max(20).required(),

    division: Joi.string().trim().min(1).max(10).required(),

    semester: Joi.number().required(),
    batch: Joi.string().optional(), // Added Batch

    images: Joi.array()
      .items(
        Joi.object({
          fileName: Joi.string().required(),
          fileSize: Joi.number().positive().required(),
          key: Joi.string().required(),
          url: Joi.string().uri().optional(),
          uploadedAt: Joi.date().default(Date.now),
        })
      )
      .optional()
      .default([]),
  });

  const { error, value } = StudentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }

  // Attach Dept ID from User
  const deptId = req.user.departmentId;
  const studentData = {
    ...value,
    deptId: deptId // Enforce Department ID from logged-in user
  };


  // Check if files are provided
  if (!req.files || req.files.length === 0) {
    return ResponseHandler.badRequest(res, "At least one image is required");
  }

  // Validate file types (only images allowed)
  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  for (const file of req.files) {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return ResponseHandler.badRequest(
        res,
        `Invalid file type: ${extension}. Only image files are allowed.`
      );
    }

    if (file.size > maxFileSize) {
      return ResponseHandler.badRequest(
        res,
        `File ${file.originalname} is too large. Maximum size is 50MB.`
      );
    }
  }

  const uploadedImages = [];
  const files = [];
  try {
    for (const file of req.files) {
      const extension = path.extname(file.originalname).toLowerCase();
      const fileName = `${Date.now()}${extension}`;
      const params = {
        Bucket: AWS_CONFIG.bucketName,
        Key: `students/${value.rollNumber}/${fileName}`,
        Body: file.buffer,
      };

      const s3Response = await s3.upload(params).promise();
      const uploadedImage = {
        fileName: file.originalname,
        fileSize: file.size,
        key: s3Response.Key,
        url: s3Response.Location,
        uploadedAt: new Date(),
      }

      uploadedImages.push(uploadedImage);
      files.push({
        originalname: fileName,
        buffer: file.buffer
      })
    }

    const finalStudentData = {
      ...studentData,
      images: uploadedImages,
    };

    const student = await Student.create(finalStudentData);

    // Call external API to generate embeddings
    try {
      const apiResponse = await generateEmbeddings(files);
      if (apiResponse.data.embeddings) {
        student.embeddings = apiResponse.data.embeddings;
        await student.save();
      }
    } catch (embeddingError) {
      console.error("Embedding generation failed:", embeddingError);
      // We still return success as student is created, but maybe log this better.
    }


    return ResponseHandler.success(
      res,
      student,
      "Student created successfully",
      201
    );
  } catch (err) {
    // Delete uploaded files from S3 in case of error
    if (uploadedImages.length > 0) {
      try {
        await Promise.all(
          uploadedImages.map((image) =>
            s3
              .deleteObject({
                Bucket: AWS_CONFIG.bucketName,
                Key: image.key,
              })
              .promise()
          )
        );
      } catch (deleteError) {
        console.error("Error deleting uploaded files:", deleteError);
      }
    }

    return ResponseHandler.error(
      res,
      new Error(err.message || "Failed to create student"),
      400
    );
  }
};

// READ ALL
const getAll = async (req, res) => {
  try {
    let query = {};
    const { role, departmentId } = req.user;

    // Scoping
    if (role === ROLES.DEPT_ADMIN || role === ROLES.FACULTY) {
      query.deptId = departmentId;
    }
    // Filter active students only? Maybe not, keep alumni separate via query param if needed.
    // Default to active students if not specified? 
    // Let's add simple support for query params
    if (req.query.division) query.division = req.query.division;
    if (req.query.batch) query.batch = req.query.batch;
    if (req.query.semester) query.semester = req.query.semester;

    // By default hide Alumni unless requested?
    if (req.query.isAlumni === 'true') {
      query.isAlumni = true;
    } else {
      query.isAlumni = false;
    }

    const students = await Student.find(query).select("-images.url");
    return ResponseHandler.success(
      res,
      students,
      "Students retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// READ BY ID
const getById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("-images.url");
    if (!student) {
      return ResponseHandler.notFound(res, "Student not found");
    }
    // Check permission logic if needed
    if ([ROLES.DEPT_ADMIN, ROLES.FACULTY].includes(req.user.role) &&
      student.deptId.toString() !== req.user.departmentId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied to student from another department");
    }

    return ResponseHandler.success(
      res,
      student,
      "Student retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// UPDATE
const update = async (req, res) => {
  // Only Dept Admin
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can update students");
  }

  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!student) {
      return ResponseHandler.notFound(res, "Student not found");
    }
    return ResponseHandler.success(
      res,
      student,
      "Student updated successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE
const remove = async (req, res) => {
  // Only Dept Admin
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can delete students");
  }

  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return ResponseHandler.notFound(res, "Student not found");
    }

    // Delete associated images from S3
    if (student.images && student.images.length > 0) {
      try {
        await Promise.all(
          student.images.map((image) =>
            s3
              .deleteObject({
                Bucket: AWS_CONFIG.bucketName,
                Key: image.key,
              })
              .promise()
          )
        );
      } catch (deleteError) {
        console.error("Error deleting S3 files:", deleteError);
        // Continue with student deletion even if S3 cleanup fails
      }
    }

    await Student.findByIdAndDelete(req.params.id);
    return ResponseHandler.success(res, null, "Student deleted successfully");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL
const removeAll = async (req, res) => {
  // Only Dept Admin
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can delete all students");
  }

  try {
    // Fetch all students to get their images - Scoped to Department
    const students = await Student.find({ deptId: req.user.departmentId });

    // Collect all image keys from all students
    const allImageKeys = students
      .filter(student => student.images && student.images.length > 0)
      .flatMap(student => student.images.map(image => image.key));

    // Delete all images from S3
    if (allImageKeys.length > 0) {
      try {
        await Promise.all(
          allImageKeys.map(key =>
            s3
              .deleteObject({
                Bucket: AWS_CONFIG.bucketName,
                Key: key,
              })
              .promise()
          )
        );
      } catch (deleteError) {
        console.error("Error deleting S3 files during removeAll:", deleteError);
        // Continue with student deletion even if S3 cleanup fails
      }
    }

    await Student.deleteMany({ deptId: req.user.departmentId });
    return ResponseHandler.success(res, null, "All students from department deleted");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// PROMOTE STUDENTS
const promoteStudents = async (req, res) => {
  // Only Dept Admin
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can promote students");
  }

  const departmentId = req.user.departmentId;

  try {
    // Find Department to get totalSemesters
    const department = await Department.findById(departmentId);
    if (!department) return ResponseHandler.badRequest(res, "Department not found");

    const totalSemesters = department.totalSemesters; // e.g., 8

    // Logic:
    // 1. Increment semester for all active students in this Dept.
    // 2. If new semester > totalSemesters, set isAlumni = true.

    // We can do this using bulkWrite for efficiency or a simple loop if items are low.
    // Mongoose updateMany helps, but the conditional "if > total" is tricky in one go without aggregation pipeline updates (MongoDB 4.2+).
    // Let's assume standard update logic.

    // Get all active students
    const students = await Student.find({ deptId: departmentId, isAlumni: false });

    const bulkOps = students.map(student => {
      const nextSem = student.semester + 1;
      const isAlumni = nextSem > totalSemesters;
      return {
        updateOne: {
          filter: { _id: student._id },
          update: {
            semester: nextSem,
            isAlumni: isAlumni
          }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    return ResponseHandler.success(res, { promotedCount: bulkOps.length }, "Students promoted successfully");

  } catch (err) {
    return ResponseHandler.error(res, err);
  }
}

export default { create, getAll, getById, update, remove, removeAll, promoteStudents };
