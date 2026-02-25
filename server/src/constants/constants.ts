export enum userRole{
    ADMIN = 'admin',
    USER = 'user'
}
export enum location {
    khuA= 'Khu A',
    khuB= 'Khu B',
    khuC= 'Khu C',
    khuD= 'Khu D',
    khuE= 'Khu E',
    khuF= 'Khu F',
    thuVien= 'Thư Viện',
    nhaXeF= 'Nhà Xe Khu F',
    nhaXeE= 'Nhà Xe Khu E',
    sanTheDuc= 'Sân Thể Dục',
}
export enum post_source {
    webUser= "WEB_USER",
    facebook = "FACEBOOK_CRAWL"
}
export enum post_type{
    lost= 'LOST',
    found= 'FOUND'
}
export enum process_status {
    processing= 'PROCESSING',
    rejected= 'REJECTED',
    closed= 'CLOSED',
    active='ACTIVE'
}