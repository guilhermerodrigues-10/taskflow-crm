import axios from 'axios';

// Get API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authAPI = {
  // Login com credenciais do banco de dados (funciona com todos os usuários)
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data; // { token, user }
  },

  // Verificar se token é válido
  verify: async () => {
    // Para compatibilidade, usar /auth/verify se existir, senão fallback
    try {
      const response = await api.get('/auth/verify');
      return response.data; // { valid, user }
    } catch (error) {
      // Se /auth/verify não existir, apenas verificar se há token
      const token = localStorage.getItem('authToken');
      return { valid: !!token, user: JSON.parse(localStorage.getItem('user') || '{}') };
    }
  },

  // Renovar token (fallback - pode não existir)
  refresh: async () => {
    try {
      const response = await api.post('/auth/refresh');
      return response.data; // { success, token }
    } catch (error) {
      throw new Error('Token refresh não suportado');
    }
  },

  // Registrar novo usuário
  register: async (name: string, email: string, password: string, role = 'Membro') => {
    const response = await api.post('/auth/register', { name, email, password, role });
    return response.data; // { token, user }
  },

  // Criar usuário como admin (endpoint específico)
  createUser: async (name: string, email: string, password: string, role = 'Membro') => {
    const response = await api.post('/auth/create-user', { name, email, password, role });
    return response.data; // { success, user }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data; // user
  },
};

// ==================== USERS ====================

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// ==================== PROJECTS ====================

export const projectsAPI = {
  getAll: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

// ==================== TASKS ====================

export const tasksAPI = {
  getAll: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

// ==================== ASSETS ====================

export const assetsAPI = {
  getAll: async () => {
    const response = await api.get('/assets');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/assets', data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/assets/${id}`);
    return response.data;
  },

  uploadTaskAttachment: async (fileName: string, fileContent: string, projectId: string, taskId: string | undefined, uploadedBy: string) => {
    const response = await api.post('/assets/upload-task-attachment', {
      fileName,
      fileContent,
      projectId,
      taskId,
      uploadedBy
    });
    return response.data;
  },

  deleteAttachment: async (attachmentId: string) => {
    const response = await api.delete(`/assets/delete-attachment/${attachmentId}`);
    return response.data;
  },
};

// ==================== NOTIFICATIONS ====================

export const notificationsAPI = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
};

export default api;
