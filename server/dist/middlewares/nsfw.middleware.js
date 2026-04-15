"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNsfw = exports.preloadNsfwModel = void 0;
const tf = __importStar(require("@tensorflow/tfjs"));
const nsfwjs = __importStar(require("nsfwjs"));
const sharp_1 = __importDefault(require("sharp"));
const error_response_1 = require("../utils/error.response");
// Singleton: cache Promise thay vì cache model → tránh race condition
let modelPromise = null;
const loadModel = () => {
    if (!modelPromise) {
        console.log('[NSFW] Loading NSFW model...');
        modelPromise = nsfwjs.load().then((m) => {
            console.log('[NSFW] Model loaded successfully');
            return m;
        }).catch((err) => {
            // Reset để có thể thử load lại nếu lỗi
            modelPromise = null;
            throw err;
        });
    }
    return modelPromise;
};
/**
 * Pre-load model khi server khởi động.
 * Gọi hàm này trong main.ts để tránh load lazy ở request đầu tiên.
 */
const preloadNsfwModel = () => {
    loadModel().catch((err) => {
        console.error('[NSFW] Failed to preload model:', err);
    });
};
exports.preloadNsfwModel = preloadNsfwModel;
// Ngưỡng NSFW — tổng xác suất (Porn + Hentai + Sexy) >= threshold → reject
const NSFW_THRESHOLD = 0.4;
const extractFiles = (req) => {
    if (req.file)
        return [req.file];
    if (Array.isArray(req.files))
        return req.files;
    if (req.files && typeof req.files === 'object') {
        return Object.values(req.files).flat();
    }
    return [];
};
/**
 * Decode buffer ảnh thành Tensor3D bằng sharp
 */
const decodeImageFromBuffer = async (buffer) => {
    const { data, info } = await (0, sharp_1.default)(buffer)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
};
/**
 * Phân tích 1 ảnh từ buffer và trả về NSFW score + chi tiết predictions
 */
const classifyImage = async (nsfwModel, buffer, filename) => {
    const imageTensor = await decodeImageFromBuffer(buffer);
    try {
        const predictions = await nsfwModel.classify(imageTensor);
        // Log chi tiết từng class để debug
        console.log(`[NSFW] "${filename}" predictions:`, predictions.map(p => `${p.className}=${(p.probability * 100).toFixed(1)}%`).join(', '));
        const nsfwClasses = ['Porn', 'Hentai', 'Sexy'];
        const nsfwScore = predictions.reduce((score, pred) => {
            if (nsfwClasses.includes(pred.className)) {
                return score + pred.probability;
            }
            return score;
        }, 0);
        console.log(`[NSFW] "${filename}" total NSFW score: ${(nsfwScore * 100).toFixed(1)}% (threshold: ${NSFW_THRESHOLD * 100}%)`);
        return nsfwScore;
    }
    finally {
        imageTensor.dispose();
    }
};
/**
 * Middleware kiểm tra ảnh nhạy cảm (NSFW).
 * Hoạt động với multer memoryStorage (file.buffer).
 * Đặt SAU middleware upload (multer), TRƯỚC controller.
 *
 * Ví dụ:
 *   router.post('/posts', uploadPostImages.array('images', 5), checkNsfw, postController.create);
 */
const checkNsfw = async (req, res, next) => {
    const files = extractFiles(req);
    if (files.length === 0)
        return next();
    const imageFiles = files.filter((f) => f.mimetype.startsWith('image/'));
    if (imageFiles.length === 0)
        return next();
    try {
        const nsfwModel = await loadModel();
        const results = [];
        console.log(`[NSFW] Checking ${imageFiles.length} image(s)...`);
        for (const file of imageFiles) {
            if (!file.buffer) {
                continue; // Bỏ qua nếu không có buffer (không phải memoryStorage)
            }
            const score = await classifyImage(nsfwModel, file.buffer, file.originalname);
            results.push({
                filename: file.originalname,
                score: Math.round(score * 10000) / 10000,
                isNsfw: score >= NSFW_THRESHOLD,
            });
        }
        // Nếu có ảnh NSFW → reject (không cần xoá vì ảnh chỉ ở buffer)
        const nsfwImages = results.filter((r) => r.isNsfw);
        if (nsfwImages.length > 0) {
            throw new error_response_1.AppError(400, `Phát hiện ${nsfwImages.length} ảnh chứa nội dung nhạy cảm. Vui lòng chọn ảnh khác.`);
        }
        req.nsfwResults = results;
        next();
    }
    catch (error) {
        if (error instanceof error_response_1.AppError)
            return next(error);
        console.error('NSFW middleware error:', error);
        next(new error_response_1.AppError(500, 'Lỗi khi kiểm tra nội dung ảnh'));
    }
};
exports.checkNsfw = checkNsfw;
