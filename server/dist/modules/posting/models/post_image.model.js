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
exports.Post_image = void 0;
const typeorm_1 = require("typeorm");
const post_model_1 = require("./post.model");
let Post_image = class Post_image {
    id;
    url;
    nsfwScore;
    extractedFeatures;
    createdAt;
    post;
};
exports.Post_image = Post_image;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Post_image.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Post_image.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float" }),
    __metadata("design:type", Number)
], Post_image.prototype, "nsfwScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'extracted_features', nullable: true }),
    __metadata("design:type", Object)
], Post_image.prototype, "extractedFeatures", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Post_image.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_model_1.Post, post => post.images),
    (0, typeorm_1.JoinColumn)({ name: 'post_id' }),
    __metadata("design:type", post_model_1.Post)
], Post_image.prototype, "post", void 0);
exports.Post_image = Post_image = __decorate([
    (0, typeorm_1.Entity)('post_images')
], Post_image);
