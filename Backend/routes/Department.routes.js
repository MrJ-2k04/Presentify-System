import express from 'express';
import { departmentController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';

const router=express.Router();

router.post('/',departmentController.create);
router.get('/',departmentController.getAllDepartment);
router.get('/:id',idValidator,departmentController.getDepartment);
router.get('/organisation/:organisationId',departmentController.getAllByOrganisation);
router.put('/:id',idValidator,departmentController.update);
router.delete('/:id',idValidator,departmentController.remove);
router.delete('/',departmentController.removeAll);
router.delete('/organisation/:organisationId',departmentController.removeByOrganisation);
export default router;