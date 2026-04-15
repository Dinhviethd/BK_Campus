"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccountStatus = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_response_1 = require("../utils/error.response");
const database_config_1 = require("../configs/database.config");
const user_model_1 = require("../modules/auth/models/user.model");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new error_response_1.AppError(401, "Authorization header missing or invalid");
        }
        const token = authHeader.split(" ")[1];
        if (!token)
            throw new error_response_1.AppError(401, "Token not provided");
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret)
            throw new Error("JWT_ACCESS_SECRET is not defined in environment");
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            userId: decoded.userId
        };
        next();
    }
    catch (error) {
        if (error.name === "JsonWebTokenError") {
            next(new error_response_1.AppError(401, "Invalid token"));
        }
        else if (error.name === "TokenExpiredError") {
            next(new error_response_1.AppError(401, "Token expired"));
        }
        else {
            next(error);
        }
    }
};
exports.authMiddleware = authMiddleware;
const checkAccountStatus = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, "Unauthorized");
        const userRepository = database_config_1.AppDataSource.getRepository(user_model_1.User);
        const user = await userRepository.findOne({
            where: { idUser: userId },
            select: ['emailVerified']
        });
        if (!user)
            throw new error_response_1.AppError(404, "User not found");
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkAccountStatus = checkAccountStatus;
