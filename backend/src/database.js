const { Sequelize } = require('sequelize');
require('dotenv').config();

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+08:00',
    // Windows 特定的配置
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
      connectTimeout: 60000,
      // 解决 Windows 下连接问题
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      charset: 'utf8mb4'
    }
  }
);

// 测试连接
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL 数据库连接成功');
    
    // 获取数据库信息
    const [result] = await sequelize.query('SELECT DATABASE() as db');
    console.log(`📦 当前数据库: ${result[0].db}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.log('🔍 请检查以下配置:');
    console.log(`   主机: ${process.env.DB_HOST}`);
    console.log(`   端口: ${process.env.DB_PORT}`);
    console.log(`   用户: ${process.env.DB_USER}`);
    console.log(`   数据库: ${process.env.DB_NAME}`);
    console.log('💡 常见问题:');
    console.log('   1. MySQL 服务是否启动？');
    console.log('   2. 用户名密码是否正确？');
    console.log('   3. 用户是否有数据库权限？');
    return false;
  }
}

// 同步数据库（开发环境使用）
async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force });
    console.log('✅ 数据库同步完成');
    return true;
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};