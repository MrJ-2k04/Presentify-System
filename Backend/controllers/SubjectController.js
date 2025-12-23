import { Subject, Department, User } from "../models/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import Joi from "joi";
import { ROLES } from "../utils/constants.js";

// CREATE
const create = async (req, res) => {
  // Only DEPT_ADMIN can create subjects
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can create subjects");
  }

  // Validate request body
  const subjectSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    facultyIds: Joi.array().items(Joi.string().trim().hex().length(24)).min(1).required(), // Array of Faculty IDs
    semester: Joi.number().required()
  });

  const { error, value } = subjectSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }

  try {
    const department = await Department.findById(req.user.departmentId);
    if (!department) {
      return ResponseHandler.notFound(res, "Invalid Department Session");
    }

    // Check if ALL Faculties exist and belong to the same department
    const faculties = await User.find({
      _id: { $in: value.facultyIds },
      role: ROLES.FACULTY,
      departmentId: req.user.departmentId
    });

    if (faculties.length !== value.facultyIds.length) {
      return ResponseHandler.notFound(res, "One or more Faculties are invalid or not in your Department");
    }

    const subjectData = {
      name: value.name,
      semester: value.semester,
      faculties: value.facultyIds, // Store array
      deptId: req.user.departmentId,
      isActive: true
    };

    const subject = await Subject.create(subjectData);
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
    let query = { isActive: true }; // Default to active subjects

    if (req.user.role === ROLES.DEPT_ADMIN) {
      query.deptId = req.user.departmentId;
    } else if (req.user.role === ROLES.FACULTY) {
      // Faculty sees subjects they are assigned to
      query.faculties = req.user.userId;
    }

    const subjects = await Subject.find(query)
      .populate("faculties", "name email") // Populate array
      .populate("deptId", "name");

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
    const subject = await Subject.findById(req.params.id)
      .populate("faculties", "name email")
      .populate("deptId", "name");

    if (!subject) {
      return ResponseHandler.notFound(res, "Subject not found");
    }

    // Check permissions
    if (req.user.role === ROLES.DEPT_ADMIN && subject.deptId._id.toString() !== req.user.departmentId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied");
    }

    if (req.user.role === ROLES.FACULTY) {
      // Check if faculty is in the list
      const isAssigned = subject.faculties.some(f => f._id.toString() === req.user.userId.toString());
      if (!isAssigned) {
        return ResponseHandler.forbidden(res, "Access denied: You are not assigned to this subject");
      }
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
  // Only DEPT_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can update subjects");
  }

  try {
    if (req.body.deptId) {
      return ResponseHandler.badRequest(res, "Department ID cannot be updated directly");
    }

    let updateData = { ...req.body };

    if (req.body.facultyIds) {
      const faculties = await User.find({
        _id: { $in: req.body.facultyIds },
        role: ROLES.FACULTY,
        departmentId: req.user.departmentId
      });

      if (faculties.length !== req.body.facultyIds.length) {
        return ResponseHandler.notFound(res, "One or more Faculties are invalid or not in your Department");
      }
      updateData.faculties = req.body.facultyIds;
      delete updateData.facultyIds; // Cleanup
    }

    const subject = await Subject.findByIdAndUpdate(req.params.id, updateData, {
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

// DELETE (Soft Delete)
const remove = async (req, res) => {
  // Only DEPT_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can delete subjects");
  }

  try {
    // Soft Delete: Set isActive to false
    const subject = await Subject.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

    if (!subject) {
      return ResponseHandler.notFound(res, "Subject not found");
    }
    return ResponseHandler.success(res, null, "Subject archived successfully");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL (Soft Delete All for Dept)
const removeAll = async (req, res) => {
  // Only DEPT_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Dept Admins can delete subjects");
  }

  try {
    await Subject.updateMany({ deptId: req.user.departmentId }, { isActive: false });
    return ResponseHandler.success(res, null, "All subjects archived");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

export default { create, getAll, getById, update, remove, removeAll };
