const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, checkRole } = require('../middleware/auth');

const router = express.Router();

// ==================== IT DEMANDS ROUTES ====================

// GET /api/it-demands - Get all IT demands (Admin only)
router.get('/', authMiddleware, checkRole(['Admin']), async (req, res) => {
  try {
    let result;
    try {
      // Try with new schema (after migration 008)
      result = await pool.query(`
        SELECT
          id,
          title,
          description,
          requester_name,
          requester_email,
          requester_id,
          urgency,
          priority,
          status,
          due_date,
          assignees,
          created_at,
          updated_at
        FROM it_demands
        ORDER BY
          CASE urgency
            WHEN 'Crítica' THEN 1
            WHEN 'Alta' THEN 2
            WHEN 'Média' THEN 3
            WHEN 'Baixa' THEN 4
          END,
          created_at DESC
      `);
    } catch (selectError) {
      // Fallback to old schema (before migration 008)
      console.warn('Using fallback schema for IT demands GET (migration 008 not yet applied)');
      result = await pool.query(`
        SELECT
          id,
          title,
          description,
          requester_name,
          requester_email,
          requester_id,
          urgency,
          status,
          created_at,
          updated_at
        FROM it_demands
        ORDER BY
          CASE urgency
            WHEN 'Crítica' THEN 1
            WHEN 'Alta' THEN 2
            WHEN 'Média' THEN 3
            WHEN 'Baixa' THEN 4
          END,
          created_at DESC
      `);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Get IT demands error:', error);
    res.status(500).json({ error: 'Erro ao buscar demandas de TI' });
  }
});

// GET /api/it-demands/:id - Get single IT demand
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM it_demands WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }

    // Check if user is admin or the requester
    const demand = result.rows[0];
    if (req.user.role !== 'Admin' && req.user.id !== demand.requester_id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(demand);
  } catch (error) {
    console.error('Get IT demand error:', error);
    res.status(500).json({ error: 'Erro ao buscar demanda' });
  }
});

// POST /api/it-demands - Create new IT demand (All authenticated users)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, urgency, priority, dueDate, assignees } = req.body;

    // Validate required fields
    if (!title || !description || !urgency) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, description, urgency' });
    }

    // Validate urgency
    const validUrgencies = ['Baixa', 'Média', 'Alta', 'Crítica'];
    if (!validUrgencies.includes(urgency)) {
      return res.status(400).json({ error: 'Urgência inválida' });
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['Baixa', 'Normal', 'Alta', 'Urgente'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Prioridade inválida' });
      }
    }

    // Log req.user to debug NULL name issue
    console.log('🔍 DEBUG req.user:', JSON.stringify(req.user, null, 2));

    // Extract requester name with fallback (fix for NULL req.user.name)
    const requesterName = req.user?.name || req.user?.email?.split('@')[0] || 'Usuário';
    console.log(`✅ Using requester name: "${requesterName}" (original: ${req.user?.name})`);

    let result;
    try {
      // Try with new schema (after migration 008)
      result = await pool.query(
        `INSERT INTO it_demands (title, description, requester_name, requester_email, requester_id, urgency, priority, status, due_date, assignees)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'backlog', $8, $9)
         RETURNING *`,
        [
          title,
          description,
          requesterName,
          req.user.email,
          req.user.id,
          urgency,
          priority || 'Normal',
          dueDate || null,
          assignees ? JSON.stringify(assignees) : '[]'
        ]
      );
    } catch (insertError) {
      // Fallback to old schema (before migration 008) if columns don't exist
      console.warn('Using fallback schema for IT demands (migration 008 not yet applied)');
      result = await pool.query(
        `INSERT INTO it_demands (title, description, requester_name, requester_email, requester_id, urgency, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'backlog')
         RETURNING *`,
        [
          title,
          description,
          requesterName,
          req.user.email,
          req.user.id,
          urgency
        ]
      );
    }

    const newDemand = result.rows[0];

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('it-demand:created', newDemand);
    }

    res.status(201).json(newDemand);
  } catch (error) {
    console.error('Create IT demand error:', error);
    res.status(500).json({ error: 'Erro ao criar demanda' });
  }
});

// PUT /api/it-demands/:id - Update IT demand (Admin only)
router.put('/:id', authMiddleware, checkRole(['Admin']), async (req, res) => {
  try {
    const { title, description, status, urgency, priority, dueDate, assignees, projectId } = req.body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['backlog', 'em-analise', 'bloqueado', 'em-desenvolvimento', 'em-teste', 'concluido'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }
    }

    // Validate urgency if provided
    if (urgency) {
      const validUrgencies = ['Baixa', 'Média', 'Alta', 'Crítica'];
      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({ error: 'Urgência inválida' });
      }
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['Baixa', 'Normal', 'Alta', 'Urgente'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Prioridade inválida' });
      }
    }

    const result = await pool.query(
      `UPDATE it_demands
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         urgency = COALESCE($4, urgency),
         priority = COALESCE($5, priority),
         due_date = COALESCE($6, due_date),
         assignees = COALESCE($7, assignees),
         project_id = COALESCE($8, project_id),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, description, status, urgency, priority, dueDate, assignees ? JSON.stringify(assignees) : undefined, projectId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }

    const updatedDemand = result.rows[0];

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('it-demand:updated', updatedDemand);
    }

    res.json(updatedDemand);
  } catch (error) {
    console.error('Update IT demand error:', error);
    res.status(500).json({ error: 'Erro ao atualizar demanda' });
  }
});

// DELETE /api/it-demands/:id - Delete IT demand (Admin only)
router.delete('/:id', authMiddleware, checkRole(['Admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM it_demands WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('it-demand:deleted', { id: req.params.id });
    }

    res.json({ message: 'Demanda excluída com sucesso' });
  } catch (error) {
    console.error('Delete IT demand error:', error);
    res.status(500).json({ error: 'Erro ao excluir demanda' });
  }
});

module.exports = router;
