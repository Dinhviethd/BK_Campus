"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginationQuery = exports.PaginationUtil = void 0;
class PaginationUtil {
    static createPagination(data, total, page, limit) {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
            },
        };
    }
    static calculateOffset(page, limit) {
        return (page - 1) * limit;
    }
    static validatePagination(page, limit) {
        if (page < 1) {
            throw new Error('Page must be greater than 0');
        }
        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }
    }
    static getDefaultPagination() {
        return {
            page: 1,
            limit: 20,
        };
    }
}
exports.PaginationUtil = PaginationUtil;
const createPaginationQuery = (page, limit) => {
    PaginationUtil.validatePagination(page, limit);
    return {
        skip: PaginationUtil.calculateOffset(page, limit),
        take: limit,
    };
};
exports.createPaginationQuery = createPaginationQuery;
