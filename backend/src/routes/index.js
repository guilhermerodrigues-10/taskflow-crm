const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, checkRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// ==================== USERS ROUTES ====================

// GET /api/users - Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PUT /api/users/:id - Update user
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { name, email, avatarUrl, role, password } = req.body;

    // Only allow users to update themselves, or admins to update anyone
    if (req.user.id !== req.params.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    let query = 'UPDATE users SET name = $1, email = $2, avatar_url = $3';
    let params = [name, email, avatarUrl];
    let paramIndex = 4;

    // Only admins can change roles
    if (role && req.user.role === 'Admin') {
      query += `, role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // Update password if provided
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query += `, password_hash = $${paramIndex}`;
      params.push(passwordHash);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, avatar_url`;
    params.push(req.params.id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = result.rows[0];

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('user:updated', userData);
    }

    res.json(userData);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id - Delete user (Admin/Gerente only)
router.delete('/users/:id', authMiddleware, checkRole('Admin', 'Gerente'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { id: req.params.id });
    }

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

// POST /api/users/change-password - Change user password
router.post('/users/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    // Get user with password hash
    const userResult = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// ==================== PROJECTS ROUTES ====================

// GET /api/projects - Get all projects
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        COALESCE(json_agg(DISTINCT pm.user_id) FILTER (WHERE pm.user_id IS NOT NULL), '[]') as members
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

// POST /api/projects - Create project
router.post('/projects', authMiddleware, checkRole('Admin', 'Gerente'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, clientName, budget, color, members = [] } = req.body;

    const result = await client.query(
      'INSERT INTO projects (name, client_name, budget, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, clientName, budget || 0, color || '#3B82F6']
    );

    const project = result.rows[0];

    // Add members
    if (members.length > 0) {
      for (const userId of members) {
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
          [project.id, userId]
        );
      }
    }

    await client.query('COMMIT');

    const projectData = { ...project, members };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:created', projectData);
    }

    res.status(201).json(projectData);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Erro ao criar projeto' });
  } finally {
    client.release();
  }
});

// PUT /api/projects/:id - Update project
router.put('/projects/:id', authMiddleware, checkRole('Admin', 'Gerente'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, clientName, budget, color, members } = req.body;

    const result = await client.query(
      'UPDATE projects SET name = $1, client_name = $2, budget = $3, color = $4 WHERE id = $5 RETURNING *',
      [name, clientName, budget || 0, color, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Update members if provided
    if (members) {
      await client.query('DELETE FROM project_members WHERE project_id = $1', [req.params.id]);

      for (const userId of members) {
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
          [req.params.id, userId]
        );
      }
    }

    await client.query('COMMIT');

    const projectData = { ...result.rows[0], members };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:updated', projectData);
    }

    res.json(projectData);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  } finally {
    client.release();
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/projects/:id', authMiddleware, checkRole('Admin', 'Gerente'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('project:deleted', { id: req.params.id });
    }

    res.json({ message: 'Projeto removido com sucesso' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Erro ao remover projeto' });
  }
});

// ==================== TASKS ROUTES ====================

// GET /api/tasks - Get all tasks
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        COALESCE(json_agg(DISTINCT ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL), '[]') as assignees,
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id, 'title', s.title, 'completed', s.completed))
           FROM subtasks s WHERE s.task_id = t.id),
          '[]'
        ) as subtasks,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name))
           FROM tags tg WHERE tg.task_id = t.id),
          '[]'
        ) as tags,
        COALESCE(
          (SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'url', a.url, 'type', a.type))
           FROM attachments a WHERE a.task_id = t.id),
          '[]'
        ) as attachments
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// POST /api/tasks - Create task
router.post('/tasks', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, description, status, priority, dueDate, projectId, assignees = [], tags = [], subtasks = [] } = req.body;

    const result = await client.query(
      'INSERT INTO tasks (title, description, status, priority, due_date, project_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, status || 'Backlog', priority || 'Normal', dueDate, projectId, req.user.id]
    );

    const task = result.rows[0];

    // Add assignees
    for (const userId of assignees) {
      await client.query(
        'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
        [task.id, userId]
      );
    }

    // Add tags
    for (const tagName of tags) {
      await client.query(
        'INSERT INTO tags (task_id, name) VALUES ($1, $2)',
        [task.id, tagName]
      );
    }

    // Add subtasks
    for (const subtask of subtasks) {
      await client.query(
        'INSERT INTO subtasks (task_id, title, completed) VALUES ($1, $2, $3)',
        [task.id, subtask.title, subtask.completed || false]
      );
    }

    await client.query('COMMIT');

    const taskData = { ...task, assignees, tags, subtasks, attachments: [] };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('task:created', taskData);
    }

    res.status(201).json(taskData);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  } finally {
    client.release();
  }
});

// PUT /api/tasks/:id - Update task
router.put('/tasks/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, description, status, priority, dueDate, timeTracked, isTracking, assignees, tags, subtasks } = req.body;

    const result = await client.query(
      `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4,
       due_date = $5, time_tracked = $6, is_tracking = $7
       WHERE id = $8 RETURNING *`,
      [title, description, status, priority, dueDate, timeTracked || 0, isTracking || false, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Update assignees if provided
    if (assignees) {
      await client.query('DELETE FROM task_assignees WHERE task_id = $1', [req.params.id]);
      for (const userId of assignees) {
        await client.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
          [req.params.id, userId]
        );
      }
    }

    // Update tags if provided
    if (tags) {
      await client.query('DELETE FROM tags WHERE task_id = $1', [req.params.id]);
      for (const tagName of tags) {
        await client.query(
          'INSERT INTO tags (task_id, name) VALUES ($1, $2)',
          [req.params.id, tagName]
        );
      }
    }

    // Update subtasks if provided
    if (subtasks) {
      await client.query('DELETE FROM subtasks WHERE task_id = $1', [req.params.id]);
      for (const subtask of subtasks) {
        await client.query(
          'INSERT INTO subtasks (task_id, title, completed) VALUES ($1, $2, $3)',
          [req.params.id, subtask.title, subtask.completed]
        );
      }
    }

    await client.query('COMMIT');

    const updatedTask = { ...result.rows[0], assignees, tags, subtasks };

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('task:updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  } finally {
    client.release();
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('task:deleted', { id: req.params.id });
    }

    res.json({ message: 'Tarefa removida com sucesso' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Erro ao remover tarefa' });
  }
});

// ==================== ASSETS ROUTES ====================

// GET /api/assets - Get all assets
router.get('/assets', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
        COALESCE(
          (SELECT json_agg(at.tag_name) FROM asset_tags at WHERE at.asset_id = a.id),
          '[]'
        ) as tags
      FROM assets a
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ error: 'Erro ao buscar assets' });
  }
});

// POST /api/assets - Create asset metadata
router.post('/assets', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, url, path, type, mimeType, size, projectId, tags = [] } = req.body;

    const result = await client.query(
      'INSERT INTO assets (name, url, path, type, mime_type, size, project_id, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, url, path, type, mimeType, size, projectId, req.user.id]
    );

    const asset = result.rows[0];

    // Add tags
    for (const tagName of tags) {
      await client.query(
        'INSERT INTO asset_tags (asset_id, tag_name) VALUES ($1, $2)',
        [asset.id, tagName]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ ...asset, tags });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Erro ao salvar asset' });
  } finally {
    client.release();
  }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/assets/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM assets WHERE id = $1 RETURNING path', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset não encontrado' });
    }

    res.json({ message: 'Asset removido com sucesso', path: result.rows[0].path });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Erro ao remover asset' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

// GET /api/notifications - Get user notifications
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

module.exports = router;
