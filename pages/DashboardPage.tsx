import React from 'react';
import { useApp } from '../contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TaskStatus, Priority } from '../types';
import { Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { CHART_COLORS } from '../constants';

export const DashboardPage: React.FC = () => {
  const { tasks, projects, columns } = useApp();

  // Map status based on current columns or use defaults if they match
  const statusData = columns.map(col => ({
    name: col.title,
    value: tasks.filter(t => t.status === col.id).length
  }));

  const priorityData = Object.values(Priority).map(priority => ({
    name: priority,
    count: tasks.filter(t => t.priority === priority).length
  }));

  const totalTime = tasks.reduce((acc, t) => acc + t.timeTracked, 0);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE || t.status === 'done').length; // Check against constant or dynamic id
  const urgentTasks = tasks.filter(t => t.priority === Priority.URGENT).length;

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={CheckCircle} label="Tarefas Concluídas" value={completedTasks} color="bg-green-500" />
        <StatCard icon={Clock} label="Horas Rastreadas" value={(totalTime / 3600).toFixed(1) + 'h'} color="bg-blue-500" />
        <StatCard icon={AlertCircle} label="Tarefas Urgentes" value={urgentTasks} color="bg-red-500" />
        <StatCard icon={TrendingUp} label="Projetos Ativos" value={projects.length} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Distribuição de Tarefas</h3>
          <div className="h-80" style={{ minHeight: '320px' }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-slate-500 dark:text-slate-400">
                Nenhuma tarefa para exibir
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
             {statusData.map((entry, index) => (
               <div key={entry.name} className="flex items-center text-sm">
                 <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                 <span className="text-slate-600 dark:text-slate-400">{entry.name}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Priority Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Tarefas por Prioridade</h3>
          <div className="h-80" style={{ minHeight: '320px' }}>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-slate-500 dark:text-slate-400">
                Nenhuma tarefa para exibir
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};