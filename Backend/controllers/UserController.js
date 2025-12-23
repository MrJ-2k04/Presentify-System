import { User, Faculty, DeptAdmin, OrgAdmin, SystemAdmin } from "../models/index.js";
import ResponseHandler from "../utils/ResponseHandler.js";
import Joi from "joi";
import bcrypt from 'bcryptjs';
import { ROLES, USER_ROLES_ARRAY } from "../utils/constants.js";

// CREATE USER
const create = async (req, res) => {
  const userSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid(...USER_ROLES_ARRAY).required(),
    organisationId: Joi.string().hex().length(24).when('role', { is: ROLES.SYSTEM_ADMIN, then: Joi.optional(), otherwise: Joi.required() }),
    departmentId: Joi.string().hex().length(24).when('role', { is: Joi.valid(ROLES.DEPT_ADMIN, ROLES.FACULTY), then: Joi.required(), otherwise: Joi.optional() }),
  });

  const { error, value } = userSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    return ResponseHandler.badRequest(res, error.details.map((d) => d.message).join(", "));
  }

  // Permission Check
  const requesterRole = req.user.role;
  const newRole = value.role;

  if (requesterRole === ROLES.ORG_ADMIN && ![ROLES.DEPT_ADMIN, ROLES.FACULTY].includes(newRole)) {
    return ResponseHandler.forbidden(res, "Org Admins can only create Dept Admins or Faculty");
  }
  if (requesterRole === ROLES.DEPT_ADMIN && newRole !== ROLES.FACULTY) {
    return ResponseHandler.forbidden(res, "Dept Admins can only create Faculty");
  } else if (requesterRole === ROLES.FACULTY) {
    return ResponseHandler.forbidden(res, "Faculty cannot create users");
  }

  try {
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) return ResponseHandler.badRequest(res, "User already exists");

    // RBAC Constraint: Only one System Admin allowed globally
    if (value.role === ROLES.SYSTEM_ADMIN) {
      const existingSystemAdmin = await SystemAdmin.findOne();
      if (existingSystemAdmin) {
        return ResponseHandler.forbidden(res, "A System Admin already exists. Only one System Admin is allowed.");
      }
    }

    // RBAC Constraint: Only one Org Admin per organization
    if (value.role === ROLES.ORG_ADMIN) {
      const existingOrgAdmin = await OrgAdmin.findOne({ organisationId: value.organisationId });
      if (existingOrgAdmin) {
        return ResponseHandler.forbidden(res, "An Organisation Admin already exists for this organisation. Only one Org Admin per organisation is allowed.");
      }
    }

    const hashedPassword = await bcrypt.hash(value.password, 10);
    const userData = { ...value, password: hashedPassword };

    let user;
    switch (value.role) {
      case ROLES.FACULTY:
        user = await Faculty.create(userData);
        break;
      case ROLES.DEPT_ADMIN:
        user = await DeptAdmin.create(userData);
        break;
      case ROLES.ORG_ADMIN:
        user = await OrgAdmin.create(userData);
        break;
      case ROLES.SYSTEM_ADMIN:
        user = await SystemAdmin.create(userData);
        break;
      default:
        return ResponseHandler.badRequest(res, "Invalid Role");
    }

    // Don't return password
    user.password = undefined;

    return ResponseHandler.success(res, user, "User created", 201);
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// GET ALL (Scoped)
const getAll = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organisationId = req.user.organisationId;
    } else if (req.user.role === ROLES.DEPT_ADMIN) {
      query.departmentId = req.user.departmentId;
    }
    // System Admin sees all

    const users = await User.find(query)
      .populate('organisationId', 'name')
      .populate('departmentId', 'name')
      .select('-password');
    return ResponseHandler.success(res, users);
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// GET BY ID
const getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return ResponseHandler.notFound(res, "User not found");
    return ResponseHandler.success(res, user);
  } catch (err) {
    return ResponseHandler.error(res, err);
  }
};

// UPDATE
const update = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return ResponseHandler.notFound(res, "User not found");
    return ResponseHandler.success(res, user, "User updated");
  } catch (err) {
    return ResponseHandler.error(res, err, 400);
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return ResponseHandler.notFound(res, "User not found");
    return ResponseHandler.success(res, null, "User deleted");
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
};
