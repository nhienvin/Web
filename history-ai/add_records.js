  const mongoose = require('mongoose');
 const HistoricalData = require('./HistoricalData'); // Import model
 
 const DB_URI = 'mongodb://localhost:27017/enterVN'; // Địa chỉ MongoDB của bạn
 
 // Danh sách 10 nhân vật lịch sử Việt Nam để thêm vào DB
 const records = [
   {
     name: 'Hồ Chí Minh',
     type: 'Nhân vật',
     description: 'Lãnh đạo cách mạng Việt Nam, sáng lập nước Việt Nam Dân chủ Cộng hòa.',
     year: 1890,
     additionalInfo: { aliases: ['Bác Hồ'] }
   },
   {
     name: 'Võ Nguyên Giáp',
     type: 'Nhân vật',
     description: 'Đại tướng chỉ huy quân đội trong các cuộc chiến tranh chống Pháp và Mỹ.',
     year: 1911,
     additionalInfo: {}
   },
   {
     name: 'Trần Hưng Đạo',
     type: 'Nhân vật',
     description: 'Lãnh đạo quân đội triều đại Trần, nổi tiếng với chiến thắng chống quân Nguyên Mông.',
     year: 1228,
     additionalInfo: {}
   },
   {
     name: 'Lê Lợi',
     type: 'Nhân vật',
     description: 'Người lãnh đạo khởi nghĩa Lam Sơn, giành lại độc lập cho đất nước từ ách đô hộ của nhà Minh.',
     year: 1385,
     additionalInfo: {}
   },
   {
     name: 'Nguyễn Trãi',
     type: 'Nhân vật',
     description: 'Nhà chính trị, quân sự và văn học, có nhiều đóng góp trong cuộc khởi nghĩa Lam Sơn.',
     year: 1380,
     additionalInfo: {}
   },
   {
     name: 'Phan Bội Châu',
     type: 'Nhân vật',
     description: 'Nhà cách mạng, lãnh đạo phong trào chống thực dân Pháp ở Việt Nam.',
     year: 1867,
     additionalInfo: {}
   },
   {
     name: 'Phan Châu Trinh',
     type: 'Nhân vật',
     description: 'Nhà cách mạng nổi bật, người đề cao lòng yêu nước và tinh thần tự cường của dân tộc.',
     year: 1872,
     additionalInfo: {}
   },
   {
     name: 'Nguyễn Huệ (Quang Trung)',
     type: 'Nhân vật',
     description: 'Hoàng đế Tây Sơn, nổi tiếng với chiến thắng Ngọc Hồi – Đống Đa chống quân Thanh.',
     year: 1753,
     additionalInfo: { aliases: ['Quang Trung'] }
   },
   {
     name: 'Lý Thái Tổ',
     type: 'Nhân vật',
     description: 'Vua đầu tiên của nhà Lý, người đặt nền móng cho hệ thống hành chính và văn hóa Việt Nam.',
     year: 974,
     additionalInfo: {}
   },
   {
     name: 'Trần Quang Diệu',
     type: 'Nhân vật',
     description: 'Một trong những vị tướng xuất sắc của triều đại nhà Trần, đóng góp lớn trong các chiến công chống xâm lược.',
     year: 1242,
     additionalInfo: {}
   }
 ];
 
 async function addRecords() {
   try {
     // Kết nối đến MongoDB
     await mongoose.connect(DB_URI, {
       useNewUrlParser: true,
       useUnifiedTopology: true,
     });
     console.log('Đã kết nối thành công đến MongoDB');
 
     // Thêm nhiều bản ghi cùng lúc sử dụng insertMany
     const result = await HistoricalData.insertMany(records);
     console.log('Thêm bản ghi thành công:', result);
 
     mongoose.disconnect();
   } catch (error) {
     console.error('Lỗi khi thêm bản ghi:', error);
   }
 }
 
 addRecords();
 