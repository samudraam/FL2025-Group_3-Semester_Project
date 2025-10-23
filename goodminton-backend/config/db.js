const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Mongoose 将会读取 .env 文件中的 MONGODB_URI 变量
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 连接成功!');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    // 如果连接失败，则退出 Node.js 进程
    process.exit(1);
  }
};

module.exports = connectDB;