import express from 'express';
import { organisationController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(authenticateUser);

// All Organisation Routes Restricted to System Admin
router.use(authorizeRoles(ROLES.SYSTEM_ADMIN));

router.post('/', organisationController.create);
router.get('/', organisationController.getAll);
router.get('/:id', idValidator, organisationController.getById);
router.put('/:id', idValidator, organisationController.update);
router.delete('/:id', idValidator, organisationController.remove);
router.delete('/', organisationController.removeAll)

export default router;