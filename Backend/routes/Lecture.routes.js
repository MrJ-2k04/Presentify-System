import express from 'express';
import { lectureController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/', authorizeRoles(ROLES.FACULTY, ROLES.DEPT_ADMIN), upload.array('images'), lectureController.create);
router.get('/', lectureController.getAll);
router.get('/:id', idValidator, lectureController.getById);

router.put('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), lectureController.update);
router.delete('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), lectureController.remove);
router.post('/:id/generate', idValidator, authorizeRoles(ROLES.FACULTY, ROLES.DEPT_ADMIN), lectureController.generateAttendance);
router.delete('/', authorizeRoles(ROLES.DEPT_ADMIN), lectureController.removeAll);

export default router;
