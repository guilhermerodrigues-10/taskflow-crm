import api from './api';

// 🔒 SEGURANÇA: O token Dropbox agora está no BACKEND, não mais exposto no navegador!
// O frontend só se comunica com o backend, que se comunica com o Dropbox

// Assume que está configurado (otimista)
// O backend irá validar quando fizer upload
export const isDropboxConfigured = true;

// Função para verificar status (usada internamente)
export async function checkDropboxStatus(): Promise<boolean> {
  try {
    const response = await api.get('/assets/status');
    console.log('🔧 Backend Dropbox status:', response.data.message);
    return response.data.configured;
  } catch (error) {
    console.log('⚠️ Backend não está rodando. Inicie o backend com: cd backend && npm run dev');
    return false;
  }
}

// Helper function to get file type from MIME type
export function getAssetTypeFromMimeType(mimeType: string): 'image' | 'video' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('text/')
  ) {
    return 'document';
  }
  return 'other';
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Upload file via backend API (SEGURO!)
export async function uploadAsset(
  file: File,
  userId: string,
  projectId?: string
): Promise<{ url: string; path: string } | null> {
  try {
    console.log('📤 Frontend: Uploading file via backend:', file.name, 'Size:', formatFileSize(file.size));

    // Converter arquivo para base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:image/png;base64," para enviar só o conteúdo
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    console.log('📦 File converted to base64, sending to backend...');

    // Enviar para backend
    const response = await api.post('/assets/upload', {
      fileName: file.name,
      fileContent: base64,
      projectId
    });

    if (response.data.success) {
      console.log('✅ Upload successful via backend!');
      return {
        url: response.data.url,
        path: response.data.path
      };
    }

    return null;
  } catch (error: any) {
    console.error('❌ Upload error:', error);

    let errorMessage = 'Erro ao fazer upload';

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      errorMessage = '❌ Backend não está rodando!\n\nPara usar upload de arquivos:\n1. Abra um terminal\n2. Execute: cd backend\n3. Execute: npm run dev\n\nO backend precisa estar rodando em http://localhost:3001';
    } else if (error.response?.status === 401) {
      errorMessage = '❌ Você não está autenticado!\n\nPor favor, faça login novamente para fazer upload de arquivos.';
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = '/#/login';
      }, 2000);
    } else if (error.response?.status === 503) {
      errorMessage = 'Dropbox não está configurado no servidor';
    } else if (error.response?.data?.details) {
      errorMessage = `Erro: ${error.response.data.details}`;
    }

    alert(errorMessage);
    return null;
  }
}

// Delete file via backend API (SEGURO!)
export async function deleteAsset(path: string): Promise<boolean> {
  try {
    console.log('🗑️ Frontend: Deleting file via backend:', path);

    const response = await api.delete('/assets/delete', {
      data: { path }
    });

    if (response.data.success) {
      console.log('✅ Delete successful via backend!');
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('❌ Delete error:', error);

    let errorMessage = 'Erro ao deletar arquivo';
    if (error.response?.status === 503) {
      errorMessage = 'Dropbox não está configurado no servidor';
    } else if (error.response?.data?.details) {
      errorMessage = `Erro: ${error.response.data.details}`;
    }

    alert(errorMessage);
    return false;
  }
}
