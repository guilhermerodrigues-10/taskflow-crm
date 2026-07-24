const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const router = express.Router();

// POST /api/simple-auth/login
// Autentica com credenciais do banco de dados (com fallback para .env)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Tentar autenticar no banco de dados primeiro
    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        
        // Se o usuário existe mas não tem senha hash, significa que foi criado sem senha
        if (!user.password_hash) {
          console.warn('⚠️ User found but no password hash:', email);
          // Continua para tentar .env credentials
        } else {
          // Verificar senha
          try {
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (validPassword) {
              // Gerar JWT
              const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
              );

              console.log('✅ Login successful for:', email);

              return res.json({
                success: true,
                token,
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  avatarUrl: user.avatar_url
                }
              });
            } else {
              console.warn('⚠️ Invalid password for user:', email);
              // Continua para tentar .env credentials
            }
          } catch (compareErr) {
            console.warn('⚠️ Error comparing password:', compareErr.message);
          }
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database error, trying .env credentials:', dbError.message);
    }

    // Fallback: Validar credenciais com .env (apenas admin)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      // Gerar JWT
      const token = jwt.sign(
        {
          email: adminEmail,
          role: 'Admin',
          userId: 'admin-001'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      console.log('✅ Admin login successful');

      return res.json({
        success: true,
        token,
        user: {
          id: 'admin-001',
          name: 'Admin',
          email: adminEmail,
          role: 'Admin',
          avatarUrl: 'https://ui-avatars.com/api/?name=Admin+GV&background=7c3aed&color=fff'
        }
      });
    }

    console.log('❌ Credenciais inválidas');
    return res.status(401).json({ error: 'Credenciais inválidas' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /api/simple-auth/verify
router.post('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// POST /api/simple-auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Gerar novo token
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ success: true, token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

// GET /api/simple-auth/verify
// Verifica se o token JWT é válido
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido', valid: false });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      valid: true,
      user: {
        id: decoded.userId || 'admin-001',
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Token inválido ou expirado', valid: false });
  }
});

module.exports = router;
