import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Task, User } from '../types';
import { itDemandsAPI, ITDemand } from '../lib/itDemandsAPI';

// Email of the account that sees all IT demands, not just the ones assigned to them.
// Set your own admin email here (or move this to an env var / user role check).
const IT_ADMIN_EMAIL = 'admin@example.com';

// Helper: Get Monday of a given date
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
  return new Date(d.setDate(diff));
};

// Helper: Get Friday of a given date
const getFriday = (date: Date): Date => {
  const monday = getMonday(date);
  return new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
};

// Helper: Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper: Check if date is within range (inclusive)
const isWithinRange = (date: string, startDate: string, endDate: string): boolean => {
  return date >= startDate && date <= endDate;
};

// Helper: Map IT demand status IDs to display titles
const getITDemandStatusTitle = (status: string): string => {
  const statusMap: Record<string, string> = {
    'backlog': 'BACKLOG',
    'em-analise': 'EM ANÁLISE',
    'bloqueado': 'BLOQUEADO/AGUARDANDO',
    'em-desenvolvimento': 'EM DESENVOLVIMENTO',
    'em-teste': 'EM TESTE',
    'concluido': 'CONCLUÍDO'
  };
  return statusMap[status] || status.toUpperCase();
};

// Helper: Map task status IDs to display titles
const getTaskStatusTitle = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Status padrão
    'Backlog': 'BACKLOG',
    'A Fazer': 'A FAZER',
    'Em Progresso': 'EM PROGRESSO',
    'Revisão': 'REVISÃO',
    'Concluído': 'CONCLUÍDO',
    'done': 'CONCLUÍDO',

    // Colunas customizadas do Kanban (baseado na tabela board_columns)
    'arte_a_fazer': 'ARTE A FAZER',
    'arte_em_andamento': 'ARTE EM ANDAMENTO',
    'backlog': 'ENTRADAS',
    'concluido': 'CONCLUÍDO',
    'em_aprovação': 'EM APROVAÇÃO',
    'enviar_para_aprovação': 'ENVIAR PARA APROVAÇÃO',
    'publicar': 'PUBLICAR',
    'texto_em_andamento': 'TEXTO A FAZER',
    'trafego7': 'TRÁFEGO',
    'video_a_editar': 'VÍDEO A EDITAR',
    'video_a_gravar': 'VÍDEO A GRAVAR',
    'video_em_edição': 'VÍDEO EM EDIÇÃO'
  };
  return statusMap[status] || status.toUpperCase();
};

export const ReportsPage: React.FC = () => {
  const { tasks, users } = useApp();

  // Date range state (default to current week Monday-Friday)
  const currentMonday = getMonday(new Date());
  const currentFriday = getFriday(new Date());

  const [startDate, setStartDate] = useState<string>(formatDate(currentMonday));
  const [endDate, setEndDate] = useState<string>(formatDate(currentFriday));
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Fetch IT demands when component mounts
  const [itDemands, setItDemands] = React.useState<ITDemand[]>([]);

  React.useEffect(() => {
    const loadITDemands = async () => {
      try {
        const demands = await itDemandsAPI.getAll();
        setItDemands(demands);
      } catch (error) {
        console.error('Failed to load IT demands:', error);
      }
    };
    loadITDemands();
  }, []);

  // Filter tasks by date range
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const createdDate = task.createdAt.split('T')[0];
      return isWithinRange(createdDate, startDate, endDate);
    });
  }, [tasks, startDate, endDate]);

  // Filter IT demands by date range
  const filteredITDemands = useMemo(() => {
    return itDemands.filter(demand => {
      const createdDate = demand.createdAt.split('T')[0];
      return isWithinRange(createdDate, startDate, endDate);
    });
  }, [itDemands, startDate, endDate]);

  // Calculate user stats
  const userStats = useMemo(() => {
    return users.map(user => {
      // Regular tasks
      const userTasks = filteredTasks.filter(task => task.assignees.includes(user.id));

      const completedTasks = userTasks.filter(task =>
        task.status === 'Concluído' ||
        task.status === 'done' ||
        task.status === 'concluido'
      );
      const pendingTasks = userTasks.filter(task =>
        task.status !== 'Concluído' &&
        task.status !== 'done' &&
        task.status !== 'concluido'
      );

      // IT demands - special case for the IT admin account
      let userITDemands: ITDemand[] = [];
      let completedITDemands: ITDemand[] = [];
      let pendingITDemands: ITDemand[] = [];

      if (user.email === IT_ADMIN_EMAIL) {
        // Show ALL IT demands (completed and pending)
        completedITDemands = filteredITDemands.filter(demand => demand.status === 'concluido');
        pendingITDemands = filteredITDemands.filter(demand => demand.status !== 'concluido');
        userITDemands = filteredITDemands;
      } else {
        // For other users, show IT demands assigned to them
        userITDemands = filteredITDemands.filter(demand =>
          demand.assignees && demand.assignees.includes(user.id)
        );
        completedITDemands = userITDemands.filter(demand => demand.status === 'concluido');
        pendingITDemands = userITDemands.filter(demand => demand.status !== 'concluido');
      }

      return {
        user,
        tasks: {
          total: userTasks.length,
          completed: completedTasks,
          pending: pendingTasks
        },
        itDemands: {
          total: userITDemands.length,
          completed: completedITDemands,
          pending: pendingITDemands
        }
      };
    });
  }, [users, filteredTasks, filteredITDemands]);

  // Filter by selected user
  const displayedStats = useMemo(() => {
    if (selectedUser === 'all') return userStats;
    return userStats.filter(stat => stat.user.id === selectedUser);
  }, [userStats, selectedUser]);

  // Reset to current week
  const resetToCurrentWeek = () => {
    setStartDate(formatDate(currentMonday));
    setEndDate(formatDate(currentFriday));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios por Pessoa</h1>
        <p className="text-slate-500 dark:text-slate-400">Acompanhamento semanal de demandas por usuário</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Usuário
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">Todos os usuários</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={resetToCurrentWeek}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Semana Atual
            </button>
          </div>
        </div>
      </div>

      {/* User Reports */}
      <div className="space-y-4">
        {displayedStats.map(({ user, tasks: userTaskStats, itDemands: userITStats }) => (
          <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* User Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{user.name}</h3>
                    <p className="text-sm text-white/80">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-white">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userTaskStats.total + userITStats.total}</div>
                    <div className="text-xs text-white/80">Total Demandas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">{userTaskStats.completed.length + userITStats.completed.length}</div>
                    <div className="text-xs text-white/80">Concluídas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{userTaskStats.pending.length + userITStats.pending.length}</div>
                    <div className="text-xs text-white/80">Pendentes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            {userTaskStats.total > 0 && (
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">
                  Tarefas ({userTaskStats.total})
                </h4>

                {/* Completed Tasks */}
                {userTaskStats.completed.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                      Concluídas ({userTaskStats.completed.length})
                    </div>
                    <div className="space-y-2">
                      {userTaskStats.completed.map(task => (
                        <div key={task.id} className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white">{task.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Criada em: {new Date(task.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Concluída
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Tasks */}
                {userTaskStats.pending.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                      Pendentes ({userTaskStats.pending.length})
                    </div>
                    <div className="space-y-2">
                      {userTaskStats.pending.map(task => (
                        <div key={task.id} className="flex items-start justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white">{task.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Criada em: {new Date(task.createdAt).toLocaleDateString('pt-BR')} | Status: {getTaskStatusTitle(task.status)}
                            </div>
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            Pendente
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IT Demands Section */}
            {userITStats.total > 0 && (
              <div className="p-6">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white mb-4">
                  Demandas TI ({userITStats.total})
                  {user.email === IT_ADMIN_EMAIL && (
                    <span className="ml-2 text-xs text-primary-500">(Todas as demandas TI)</span>
                  )}
                </h4>

                {/* Completed IT Demands */}
                {userITStats.completed.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                      Concluídas ({userITStats.completed.length})
                    </div>
                    <div className="space-y-2">
                      {userITStats.completed.map(demand => (
                        <div key={demand.id} className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white">{demand.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Criada em: {new Date(demand.createdAt).toLocaleDateString('pt-BR')}
                              {demand.updatedAt && ` | Concluída em: ${new Date(demand.updatedAt).toLocaleDateString('pt-BR')}`}
                            </div>
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Concluída
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending IT Demands */}
                {userITStats.pending.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                      Pendentes ({userITStats.pending.length})
                    </div>
                    <div className="space-y-2">
                      {userITStats.pending.map(demand => (
                        <div key={demand.id} className="flex items-start justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900 dark:text-white">{demand.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Criada em: {new Date(demand.createdAt).toLocaleDateString('pt-BR')} | Status: {getITDemandStatusTitle(demand.status)}
                            </div>
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            Pendente
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No data message */}
            {userTaskStats.total === 0 && userITStats.total === 0 && (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                Nenhuma demanda no período selecionado
              </div>
            )}
          </div>
        ))}

        {displayedStats.length === 0 && (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-slate-500 dark:text-slate-400">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
