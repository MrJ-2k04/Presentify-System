import AWS from "aws-sdk";
import Joi from "joi";
import path from "path";
import { AWS_CONFIG } from "../config.js";
import { Lecture, Student, Subject } from "../models/index.js";
import { verifyAttendance } from "../services/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import { ROLES } from "../utils/constants.js";
import fs from "fs";

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: AWS_CONFIG.accessKeyId,
  secretAccessKey: AWS_CONFIG.secretAccessKey,
  region: AWS_CONFIG.region,
});

// CREATE
const create = async (req, res) => {
  const startTime = Date.now();
  // Validate request body
  const lectureSchema = Joi.object({
    subjectId: Joi.string().trim().required(),
    division: Joi.string().trim().length(1).required(),
    attendance: Joi.array()
      .items(
        Joi.object({
          rollNumber: Joi.string().trim().required(),
          present: Joi.boolean().default(true),
        })
      )
      .optional()
      .default([]),
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
    batch: Joi.string().trim().optional(),
  });

  const { error, value } = lectureSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }

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
  let lecture;
  try {
    // Create lecture with validated data
    lecture = await Lecture.create(value);
    const subjectId = value.subjectId;

    // Get subject to know the correct department
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return ResponseHandler.notFound(res, "Subject not found");
    }

    for (const file of req.files) {
      const extension = path.extname(file.originalname).toLowerCase();
      const fileName = `${Date.now()}${extension}`;
      const params = {
        Bucket: AWS_CONFIG.bucketName,
        Key: `lectures/${subjectId}/${lecture.id}/images/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const s3Response = await s3.upload(params).promise();

      uploadedImages.push({
        fileName: file.originalname,
        fileSize: file.size,
        key: s3Response.Key,
        url: s3Response.Location,
        uploadedAt: new Date(),
      });
      files.push({
        originalname: fileName,
        buffer: file.buffer,
      });
    }
    lecture.images = uploadedImages;

    // Get student embeddings scoped to the subject's department
    const studentQuery = {
      division: value.division,
      deptId: subject.deptId
    };
    if (value.batch) {
      studentQuery.batch = value.batch;
    }

    const studentEmbeddings = await Student.find(
      studentQuery,
      { embeddings: 1, rollNumber: 1 }
    );

    // Call external API for attendance verification
    const apiResponse = await verifyAttendance({
      images: files,
      studentEmbeddings: studentEmbeddings,
      subjectId: value.subjectId,
      lectureId: lecture.id,
    });

    // Update attendance from AI results
    if (apiResponse.data && apiResponse.data.results) {
      const presentRollNumbers = apiResponse.data.results.reduce(
        (acc, cur) => acc.concat(cur.matchedIds),
        []
      );

      // Save attendance
      lecture.attendance = studentEmbeddings.map((student) => ({
        rollNumber: student.rollNumber,
        present: presentRollNumbers.includes(student.rollNumber),
      }));

      // Save annotated images
      lecture.annotatedImages = apiResponse.data.results.map((result) => ({
        fileName: result.fileName,
        fileSize: result.fileSize,
        key: result.key,
        url: result.url,
      }));
    }

    // Save lecture
    await lecture.save();
    const endTime = Date.now();
    console.log(`Lecture creation time: ${endTime - startTime} ms or ${(endTime - startTime) / 1000} seconds`);
    return ResponseHandler.success(
      res,
      lecture,
      "Lecture created successfully",
      201
    );
  } catch (err) {
    // Clean up: delete lecture if it was created
    if (lecture && lecture.id) {
      try {
        await Lecture.findByIdAndDelete(lecture.id);
      } catch (deleteError) {
        console.error("Error deleting lecture during cleanup:", deleteError);
      }
    }

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
      new Error(err.message || "Failed to create lecture"),
      400
    );
  }

};

// READ ALL
const getAll = async (req, res) => {
  try {
    let query = {};

    // Role-based filtering
    if (req.user.role === ROLES.DEPT_ADMIN) {
      // Find subjects in their department
      const subjects = await Subject.find({ deptId: req.user.departmentId }).select('_id');
      const subjectIds = subjects.map(s => s._id);
      query.subjectId = { $in: subjectIds };
    } else if (req.user.role === ROLES.FACULTY) {
      // Find subjects assigned to this faculty
      const subjects = await Subject.find({ faculties: req.user.userId }).select('_id');
      const subjectIds = subjects.map(s => s._id);
      query.subjectId = { $in: subjectIds };
    }

    // Optional Query Filters
    if (req.query.subjectId) {
      query.subjectId = req.query.subjectId;
    }

    if (req.query.date) {
      const startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const lectures = await Lecture.find(query)
      .populate({ path: "subjectId", populate: { path: "deptId", select: "name" } })
      .sort({ createdAt: -1 });

    return ResponseHandler.success(
      res,
      lectures,
      "Lectures retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// READ BY ID
const getById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate({ path: "subjectId" })
      .populate({ path: "attendance.studentId", strictPopulate: false });
    if (!lecture) {
      return ResponseHandler.notFound(res, "Lecture not found");
    }
    return ResponseHandler.success(
      res,
      lecture,
      "Lecture retrieved successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// UPDATE
const update = async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!lecture) {
      return ResponseHandler.notFound(res, "Lecture not found");
    }
    return ResponseHandler.success(
      res,
      lecture,
      "Lecture updated successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return ResponseHandler.notFound(res, "Lecture not found");
    }

    // Delete associated images and annotated images from S3
    const imageKeys = [
      ...(lecture.images || []).map((image) => image.key),
      ...(lecture.annotatedImages || []).map((image) => image.key)
    ];

    if (imageKeys.length > 0) {
      try {
        await Promise.all(
          imageKeys.map((key) =>
            s3
              .deleteObject({
                Bucket: AWS_CONFIG.bucketName,
                Key: key,
              })
              .promise()
          )
        );
      } catch (deleteError) {
        console.error("Error deleting S3 files:", deleteError);
        // Continue with lecture deletion even if S3 cleanup fails
      }
    }

    await Lecture.findByIdAndDelete(req.params.id);
    return ResponseHandler.success(res, null, "Lecture deleted successfully");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// GENERATE ATTENDANCE
const generateAttendance = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return ResponseHandler.notFound(res, "Lecture not found");
    }

    // Simulate attendance marking (can add face recognition logic later)
    lecture.present = lecture.images?.length > 0 ? true : false;

    await lecture.save();
    return ResponseHandler.success(
      res,
      lecture,
      "Attendance generated successfully"
    );
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL
const removeAll = async (req, res) => {
  try {
    // Fetch all lectures to get their images
    const lectures = await Lecture.find({});

    // Collect all image keys from all lectures
    const allImageKeys = lectures
      .filter((lecture) => lecture.images && lecture.images.length > 0)
      .flatMap((lecture) => lecture.images.map((image) => image.key));

    // Delete all images from S3
    if (allImageKeys.length > 0) {
      try {
        await Promise.all(
          allImageKeys.map((key) =>
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
        // Continue with lecture deletion even if S3 cleanup fails
      }
    }

    await Lecture.deleteMany({});
    return ResponseHandler.success(res, null, "All lectures deleted");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  generateAttendance,
  removeAll,
};
