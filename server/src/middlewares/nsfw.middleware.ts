import { Request, Response, NextFunction } from 'express';
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';
import { AppError } from '@/utils/error.response';

// Singleton: cache Promise thay vì cache model → tránh race condition
let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

const loadModel = (): Promise<nsfwjs.NSFWJS> => {
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
export const preloadNsfwModel = (): void => {
  loadModel().catch((err) => {
    console.error('[NSFW] Failed to preload model:', err);
  });
};

// Ngưỡng NSFW — tổng xác suất (Porn + Hentai + Sexy) >= threshold → reject
const NSFW_THRESHOLD = 0.4;

export interface NsfwResult {
  filename: string;
  score: number;
  isNsfw: boolean;
}

// Mở rộng Request để đính kèm kết quả NSFW cho các handler phía sau
declare global {
  namespace Express {
    interface Request {
      nsfwResults?: NsfwResult[];
    }
  }
}

/**
 * Trích xuất danh sách file từ request (hỗ trợ cả single, array và fields)
 */
const extractFiles = (req: Request): Express.Multer.File[] => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
};

/**
 * Decode buffer ảnh thành Tensor3D bằng sharp
 */
const decodeImageFromBuffer = async (buffer: Buffer): Promise<tf.Tensor3D> => {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, 3]
  );
};

/**
 * Phân tích 1 ảnh từ buffer và trả về NSFW score + chi tiết predictions
 */
const classifyImage = async (
  nsfwModel: nsfwjs.NSFWJS,
  buffer: Buffer,
  filename: string
): Promise<number> => {
  const imageTensor = await decodeImageFromBuffer(buffer);

  try {
    const predictions = await nsfwModel.classify(imageTensor);

    // Log chi tiết từng class để debug
    console.log(`[NSFW] "${filename}" predictions:`,
      predictions.map(p => `${p.className}=${(p.probability * 100).toFixed(1)}%`).join(', ')
    );

    const nsfwClasses = ['Porn', 'Hentai', 'Sexy'];
    const nsfwScore = predictions.reduce(
      (score: number, pred: { className: string; probability: number }) => {
        if (nsfwClasses.includes(pred.className)) {
          return score + pred.probability;
        }
        return score;
      },
      0
    );

    console.log(`[NSFW] "${filename}" total NSFW score: ${(nsfwScore * 100).toFixed(1)}% (threshold: ${NSFW_THRESHOLD * 100}%)`);

    return nsfwScore;
  } finally {
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
export const checkNsfw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const files = extractFiles(req);

  if (files.length === 0) return next();

  const imageFiles = files.filter((f) => f.mimetype.startsWith('image/'));
  if (imageFiles.length === 0) return next();

  try {
    const nsfwModel = await loadModel();
    const results: NsfwResult[] = [];

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
      throw new AppError(
        400,
        `Phát hiện ${nsfwImages.length} ảnh chứa nội dung nhạy cảm. Vui lòng chọn ảnh khác.`
      );
    }

    req.nsfwResults = results;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    console.error('NSFW middleware error:', error);
    next(new AppError(500, 'Lỗi khi kiểm tra nội dung ảnh'));
  }
};
