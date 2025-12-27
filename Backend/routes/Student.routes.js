import express from 'express';
import { studentController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/', authorizeRoles(ROLES.DEPT_ADMIN), upload.array('images'), studentController.create);
router.post('/promote', authorizeRoles(ROLES.DEPT_ADMIN), studentController.promoteStudents); // New Endpoint

router.get('/options', studentController.getOptions);
router.get('/', studentController.getAll);
router.get('/:id', idValidator, studentController.getById);
router.put('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), studentController.update);
router.delete('/:id', idValidator, authorizeRoles(ROLES.DEPT_ADMIN), studentController.remove);
router.delete('/', authorizeRoles(ROLES.DEPT_ADMIN), studentController.removeAll);

export default router;
