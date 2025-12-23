import express from 'express';
import { departmentController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/', authorizeRoles(ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN), departmentController.create);
router.get('/', departmentController.getAllDepartment);
router.get('/:id', idValidator, departmentController.getDepartment);
router.get('/organisation/:organisationId', departmentController.getAllByOrganisation);

router.put('/:id', idValidator, authorizeRoles(ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN), departmentController.update);
router.delete('/:id', idValidator, authorizeRoles(ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN), departmentController.remove);
router.delete('/', authorizeRoles(ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN), departmentController.removeAll);
router.delete('/organisation/:organisationId', authorizeRoles(ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN), departmentController.removeByOrganisation);
export default router;