import { Priority, TaskStatus, User, Project, Task, Column } from './types';

// 16 cores distintas para gráficos (sem repetição até 16 colunas)
export const CHART_COLORS: string[] = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#6366f1', // indigo
  '#a855f7', // purple
  '#e11d48', // rose
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#78716c', // stone
];

// 12 cores Tailwind para projetos
export const PROJECT_COLORS: string[] = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-rose-500',
  'bg-amber-500',
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Silva', email: 'alex@taskflow.com', role: 'Admin', avatarUrl: 'https://picsum.photos/32/32?random=1' },
  { id: 'u2', name: 'Sara Costa', email: 'sara@taskflow.com', role: 'Gerente', avatarUrl: 'https://picsum.photos/32/32?random=2' },
  { id: 'u3', name: 'Miguel Reis', email: 'miguel@taskflow.com', role: 'Membro', avatarUrl: 'https://picsum.photos/32/32?random=3' },
  { id: 'u4', name: 'Ana Souza', email: 'ana@taskflow.com', role: 'Membro', avatarUrl: 'https://picsum.photos/32/32?random=4' },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Redesign do Site', clientName: 'Acme Corp', budget: 15000, color: 'bg-blue-500', members: ['u1', 'u2'] },
  { id: 'p2', name: 'App Mobile MVP', clientName: 'Stark Ind', budget: 45000, color: 'bg-purple-500', members: ['u1', 'u3'] },
  { id: 'p3', name: 'Campanha de Marketing', clientName: 'Globex', budget: 8000, color: 'bg-green-500', members: ['u2', 'u4'] },
];

export const BOARD_COLUMNS: Column[] = [
  { id: TaskStatus.BACKLOG, title: 'Backlog' },
  { id: TaskStatus.TODO, title: 'A Fazer' },
  { id: TaskStatus.IN_PROGRESS, title: 'Em Progresso' },
  { id: TaskStatus.REVIEW, title: 'Revisão' },
  { id: TaskStatus.DONE, title: 'Concluído' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Implementar Autenticação',
    description: 'Configurar autenticação JWT e gerenciamento de sessão de usuário.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    assignees: ['u1'],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    projectId: 'p1',
    tags: ['Backend', 'Segurança'],
    subtasks: [
      { id: 'st1', title: 'Desenhar Schema do DB', completed: true },
      { id: 'st2', title: 'Configurar Middleware', completed: false }
    ],
    attachments: [],
    timeTracked: 3600,
    isTracking: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    title: 'Design do Dashboard',
    description: 'Criar mockups de alta fidelidade para a visão principal do painel.',
    status: TaskStatus.TODO,
    priority: Priority.NORMAL,
    assignees: ['u2'],
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    projectId: 'p1',
    tags: ['Design', 'UI/UX'],
    subtasks: [],
    attachments: [],
    timeTracked: 0,
    isTracking: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 't3',
    title: 'Corrigir Bug de Navegação Mobile',
    description: 'A barra lateral não recolhe corretamente em telas pequenas.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.URGENT,
    assignees: ['u1', 'u3'],
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    projectId: 'p2',
    tags: ['Bug', 'Mobile'],
    subtasks: [],
    attachments: [],
    timeTracked: 1200,
    isTracking: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 't4',
    title: 'Estratégia de Marketing Q3',
    description: 'Definir canais principais e alocação de orçamento para o terceiro trimestre.',
    status: TaskStatus.DONE,
    priority: Priority.HIGH,
    assignees: ['u2'],
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    projectId: 'p3',
    tags: ['Estratégia'],
    subtasks: [],
    attachments: [],
    timeTracked: 18000,
    isTracking: false,
    createdAt: new Date().toISOString()
  },
];