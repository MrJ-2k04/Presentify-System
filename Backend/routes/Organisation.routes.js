import express from 'express';
import { organisationController } from '../controllers/index.js';
import idValidator from '../middlewares/idValidator.js';

const router=express.Router();

router.post('/',organisationController.create);
router.get('/',organisationController.getAll);
router.get('/:id',idValidator,organisationController.getById);
router.put('/:id',idValidator,organisationController.update);
router.delete('/:id',idValidator,organisationController.remove);
router.delete('/',organisationController.removeAll)

export default router;