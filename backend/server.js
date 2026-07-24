const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');
const assetsRoutes = require('./src/routes/assets.routes');
const itDemandsRoutes = require('./src/routes/it-demands.routes');
const apiRoutes = require('./src/routes/index');
const { pool } = require('./src/config/database');
const { requireAuth } = require('./src/middleware/auth.middleware');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Make io accessible to routes
app.set('io', io);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.dropboxapi.com", "https://content.dropboxapi.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Muitas requisições, tente novamente mais tarde'
});

app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes); // Auth com PostgreSQL (pode não funcionar sem DB)
app.use('/api/assets', assetsRoutes); // Upload de assets (sem autenticação - verificação no frontend)
app.use('/api/it-demands', itDemandsRoutes); // IT Demands management
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection (optional - não falha se não tiver PostgreSQL)
    try {
      console.log('🔄 Tentando conectar ao banco de dados...');
      console.log('📍 Connection timeout: 10s');
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', result.rows[0].now);
    } catch (dbError) {
      console.log('❌ Database connection error:');
      console.log('   Error name:', dbError.name);
      console.log('   Error message:', dbError.message);
      console.log('   Error code:', dbError.code);
      console.log('⚠️ Server will start anyway (database connection is optional)');
      console.log('ℹ️  Some features may not work without database');
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://0.0.0.0:${PORT}/api`);
      console.log(`📁 Assets API: http://0.0.0.0:${PORT}/api/assets`);
      console.log(`🔌 WebSocket: Ready for real-time connections`);
      console.log(`✅ Server is healthy and ready to accept connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM received. Shutting down gracefully...');
  console.log('📍 Timestamp:', new Date().toISOString());
  console.log('🔍 This may be caused by:');
  console.log('   - Docker/Portainer restarting the container');
  console.log('   - Watchtower updating to a new image');
  console.log('   - Healthcheck failure');
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT received (Ctrl+C). Shutting down gracefully...');
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  process.exit(0);
});

startServer();
