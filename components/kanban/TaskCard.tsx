import React from 'react';
import { Clock, MessageSquare, Paperclip, MoreHorizontal, Play, Pause, Calendar } from 'lucide-react';
import { Task, Priority } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { Avatar } from '../ui/Avatar';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { setActiveDragTask, toggleTimeTracking, projects, users } = useApp();
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setActiveDragTask(task.id);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateColor = (dateString: string) => {
    if (!dateString) return '';
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600 dark:text-red-400 font-semibold'; // Vencido
    if (diffDays === 0) return 'text-orange-600 dark:text-orange-400 font-semibold'; // Hoje
    if (diffDays <= 3) return 'text-orange-500 dark:text-orange-400'; // Próximo
    return 'text-slate-500 dark:text-slate-400'; // Normal
  };

  const priorityColors = {
    [Priority.LOW]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    [Priority.NORMAL]: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    [Priority.HIGH]: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    [Priority.URGENT]: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const project = projects.find(p => p.id === task.projectId);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setActiveDragTask(null)}
      onClick={() => onEdit(task)}
      className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer active:cursor-grabbing hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </div>
      </div>

      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 leading-tight group-hover:text-primary-500 dark:group-hover:text-primary-500 transition-colors">
        {task.title}
      </h4>

      {/* Created At & Creator */}
      {task.createdAt && (
        <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 mb-1">
          <Clock size={12} className="mr-1" />
          Criada em {formatDateTime(task.createdAt)}
        </div>
      )}
      {task.createdBy && (() => {
        const creator = users.find(u => u.id === task.createdBy);
        return creator ? (
          <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 mb-2">
            <Avatar name={creator.name} avatarUrl={creator.avatarUrl} size="xs" className="mr-1" />
            <span>Criada por {creator.name}</span>
          </div>
        ) : null;
      })()}

      {project && (
        <div className="flex items-center mb-3">
          <span className={`w-2 h-2 rounded-full mr-2 ${project.color}`}></span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{project.clientName}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          {/* User Avatars with Initials */}
          <div className="flex -space-x-2">
            {task.assignees.map((userId) => {
              const user = users.find(u => u.id === userId);
              return user ? (
                <div key={userId} className="border-2 border-white dark:border-slate-800 rounded-full">
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                </div>
              ) : null;
            })}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
           {/* Date Display (Conditional) */}
           {task.dueDate && (
             <div className={`flex items-center text-xs ${getDateColor(task.dueDate)}`} title={`Prazo: ${formatDate(task.dueDate)}`}>
                <Calendar size={14} className="mr-1" />
                {formatDate(task.dueDate)}
             </div>
           )}

           {/* Time Tracker Control */}
           {(task.isTracking || task.timeTracked > 0) && (
             <button
               onClick={(e) => { e.stopPropagation(); toggleTimeTracking(task.id); }}
               className={`flex items-center text-xs hover:text-primary-500 transition-colors ${task.isTracking ? 'text-primary-500 animate-pulse' : ''}`}
               title={task.isTracking ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
             >
               {task.isTracking ? <Pause size={14} className="mr-1"/> : <Clock size={14} className="mr-1"/>}
               {formatTime(task.timeTracked)}
             </button>
           )}
           
           {(task.subtasks?.length ?? 0) > 0 && (
             <div className="flex items-center text-xs">
               <Paperclip size={14} className="mr-1" />
               {task.subtasks.filter(t => t.completed).length}/{task.subtasks.length}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};