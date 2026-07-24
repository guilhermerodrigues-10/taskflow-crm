import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { tasks } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Filter tasks for the selected month/year
  const monthTasks = tasks
    .filter(t => {
      const d = new Date(t.dueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Calendário</h1>
          <p className="text-slate-500 dark:text-slate-400">Prazos de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}</p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
           <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronLeft size={20}/></button>
           <span className="px-4 font-medium min-w-[140px] text-center capitalize">
             {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
           </span>
           <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-6">
          {monthTasks.length === 0 ? (
             <div className="text-center py-20 text-slate-400">
                <CalendarIcon size={48} className="mx-auto mb-4 opacity-50"/>
                <p>Nenhuma tarefa agendada para este mês.</p>
             </div>
          ) : (
            monthTasks.map(task => (
              <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between shadow-sm">
                 <div className="flex items-start md:items-center">
                    <div className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-3 rounded-lg mr-4 text-center min-w-[60px]">
                       <div className="text-xs font-bold uppercase">{new Date(task.dueDate).toLocaleDateString('pt-BR', { month: 'short' })}</div>
                       <div className="text-xl font-bold">{new Date(task.dueDate).getDate()}</div>
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">{task.title}</h3>
                       <p className="text-sm text-slate-500">{formatDate(task.dueDate)}</p>
                    </div>
                 </div>
                 <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium 
                      ${task.priority === 'Alta' || task.priority === 'Urgente' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {task.priority}
                    </span>
                    <span className="text-sm text-slate-500 capitalize">{task.status.replace('_', ' ')}</span>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};