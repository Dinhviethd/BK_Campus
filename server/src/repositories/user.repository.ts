import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { User } from '@/models/user.model';
import {UpdateProfileDTO, RegisterDTO} from '@/DTOs/auth.dto'
export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  // Tìm user theo email
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  // Tìm user theo ID
  async findById(idUser: string): Promise<User | null> {
    return this.repository.findOne({
      where: { idUser },
    });
  }

  // Tạo user mới
  async create(userData: RegisterDTO): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  // Cập nhật user
  async update(idUser: string, updateData: UpdateProfileDTO): Promise<User | null> {
    await this.repository.update(idUser, updateData);
    return this.findById(idUser);
  }

  // Xóa user
  async delete(idUser: string): Promise<boolean> {
    const result = await this.repository.delete(idUser);
    return result.affected !== 0;
  }


}

// Export singleton instance
export const userRepository = new UserRepository();
