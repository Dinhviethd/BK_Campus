import { Request, Response } from 'express';
import { authService } from '@/services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema } from '@/schemas/auth.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO, AuthResponseDTO, UserDTO } from '@/DTOs/auth.dto';

class AuthController {
  // Đăng ký tài khoản mới
  register = asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const result = await authService.register(validationResult.data);

    // Set refresh token vào cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    const response: ApiResponseDTO<AuthResponseDTO> = {
      success: true,
      message: 'Đăng ký thành công',
      data: result,
    };

    res.status(201).json(response);
  });

  // Đăng nhập
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const result = await authService.login(validationResult.data);

    // Set refresh token vào cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    const response: ApiResponseDTO<AuthResponseDTO> = {
      success: true,
      message: 'Đăng nhập thành công',
      data: result,
    };

    res.status(200).json(response);
  });

  // Refresh token
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Lấy refresh token từ cookie hoặc body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Set refresh token mới vào cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    const response: ApiResponseDTO<{ accessToken: string; refreshToken: string }> = {
      success: true,
      message: 'Token đã được làm mới',
      data: tokens,
    };

    res.status(200).json(response);
  });

  // Lấy thông tin user hiện tại
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await authService.getCurrentUser(userId);

    const response: ApiResponseDTO<UserDTO> = {
      success: true,
      message: 'Lấy thông tin user thành công',
      data: user,
    };

    res.status(200).json(response);
  });

  // Đăng xuất
  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (userId) {
      await authService.logout(userId);
    }

    // Xóa refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Đăng xuất thành công',
    };

    res.status(200).json(response);
  });

  // Quên mật khẩu - gửi OTP
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    await authService.forgotPassword(validationResult.data);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn',
    };

    res.status(200).json(response);
  });

  // Xác nhận OTP
  verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const result = await authService.verifyOTP(validationResult.data);

    const response: ApiResponseDTO<{ valid: boolean }> = {
      success: true,
      message: 'Mã OTP hợp lệ',
      data: result,
    };

    res.status(200).json(response);
  });

  // Đặt lại mật khẩu
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    await authService.resetPassword(validationResult.data);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    };

    res.status(200).json(response);
  });

  // Helper method để set refresh token cookie
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
    });
  }
}

export const authController = new AuthController();
