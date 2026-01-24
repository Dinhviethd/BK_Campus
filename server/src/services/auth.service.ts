import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository, userRepository } from '@/repositories/user.repository';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, VerifyOTPInput } from '@/schemas/auth.schema';
import { AuthResponseDTO, UserDTO } from '@/DTOs/auth.dto';
import { AppError } from '@/utils/error.response';
import { User } from '@/models/user.model';
import { generateOTP, sendOTPEmail } from '@/utils/email';


export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = userRepository;
  }

  
  async register(input: RegisterInput): Promise<AuthResponseDTO> {
    const { name, email, password, phone } = input;

    
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(400, 'Email đã được sử dụng');
    }

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const newUser = await this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      phone,
      emailVerified: false,
    });

    
    const tokens = this.generateTokens(newUser.idUser);

    return {
      user: this.toUserDTO(newUser),
      ...tokens,
    };
  }

  
  async login(input: LoginInput): Promise<AuthResponseDTO> {
    const { email, password } = input;

    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Email hoặc mật khẩu không chính xác');
    }

    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Email hoặc mật khẩu không chính xác');
    }

    
    const tokens = this.generateTokens(user.idUser);

    return {
      user: this.toUserDTO(user),
      ...tokens,
    };
  }

  
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
      }

      const decoded = jwt.verify(refreshToken, secret) as { userId: number };
      
      
      const user = await this.userRepo.findById(decoded.userId);
      if (!user) {
        throw new AppError(401, 'User không tồn tại');
      }

      
      return this.generateTokens(user.idUser);
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError(401, 'Refresh token không hợp lệ hoặc đã hết hạn');
      }
      throw error;
    }
  }

  
  async getCurrentUser(userId: number): Promise<UserDTO> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, 'User không tồn tại');
    }
    return this.toUserDTO(user);
  }

  async logout(userId: number): Promise<void> {
    // Có thể thêm logic để invalidate token ở đây
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const { email } = input;
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    const otp = generateOTP();
    
    
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    
    await this.userRepo.update(user.idUser, {
      resetOTP: otp,
      resetOTPExpires: otpExpires,
    });

    
    await sendOTPEmail(email, otp);
  }

  
  async verifyOTP(input: VerifyOTPInput): Promise<{ valid: boolean }> {
    const { email, otp } = input;

    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    if (!user.resetOTP || !user.resetOTPExpires) {
      throw new AppError(400, 'Bạn chưa yêu cầu đặt lại mật khẩu');
    }

    
    if (new Date() > user.resetOTPExpires) {
      throw new AppError(400, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    
    if (user.resetOTP !== otp) {
      throw new AppError(400, 'Mã OTP không chính xác');
    }

    return { valid: true };
  }

  
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { email, otp, newPassword } = input;

    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    if (!user.resetOTP || !user.resetOTPExpires) {
      throw new AppError(400, 'Bạn chưa yêu cầu đặt lại mật khẩu');
    }

    
    if (new Date() > user.resetOTPExpires) {
      throw new AppError(400, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    
    if (user.resetOTP !== otp) {
      throw new AppError(400, 'Mã OTP không chính xác');
    }

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    
    await this.userRepo.update(user.idUser, {
      password: hashedPassword,
      resetOTP: undefined,
      resetOTPExpires: undefined,
    });
  }

  
  private generateTokens(userId: number): { accessToken: string; refreshToken: string } {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not defined in environment');
    }

    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const accessToken = jwt.sign(
      { userId },
      accessSecret,
      { expiresIn: accessExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId },
      refreshSecret,
      { expiresIn: refreshExpiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  
  private toUserDTO(user: User): UserDTO {
    return {
      idUser: user.idUser,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }
}


export const authService = new AuthService();
