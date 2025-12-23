import express from 'express';
import { subjectController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/', authorizeRoles(ROLES.DEPT_ADMIN), subjectController.create);
router.get('/', subjectController.getAll);
router.get('/:id', idValidator, subjectController.getById);
router.put('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), subjectController.update);
router.delete('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), subjectController.remove);
router.delete('/', authorizeRoles(ROLES.DEPT_ADMIN), subjectController.removeAll);

export default router;
