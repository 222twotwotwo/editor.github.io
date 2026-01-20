const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { testConnection, sequelize } = require('./database');

const app = express();

// 中间件
app.use(helmet({
  contentSecurityPolicy: false // 开发环境可以关闭
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    const [dbInfo] = await sequelize.query('SELECT DATABASE() as db, USER() as user');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
      database: {
        connected: dbConnected,
        name: dbInfo[0].db,
        user: dbInfo[0].user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      database: 'disconnected'
    });
  }
});

// 测试数据库端点
app.get('/api/test-db', async (req, res) => {
  try {
    const [result] = await sequelize.query('SELECT 1 + 1 AS result');
    const [dbInfo] = await sequelize.query('SELECT DATABASE() as db, VERSION() as version');
    
    res.json({
      success: true,
      message: '数据库连接正常',
      data: {
        result: result[0].result,
        database: dbInfo[0].db,
        version: dbInfo[0].version,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '数据库连接失败',
      details: error.message,
      connectionInfo: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
      }
    });
  }
});

// 简单的用户 API（临时）
app.get('/api/users', async (req, res) => {
  try {
    const { User } = require('../models');
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'created_at', 'updated_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 基础用户注册（临时）
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const { User } = require('../models');
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名、邮箱和密码都是必填项'
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '用户名或邮箱已存在'
      });
    }
    
    // 创建用户
    const user = await User.create({
      username,
      email,
      password
    });
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '注册失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  
  const statusCode = err.status || 500;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🚀 正在启动 Markdown Studio 后端服务...\n');
    
    // 测试数据库连接
    console.log('🔗 测试数据库连接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('\n❌ 无法连接到数据库，请检查以下配置:');
      console.log(`   主机: ${process.env.DB_HOST}`);
      console.log(`   端口: ${process.env.DB_PORT}`);
      console.log(`   用户: ${process.env.DB_USER}`);
      console.log(`   数据库: ${process.env.DB_NAME}`);
      console.log('\n💡 解决方案:');
      console.log('   1. 确保 MySQL 服务正在运行');
      console.log('   2. 检查用户名和密码是否正确');
      console.log('   3. 确认用户有数据库访问权限');
      console.log('   4. 检查防火墙设置');
      process.exit(1);
    }
    
    // 同步数据库（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 同步数据库模型...');
      await sequelize.sync({ alter: true });
      console.log('✅ 数据库模型同步完成\n');
    }
    
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║               Markdown Studio Backend                    ║
║                    Windows 版本                          ║
╠══════════════════════════════════════════════════════════╣
║ 🚀 服务器运行在: http://localhost:${PORT}                    ║
║ 📊 健康检查: http://localhost:${PORT}/health             ║
║ 🔗 数据库测试: http://localhost:${PORT}/api/test-db     ║
║ 👥 用户列表: http://localhost:${PORT}/api/users        ║
║ 📝 注册用户: POST http://localhost:${PORT}/api/auth/register ║
║ 📋 环境: ${process.env.NODE_ENV || 'development'}                  ║
║ 🗄️  数据库: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT} ║
╚══════════════════════════════════════════════════════════╝
      `);
      
      console.log('\n📌 快速测试命令:');
      console.log(`curl http://localhost:${PORT}/health`);
      console.log(`curl http://localhost:${PORT}/api/test-db`);
      console.log('\n✅ 后端服务启动成功！\n');
    });
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    console.error('错误详情:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;