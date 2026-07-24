export enum Priority {
  LOW = 'Baixa',
  NORMAL = 'Normal',
  HIGH = 'Alta',
  URGENT = 'Urgente'
}

export enum TaskStatus {
  BACKLOG = 'Backlog',
  TODO = 'A Fazer',
  IN_PROGRESS = 'Em Progresso',
  REVIEW = 'Revisão',
  DONE = 'Concluído'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'Admin' | 'Gerente' | 'Membro' | 'Convidado';
  password?: string; // Added for edit simulation
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: Priority;
  assignees: string[]; // User IDs
  dueDate: string;
  projectId: string;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
  attachments: Attachment[];
  timeTracked: number; // in seconds
  isTracking: boolean;
  createdAt: string;
  createdBy?: string; // User ID of creator
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  budget: number;
  color: string;
  members: string[]; // List of User IDs
}

export interface Column {
  id: string;
  title: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Asset Library Types
export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  path: string; // Dropbox path for deletion
  type: AssetType;
  mimeType: string;
  size: number;
  projectId?: string;
  tags: string[];
  uploadedBy: string; // User ID
  uploadedAt: string;
  thumbnailUrl?: string;
}