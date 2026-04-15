"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMultiple = exports.validate = void 0;
const zod_1 = require("zod");
const error_response_1 = require("../utils/error.response");
/**
 * Middleware để validate request body, query, params sử dụng Zod schema
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const dataToValidate = req[source];
            const validatedData = schema.parse(dataToValidate);
            // Gán lại data đã được validate
            req[source] = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                const errorMessage = errorMessages
                    .map((e) => `${e.field}: ${e.message}`)
                    .join('; ');
                next(new error_response_1.AppError(400, errorMessage));
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate = validate;
/**
 * Middleware để validate nhiều nguồn dữ liệu cùng lúc
 */
const validateMultiple = (schemas) => {
    return (req, res, next) => {
        try {
            const errors = [];
            if (schemas.body) {
                const result = schemas.body.safeParse(req.body);
                if (!result.success) {
                    errors.push(...result.error.issues.map((e) => `body.${e.path.join('.')}: ${e.message}`));
                }
                else {
                    req.body = result.data;
                }
            }
            if (schemas.query) {
                const result = schemas.query.safeParse(req.query);
                if (!result.success) {
                    errors.push(...result.error.issues.map((e) => `query.${e.path.join('.')}: ${e.message}`));
                }
                else {
                    req.query = result.data;
                }
            }
            if (schemas.params) {
                const result = schemas.params.safeParse(req.params);
                if (!result.success) {
                    errors.push(...result.error.issues.map((e) => `params.${e.path.join('.')}: ${e.message}`));
                }
                else {
                    req.params = result.data;
                }
            }
            if (errors.length > 0) {
                throw new error_response_1.AppError(400, errors.join('; '));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateMultiple = validateMultiple;
