import api from './api';

export interface ITDemand {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  requesterId?: string;
  urgency: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  priority?: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  status: string;
  dueDate?: string;
  assignees?: string[];
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateITDemandInput {
  title: string;
  description: string;
  urgency: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  priority?: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  dueDate?: string;
  assignees?: string[];
  projectId?: string;
}

export interface UpdateITDemandInput {
  title?: string;
  description?: string;
  status?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  priority?: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  dueDate?: string;
  assignees?: string[];
  projectId?: string;
}

export const itDemandsAPI = {
  // Get all IT demands (Admin only)
  getAll: async (): Promise<ITDemand[]> => {
    const response = await api.get('/it-demands');
    return response.data.map((demand: any) => ({
      id: demand.id,
      title: demand.title,
      description: demand.description,
      requesterName: demand.requester_name,
      requesterEmail: demand.requester_email,
      requesterId: demand.requester_id,
      urgency: demand.urgency,
      priority: demand.priority,
      status: demand.status,
      dueDate: demand.due_date,
      assignees: demand.assignees,
      attachments: demand.attachments,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at
    }));
  },

  // Get single IT demand
  getById: async (id: string): Promise<ITDemand> => {
    const response = await api.get(`/it-demands/${id}`);
    const demand = response.data;
    return {
      id: demand.id,
      title: demand.title,
      description: demand.description,
      requesterName: demand.requester_name,
      requesterEmail: demand.requester_email,
      requesterId: demand.requester_id,
      urgency: demand.urgency,
      priority: demand.priority,
      status: demand.status,
      dueDate: demand.due_date,
      assignees: demand.assignees,
      attachments: demand.attachments,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at
    };
  },

  // Create new IT demand
  create: async (data: CreateITDemandInput): Promise<ITDemand> => {
    const response = await api.post('/it-demands', data);
    const demand = response.data;
    return {
      id: demand.id,
      title: demand.title,
      description: demand.description,
      requesterName: demand.requester_name,
      requesterEmail: demand.requester_email,
      requesterId: demand.requester_id,
      urgency: demand.urgency,
      priority: demand.priority,
      status: demand.status,
      dueDate: demand.due_date,
      assignees: demand.assignees,
      attachments: demand.attachments,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at
    };
  },

  // Update IT demand status (Admin only)
  updateStatus: async (id: string, status: string): Promise<ITDemand> => {
    const response = await api.put(`/it-demands/${id}`, { status });
    const demand = response.data;
    return {
      id: demand.id,
      title: demand.title,
      description: demand.description,
      requesterName: demand.requester_name,
      requesterEmail: demand.requester_email,
      requesterId: demand.requester_id,
      urgency: demand.urgency,
      priority: demand.priority,
      status: demand.status,
      dueDate: demand.due_date,
      assignees: demand.assignees,
      attachments: demand.attachments,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at
    };
  },

  // Update IT demand (full update - Admin only)
  update: async (id: string, data: UpdateITDemandInput): Promise<ITDemand> => {
    const response = await api.put(`/it-demands/${id}`, data);
    const demand = response.data;
    return {
      id: demand.id,
      title: demand.title,
      description: demand.description,
      requesterName: demand.requester_name,
      requesterEmail: demand.requester_email,
      requesterId: demand.requester_id,
      urgency: demand.urgency,
      priority: demand.priority,
      status: demand.status,
      dueDate: demand.due_date,
      assignees: demand.assignees,
      attachments: demand.attachments,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at
    };
  },

  // Delete IT demand (Admin only)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/it-demands/${id}`);
  }
};
