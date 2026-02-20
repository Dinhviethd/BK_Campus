export const INITIAL_POSTS = [
    {
        id: 1,
        type: 'lost', 
        user: 'Nguyễn Văn A',
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=ef4444&color=fff',
        content: 'Mình để quên một bình giữ nhiệt Lock&Lock màu xanh dương tại phòng F101 sáng nay. Ai thấy cho mình xin lại ạ.',
        time: '10 phút trước',
        location: 'Khu F - ĐH Bách Khoa',
        area: 'F',
        source: 'web',
        status: 'active'
    },
    {
        id: 2,
        type: 'found', 
        user: 'Trần Thị B',
        avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=22c55e&color=fff',
        content: 'Nhặt được thẻ sinh viên tên Lê Văn C tại nhà xe khu A. Bạn nào mất liên hệ mình nhé.',
        time: '30 phút trước',
        location: 'Nhà xe Khu A',
        area: 'A',
        source: 'web',
        status: 'active'
    },
    {
        id: 3,
        type: 'found',
        user: 'Confession BKĐN',
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
        content: '#CRAWL Nhặt được 1 chìa khóa xe máy có gắn móc khóa hình con gấu tại căng tin.',
        time: '1 giờ trước',
        location: 'Căng tin khu F',
        area: 'Canteen',
        source: 'facebook',
        fbLink: 'https://facebook.com',
        status: 'active'
    }
];

export const LOCATIONS = [
    { id: 'all', label: 'Tất cả khu vực' },
    { id: 'F', label: 'Khu F' },
    { id: 'A', label: 'Khu A' },
    { id: 'Canteen', label: 'Căng tin' },
    { id: 'Parking', label: 'Nhà xe' },
];