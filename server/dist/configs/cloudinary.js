"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = exports.uploadPostImages = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
dotenv_1.default.config({ quiet: true });
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Multer memory storage — giữ ảnh trong buffer, không lưu local
const memoryStorage = multer_1.default.memoryStorage();
exports.uploadPostImages = (0, multer_1.default)({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
        }
    },
});
/** Upload buffer lên Cloudinary */
const uploadToCloudinary = (buffer, folder = 'bk_campus/posts') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
        stream.end(buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
exports.default = cloudinary_1.v2;
