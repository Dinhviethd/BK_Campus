import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
import multer from 'multer'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer memory storage — giữ ảnh trong buffer, không lưu local
const memoryStorage = multer.memoryStorage()

export const uploadPostImages = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`))
    }
  },
})

/** Upload buffer lên Cloudinary */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string = 'bk_campus/posts'
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error)
        resolve({ secure_url: result.secure_url, public_id: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

export default cloudinary
