"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const typeorm_1 = require("typeorm");
const constants_1 = require("../../../constants/constants");
const user_model_1 = require("../../auth/models/user.model");
const post_image_model_1 = require("./post_image.model");
let Post = class Post {
    id;
    source;
    originalLink;
    content;
    location;
    type;
    status;
    extractedInfo;
    itemTypeEmbedding;
    createdAt;
    updatedAt;
    user;
    images;
};
exports.Post = Post;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Post.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: constants_1.post_source }),
    __metadata("design:type", String)
], Post.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, name: "original_url" }),
    __metadata("design:type", String)
], Post.prototype, "originalLink", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Post.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Post.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: constants_1.post_type }),
    __metadata("design:type", String)
], Post.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: constants_1.process_status }),
    __metadata("design:type", String)
], Post.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'extracted_info', nullable: true }),
    __metadata("design:type", Object)
], Post.prototype, "extractedInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'vector', name: 'item_type_embedding', nullable: true }),
    __metadata("design:type", Object)
], Post.prototype, "itemTypeEmbedding", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Post.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Post.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_model_1.User, user => user.posts),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_model_1.User)
], Post.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => post_image_model_1.Post_image, postImage => postImage.post),
    __metadata("design:type", Array)
], Post.prototype, "images", void 0);
exports.Post = Post = __decorate([
    (0, typeorm_1.Entity)('posts'),
    (0, typeorm_1.Index)('IDX_posts_crawl_cursor', ['source', 'status', 'type', 'updatedAt'])
], Post);
