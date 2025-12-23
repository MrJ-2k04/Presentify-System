import express from 'express';
import { getSystemAdminStats, getOrgAdminStats, getDeptAdminStats, getFacultyStats } from '../controllers/DashboardController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/system-admin', authenticateUser, authorizeRoles('SYSTEM_ADMIN'), getSystemAdminStats);
router.get('/org-admin', authenticateUser, authorizeRoles('ORG_ADMIN'), getOrgAdminStats);
router.get('/dept-admin', authenticateUser, authorizeRoles('DEPT_ADMIN'), getDeptAdminStats);
router.get('/faculty', authenticateUser, authorizeRoles('FACULTY'), getFacultyStats);

export default router;
