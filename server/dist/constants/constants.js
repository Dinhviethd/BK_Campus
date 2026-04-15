"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_status = exports.post_type = exports.post_source = exports.location = exports.userRole = void 0;
var userRole;
(function (userRole) {
    userRole["ADMIN"] = "admin";
    userRole["USER"] = "user";
})(userRole || (exports.userRole = userRole = {}));
var location;
(function (location) {
    location["khuA"] = "Khu A";
    location["khuB"] = "Khu B";
    location["khuC"] = "Khu C";
    location["khuD"] = "Khu D";
    location["khuE"] = "Khu E";
    location["khuF"] = "Khu F";
    location["khuH"] = "Khu H";
    location["thuVien"] = "Th\u01B0 Vi\u1EC7n";
    location["nhaXeF"] = "Nh\u00E0 Xe Khu F";
    location["nhaXeE"] = "Nh\u00E0 Xe Khu E";
    location["sanTheDuc"] = "S\u00E2n Th\u1EC3 D\u1EE5c";
})(location || (exports.location = location = {}));
var post_source;
(function (post_source) {
    post_source["webUser"] = "WEB_USER";
    post_source["facebook"] = "FACEBOOK_CRAWL";
})(post_source || (exports.post_source = post_source = {}));
var post_type;
(function (post_type) {
    post_type["lost"] = "LOST";
    post_type["found"] = "FOUND";
})(post_type || (exports.post_type = post_type = {}));
var process_status;
(function (process_status) {
    process_status["ingested"] = "INGESTED";
    process_status["moderating"] = "MODERATING";
    process_status["embedding"] = "EMBEDDING";
    process_status["rejected"] = "REJECTED";
    process_status["closed"] = "CLOSED";
    process_status["active"] = "ACTIVE";
})(process_status || (exports.process_status = process_status = {}));
