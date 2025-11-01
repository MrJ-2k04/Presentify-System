

import ResponseHandler from "../utils/ResponseHandler.js";
import { idSchema } from "../utils/Validators.js";

function idValidator(req, res, next) {
    const { error } = idSchema.validate({ id: req.params.id });
    if (error) {
        return ResponseHandler.error(res, 'Invalid ID', 400);
    }
    next();
}

export default idValidator;
