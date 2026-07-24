const express = require('express');
const { Dropbox } = require('dropbox');
const router = express.Router();

// Criar cliente Dropbox com refresh token
let dropboxClient = null;

if (process.env.DROPBOX_REFRESH_TOKEN && process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET) {
  dropboxClient = new Dropbox({
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET
  });
  console.log('✅ Dropbox configured with refresh token');
} else if (process.env.DROPBOX_ACCESS_TOKEN) {
  dropboxClient = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
  console.log('✅ Dropbox configured with access token');
} else {
  console.log('⚠️ Dropbox not configured');
}

// Middleware para verificar se Dropbox está configurado
const requireDropbox = (req, res, next) => {
  if (!dropboxClient) {
    return res.status(503).json({ error: 'Dropbox não está configurado no servidor' });
  }
  next();
};

// Converter URL do Dropbox para URL de download direto
function convertToDirectUrl(dropboxUrl) {
  // Converter URLs do tipo:
  // https://www.dropbox.com/scl/fi/xxx/file.png?rlkey=xxx&dl=0
  // Para:
  // https://dl.dropboxusercontent.com/scl/fi/xxx/file.png?rlkey=xxx

  if (dropboxUrl.includes('dropbox.com')) {
    return dropboxUrl
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('?dl=0', '')
      .replace('&dl=0', '');
  }

  return dropboxUrl;
}

// POST /api/assets/upload
router.post('/upload', requireDropbox, async (req, res) => {
  try {
    const { fileName, fileContent, projectId } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'fileName e fileContent são obrigatórios' });
    }

    console.log('📤 Backend: Uploading file:', fileName);

    // Converter base64 para buffer
    const buffer = Buffer.from(fileContent, 'base64');

    // Definir path
    const folder = projectId || 'geral';
    const timestamp = Date.now();
    const path = `/TaskFlow-Assets/${folder}/${timestamp}-${fileName}`;

    console.log('📁 Upload path:', path);

    // Upload para Dropbox
    const uploadResult = await dropboxClient.filesUpload({
      path,
      contents: buffer,
      mode: 'add',
      autorename: true,
      mute: false
    });

    console.log('✅ Upload successful:', uploadResult.result.path_display);

    // Criar link compartilhado
    let shareUrl;
    try {
      const shareResult = await dropboxClient.sharingCreateSharedLinkWithSettings({
        path: uploadResult.result.path_display,
        settings: {
          requested_visibility: 'public'
        }
      });
      // Converter para URL de download direto
      shareUrl = convertToDirectUrl(shareResult.result.url);
    } catch (shareError) {
      // Se já existe um link, pegar o existente
      if (shareError.error?.error?.['.tag'] === 'shared_link_already_exists') {
        const links = await dropboxClient.sharingListSharedLinks({
          path: uploadResult.result.path_display
        });
        shareUrl = convertToDirectUrl(links.result.links[0].url);
      } else {
        throw shareError;
      }
    }

    console.log('🔗 Share URL:', shareUrl);

    res.json({
      success: true,
      url: shareUrl,
      path: uploadResult.result.path_display
    });
  } catch (error) {
    console.error('❌ Backend upload error:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload',
      details: error.message
    });
  }
});

// DELETE /api/assets/delete
router.delete('/delete', requireDropbox, async (req, res) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'path é obrigatório' });
    }

    console.log('🗑️ Backend: Deleting file:', path);

    await dropboxClient.filesDeleteV2({ path });

    console.log('✅ Delete successful');

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Backend delete error:', error);
    res.status(500).json({
      error: 'Erro ao deletar arquivo',
      details: error.message
    });
  }
});

// GET /api/assets/status - Verificar status do Dropbox
router.get('/status', (req, res) => {
  res.json({
    configured: !!dropboxClient,
    message: dropboxClient ? 'Dropbox conectado' : 'Dropbox não configurado'
  });
});

// POST /api/assets/upload-task-attachment - Upload de anexo de task
router.post('/upload-task-attachment', requireDropbox, async (req, res) => {
  const { pool } = require('../config/database');
  const client = await pool.connect();

  try {
    const { fileName, fileContent, projectId, taskId, uploadedBy } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'fileName e fileContent são obrigatórios' });
    }

    // Converter strings vazias para null (UUID não aceita string vazia)
    const cleanProjectId = projectId && projectId.trim() !== '' ? projectId : null;
    const cleanUploadedBy = uploadedBy && uploadedBy.trim() !== '' ? uploadedBy : null;

    console.log('📤 Uploading task attachment:', fileName, 'for task:', taskId);

    // Converter base64 para buffer
    const buffer = Buffer.from(fileContent, 'base64');
    const fileSize = buffer.length;

    // Detectar tipo de arquivo
    const extension = fileName.split('.').pop().toLowerCase();
    let fileType = 'document';
    let mimeType = 'application/octet-stream';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      fileType = 'image';
      mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    } else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(extension)) {
      fileType = 'video';
      mimeType = `video/${extension}`;
    } else if (['pdf'].includes(extension)) {
      mimeType = 'application/pdf';
    }

    // Definir path no Dropbox
    const folder = projectId || 'tasks';
    const timestamp = Date.now();
    const path = `/TaskFlow-Assets/${folder}/${timestamp}-${fileName}`;

    console.log('📁 Upload path:', path);

    // Upload para Dropbox
    const uploadResult = await dropboxClient.filesUpload({
      path,
      contents: buffer,
      mode: 'add',
      autorename: true,
      mute: false
    });

    console.log('✅ Upload successful to Dropbox');

    // Criar link compartilhado
    let shareUrl;
    try {
      const shareResult = await dropboxClient.sharingCreateSharedLinkWithSettings({
        path: uploadResult.result.path_display,
        settings: {
          requested_visibility: 'public'
        }
      });
      shareUrl = convertToDirectUrl(shareResult.result.url);
    } catch (shareError) {
      if (shareError.error?.error?.['.tag'] === 'shared_link_already_exists') {
        const links = await dropboxClient.sharingListSharedLinks({
          path: uploadResult.result.path_display
        });
        shareUrl = convertToDirectUrl(links.result.links[0].url);
      } else {
        throw shareError;
      }
    }

    console.log('🔗 Share URL created');

    await client.query('BEGIN');

    // Salvar na tabela de assets
    const assetResult = await client.query(
      `INSERT INTO assets (name, url, path, type, mime_type, size, project_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [fileName, shareUrl, uploadResult.result.path_display, fileType, mimeType, fileSize, cleanProjectId, cleanUploadedBy]
    );

    const asset = assetResult.rows[0];
    console.log('✅ Asset saved to database:', asset.id);

    // Se tiver taskId, criar vínculo na tabela attachments
    let attachmentId = null;
    if (taskId) {
      const attachmentResult = await client.query(
        `INSERT INTO attachments (task_id, name, url, type)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [taskId, fileName, shareUrl, fileType]
      );
      attachmentId = attachmentResult.rows[0].id;
      console.log('✅ Attachment linked to task:', taskId, 'with ID:', attachmentId);
    }

    await client.query('COMMIT');

    // Emitir evento real-time se houver taskId
    const io = req.app.get('io');
    if (io && taskId && attachmentId) {
      io.emit('task:attachment-added', {
        taskId,
        attachment: {
          id: attachmentId,
          name: fileName,
          url: shareUrl,
          type: fileType
        }
      });
    }

    res.json({
      success: true,
      asset: {
        id: attachmentId || asset.id, // Use attachment ID if linked to task, otherwise asset ID
        name: fileName,
        url: shareUrl,
        path: uploadResult.result.path_display,
        type: fileType,
        size: fileSize
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Upload task attachment error:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload do anexo',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// DELETE /api/assets/delete-attachment/:attachmentId - Delete attachment from task
router.delete('/delete-attachment/:attachmentId', async (req, res) => {
  const { pool } = require('../config/database');
  const client = await pool.connect();

  try {
    const { attachmentId } = req.params;

    console.log('🗑️ Deleting attachment:', attachmentId);

    // Get attachment info before deleting
    const attachmentResult = await client.query(
      'SELECT * FROM attachments WHERE id = $1',
      [attachmentId]
    );

    if (attachmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    const attachment = attachmentResult.rows[0];

    // Delete from database
    await client.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    console.log('✅ Attachment deleted from database');

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('task:attachment-deleted', {
        taskId: attachment.task_id,
        attachmentId
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete attachment error:', error);
    res.status(500).json({
      error: 'Erro ao deletar anexo',
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
