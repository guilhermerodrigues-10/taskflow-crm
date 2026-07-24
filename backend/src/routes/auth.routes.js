const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Try to find user in database first
    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];

        // Check if user has password set
        if (user.password_hash) {
          // Check password
          try {
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (validPassword) {
              // Generate JWT
              const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
              );

              console.log('✅ Login successful (database):', email);
              return res.json({
                token,
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  avatarUrl: user.avatar_url
                }
              });
            }
          } catch (compareErr) {
            console.warn('⚠️ Password comparison error:', compareErr.message);
          }
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database query error:', dbError.message);
    }

    // Fallback: Try admin credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      // Generate JWT
      const token = jwt.sign(
        { id: 'admin-001', email: adminEmail, role: 'Admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      console.log('✅ Login successful (admin fallback):', email);
      return res.json({
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

    console.log('❌ Login failed:', email);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'Membro' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, avatar_url',
      [name, email, passwordHash, role]
    );

    const newUser = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatar_url
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// POST /api/auth/create-user - Create user (admin endpoint, uses password field not password_hash)
router.post('/create-user', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, password, role = 'Membro' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user (trigger was removed from database)
    const result = await client.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, avatar_url',
      [name, email, passwordHash, role]
    );

    const newUser = result.rows[0];

    console.log('✅ User created by admin:', email);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatar_url
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    console.error('Error details:', error.message);

    // If trigger error, try to disable and retry
    if (error.message && error.message.includes('has no field "password"')) {
      try {
        console.log('⚠️ Trigger detected, attempting to disable and retry...');
        await client.query('ALTER TABLE users DISABLE TRIGGER ALL');

        const retryResult = await client.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, avatar_url',
          [name, email, passwordHash, role]
        );

        await client.query('ALTER TABLE users ENABLE TRIGGER ALL');

        const retryUser = retryResult.rows[0];
        console.log('✅ User created after retry:', email);

        return res.status(201).json({
          success: true,
          user: {
            id: retryUser.id,
            name: retryUser.name,
            email: retryUser.email,
            role: retryUser.role,
            avatarUrl: retryUser.avatar_url
          }
        });
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
      }
    }

    res.status(500).json({ error: 'Erro ao criar usuário' });
  } finally {
    client.release();
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        role: result.rows[0].role,
        avatarUrl: result.rows[0].avatar_url
      }
    });
  } catch (error) {
    res.json({ valid: false });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
