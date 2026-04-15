"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authResponseSchema = exports.userSchema = exports.updateProfileSchema = exports.resetPasswordSchema = exports.verifyOTPSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerDTOSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, 'Tên phải có ít nhất 2 ký tự')
        .max(100, 'Tên không được vượt quá 100 ký tự'),
    email: zod_1.z
        .string()
        .email('Email không hợp lệ'),
    password: zod_1.z
        .string()
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
        .max(50, 'Mật khẩu không được vượt quá 50 ký tự')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
    confirmPassword: zod_1.z.string(),
    phone: zod_1.z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
});
exports.registerDTOSchema = exports.registerSchema.omit({
    confirmPassword: true,
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Email không hợp lệ'),
    password: zod_1.z
        .string()
        .min(1, 'Vui lòng nhập mật khẩu'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Email không hợp lệ'),
});
exports.verifyOTPSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Email không hợp lệ'),
    otp: zod_1.z
        .string()
        .length(6, 'Mã OTP phải có 6 chữ số')
        .regex(/^\d{6}$/, 'Mã OTP chỉ chứa số'),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Email không hợp lệ'),
    otp: zod_1.z
        .string()
        .length(6, 'Mã OTP phải có 6 chữ số')
        .regex(/^\d{6}$/, 'Mã OTP chỉ chứa số'),
    newPassword: zod_1.z
        .string()
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
        .max(50, 'Mật khẩu không được vượt quá 50 ký tự')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên không được vượt quá 100 ký tự').optional(),
    avatarUrl: zod_1.z.string().url('Avatar URL không hợp lệ').optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(50, 'Mật khẩu không được vượt quá 50 ký tự').optional(),
    emailVerified: zod_1.z.boolean().optional(),
    resetOTP: zod_1.z.string().optional(),
    resetOTPExpires: zod_1.z.date().optional(),
});
exports.userSchema = zod_1.z.object({
    idUser: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    emailVerified: zod_1.z.boolean(),
    avatarUrl: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
});
exports.authResponseSchema = zod_1.z.object({
    user: exports.userSchema,
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
});
