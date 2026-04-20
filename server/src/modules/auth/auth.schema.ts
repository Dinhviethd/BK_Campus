import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Tên phải có ít nhất 2 ký tự')
    .max(100, 'Tên không được vượt quá 100 ký tự'),
  email: z
    .string()
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(50, 'Mật khẩu không được vượt quá 50 ký tự')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
    ),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export const registerDTOSchema = registerSchema.omit({
  confirmPassword: true,
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ'),
});

export const verifyOTPSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ'),
  otp: z
    .string()
    .length(6, 'Mã OTP phải có 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ chứa số'),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ'),
  otp: z
    .string()
    .length(6, 'Mã OTP phải có 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ chứa số'),
  newPassword: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(50, 'Mật khẩu không được vượt quá 50 ký tự')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên không được vượt quá 100 ký tự').optional(),
  avatarUrl: z.string().url('Avatar URL không hợp lệ').optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(50, 'Mật khẩu không được vượt quá 50 ký tự').optional(),
  emailVerified: z.boolean().optional(),
  resetOTP: z.string().optional(),
  resetOTPExpires: z.date().optional(),
});

export const userSchema = z.object({
  idUser: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterDTO = z.infer<typeof registerDTOSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
export type UserResponse = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
