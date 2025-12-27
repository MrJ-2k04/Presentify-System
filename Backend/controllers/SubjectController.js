import { Subject, Department, User } from "../models/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import Joi from "joi";
import { ROLES } from "../utils/constants.js";

// CREATE
const create = async (req, res) => {
  // Allow DEPT_ADMIN and ORG_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN && req.user.role !== ROLES.ORG_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Admins can create subjects");
  }

  // Validate request body
  const subjectSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    facultyIds: Joi.array().items(Joi.string().trim().hex().length(24)).min(1).required(), // Array of Faculty IDs
    semester: Joi.number().required(),
    deptId: Joi.string().hex().length(24).when('$role', { is: ROLES.ORG_ADMIN, then: Joi.required(), otherwise: Joi.optional() })
  });

  const { error, value } = subjectSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    context: { role: req.user.role }
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return ResponseHandler.badRequest(res, errorMessages.join(", "));
  }

  try {
    const targetDeptId = req.user.role === ROLES.DEPT_ADMIN ? req.user.departmentId : value.deptId;

    // Verify the department exists and belongs to the user's organisation
    const department = await Department.findOne({ _id: targetDeptId, organisationId: req.user.organisationId });
    if (!department) {
      return ResponseHandler.forbidden(res, "Invalid Department for your Organisation");
    }

    // Check if ALL Faculties exist and belong to the same organisation
    const faculties = await User.find({
      _id: { $in: value.facultyIds },
      role: ROLES.FACULTY,
      organisationId: req.user.organisationId
    });

    if (faculties.length !== value.facultyIds.length) {
      return ResponseHandler.notFound(res, "One or more Faculties are invalid or not in your Department");
    }

    const subjectData = {
      name: value.name,
      semester: value.semester,
      faculties: value.facultyIds, // Store array
      deptId: targetDeptId,
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
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      // Find all departments in this organisation
      const departments = await Department.find({ organisationId: req.user.organisationId }).select('_id');
      const deptIds = departments.map(d => d._id);
      query.deptId = { $in: deptIds };
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

    if (req.user.role === ROLES.ORG_ADMIN) {
      // Verify department belongs to Org Admin's organisation
      const dept = await Department.findById(subject.deptId._id);
      if (dept.organisationId.toString() !== req.user.organisationId.toString()) {
        return ResponseHandler.forbidden(res, "Access denied: Subject not in your Organisation");
      }
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
  // Allow DEPT_ADMIN and ORG_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN && req.user.role !== ROLES.ORG_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Admins can update subjects");
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
        organisationId: req.user.organisationId
      });

      if (faculties.length !== req.body.facultyIds.length) {
        return ResponseHandler.notFound(res, "One or more Faculties are invalid or not in your Department");
      }
      updateData.faculties = req.body.facultyIds;
      delete updateData.facultyIds; // Cleanup
    }

    const subjectBeforeUpdate = await Subject.findById(req.params.id).populate('deptId');
    if (!subjectBeforeUpdate) return ResponseHandler.notFound(res, "Subject not found");

    // Permission Check
    if (req.user.role === ROLES.DEPT_ADMIN && subjectBeforeUpdate.deptId._id.toString() !== req.user.departmentId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied: Subject not in your Department");
    }
    if (req.user.role === ROLES.ORG_ADMIN && subjectBeforeUpdate.deptId.organisationId.toString() !== req.user.organisationId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied: Subject not in your Organisation");
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
  // Allow DEPT_ADMIN and ORG_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN && req.user.role !== ROLES.ORG_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Admins can delete subjects");
  }

  try {
    const subjectCheck = await Subject.findById(req.params.id).populate('deptId');
    if (!subjectCheck) return ResponseHandler.notFound(res, "Subject not found");

    if (req.user.role === ROLES.DEPT_ADMIN && subjectCheck.deptId._id.toString() !== req.user.departmentId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied");
    }
    if (req.user.role === ROLES.ORG_ADMIN && subjectCheck.deptId.organisationId.toString() !== req.user.organisationId.toString()) {
      return ResponseHandler.forbidden(res, "Access denied");
    }

    // Soft Delete: Set isActive to false
    const subject = await Subject.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    return ResponseHandler.success(res, null, "Subject archived successfully");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// DELETE ALL (Soft Delete All for Dept)
const removeAll = async (req, res) => {
  // Allow DEPT_ADMIN and ORG_ADMIN
  if (req.user.role !== ROLES.DEPT_ADMIN && req.user.role !== ROLES.ORG_ADMIN) {
    return ResponseHandler.forbidden(res, "Only Admins can delete subjects");
  }

  try {
    let query = { isActive: true };
    if (req.user.role === ROLES.DEPT_ADMIN) {
      query.deptId = req.user.departmentId;
    } else if (req.user.role === ROLES.ORG_ADMIN) {
      const departments = await Department.find({ organisationId: req.user.organisationId }).select('_id');
      query.deptId = { $in: departments.map(d => d._id) };
    }

    await Subject.updateMany(query, { isActive: false });
    return ResponseHandler.success(res, null, "All subjects archived");
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

export default { create, getAll, getById, update, remove, removeAll };
