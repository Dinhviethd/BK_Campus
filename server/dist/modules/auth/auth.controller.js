"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../../modules/auth/auth.service");
const auth_schema_1 = require("../../modules/auth/auth.schema");
const error_response_1 = require("../../utils/error.response");
class AuthController {
    // Đăng ký tài khoản mới
    register = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Validate input
        const validationResult = auth_schema_1.registerSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        const result = await auth_service_1.authService.register(validationResult.data);
        // Set refresh token vào cookie
        this.setRefreshTokenCookie(res, result.refreshToken);
        const response = {
            success: true,
            message: 'Đăng ký thành công',
            data: result,
        };
        res.status(201).json(response);
    });
    // Đăng nhập
    login = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Validate input
        const validationResult = auth_schema_1.loginSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        const result = await auth_service_1.authService.login(validationResult.data);
        // Set refresh token vào cookie
        this.setRefreshTokenCookie(res, result.refreshToken);
        const response = {
            success: true,
            message: 'Đăng nhập thành công',
            data: result,
        };
        res.status(200).json(response);
    });
    // Refresh token
    refreshToken = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Lấy refresh token từ cookie hoặc body
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!refreshToken) {
            throw new error_response_1.AppError(400, 'Refresh token is required');
        }
        const tokens = await auth_service_1.authService.refreshToken(refreshToken);
        // Set refresh token mới vào cookie
        this.setRefreshTokenCookie(res, tokens.refreshToken);
        const response = {
            success: true,
            message: 'Token đã được làm mới',
            data: tokens,
        };
        res.status(200).json(response);
    });
    // Lấy thông tin user hiện tại
    getCurrentUser = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId) {
            throw new error_response_1.AppError(401, 'Unauthorized');
        }
        const user = await auth_service_1.authService.getCurrentUser(userId);
        const response = {
            success: true,
            message: 'Lấy thông tin user thành công',
            data: user,
        };
        res.status(200).json(response);
    });
    // Đăng xuất
    logout = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (userId) {
            await auth_service_1.authService.logout(userId);
        }
        // Xóa refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        const response = {
            success: true,
            message: 'Đăng xuất thành công',
        };
        res.status(200).json(response);
    });
    // Quên mật khẩu - gửi OTP
    forgotPassword = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Validate input
        const validationResult = auth_schema_1.forgotPasswordSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        await auth_service_1.authService.forgotPassword(validationResult.data);
        const response = {
            success: true,
            message: 'Mã OTP đã được gửi đến email của bạn',
        };
        res.status(200).json(response);
    });
    // Xác nhận OTP
    verifyOTP = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Validate input
        const validationResult = auth_schema_1.verifyOTPSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        const result = await auth_service_1.authService.verifyOTP(validationResult.data);
        const response = {
            success: true,
            message: 'Mã OTP hợp lệ',
            data: result,
        };
        res.status(200).json(response);
    });
    // Đặt lại mật khẩu
    resetPassword = (0, error_response_1.asyncHandler)(async (req, res) => {
        // Validate input
        const validationResult = auth_schema_1.resetPasswordSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        await auth_service_1.authService.resetPassword(validationResult.data);
        const response = {
            success: true,
            message: 'Đặt lại mật khẩu thành công',
        };
        res.status(200).json(response);
    });
    // Helper method để set refresh token cookie
    setRefreshTokenCookie(res, refreshToken) {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge,
        });
    }
}
exports.authController = new AuthController();
