// DTO cho response đăng ký/đăng nhập
export interface AuthResponseDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}

// DTO cho thông tin user
export interface UserDTO {
  idUser: number;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
}

// DTO cho request đăng ký
export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateProfileDTO {
  name?: string;
  avatarUrl?: string;
  phone?: string;
}
// DTO cho request đăng nhập
export interface LoginRequestDTO {
  email: string;
  password: string;
}

// DTO cho response chung
export interface ApiResponseDTO<T> {
  success: boolean;
  message: string;
  data?: T;
}
