"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const database_config_1 = require("../../configs/database.config");
const user_model_1 = require("../../modules/auth/models/user.model");
class UserRepository {
    repository;
    constructor() {
        this.repository = database_config_1.AppDataSource.getRepository(user_model_1.User);
    }
    // Tìm user theo email
    async findByEmail(email) {
        return this.repository.findOne({
            where: { email },
        });
    }
    // Tìm user theo ID
    async findById(idUser) {
        return this.repository.findOne({
            where: { idUser },
        });
    }
    // Tạo user mới
    async create(userData) {
        const user = this.repository.create(userData);
        return this.repository.save(user);
    }
    // Cập nhật user
    async update(idUser, updateData) {
        await this.repository.update(idUser, updateData);
        return this.findById(idUser);
    }
    // Xóa user
    async delete(idUser) {
        const result = await this.repository.delete(idUser);
        return result.affected !== 0;
    }
}
exports.UserRepository = UserRepository;
// Export singleton instance
exports.userRepository = new UserRepository();
