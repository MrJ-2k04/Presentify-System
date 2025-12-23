import express from 'express';
import { userController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticateUser);

// Create User (Restricted within controller, but we can add check here too)
router.post('/', userController.create);

router.get('/', userController.getAll);
router.get('/:id', idValidator, userController.getById);

// Update/Delete restricted
router.put('/:id', idValidator, authorizeRoles(ROLES.SYSTEM_ADMIN, ROLES.ORG_ADMIN, ROLES.DEPT_ADMIN), userController.update);
router.delete('/:id', idValidator, authorizeRoles(ROLES.SYSTEM_ADMIN, ROLES.ORG_ADMIN, ROLES.DEPT_ADMIN), userController.remove);

export default router;
