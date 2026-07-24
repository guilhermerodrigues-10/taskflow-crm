import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Task, Priority } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus, Check, Edit2, Trash2, X, Filter } from 'lucide-react';
import { TaskModal } from '../modals/TaskModal';

interface KanbanBoardProps {
  projectId?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId }) => {
  const { tasks, columns, moveTask, setActiveDragTask, addColumn, updateColumn, deleteColumn, projects, user } = useApp();

  // Log when tasks change for debugging
  useEffect(() => {
    console.log(`📊 KanbanBoard: Tasks updated - ${tasks.length} total tasks`);
  }, [tasks]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<string>('all'); // 'all' | 'mine' | projectId

  // Column Management States
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');

  // Permission Checks
  const canManageColumns = user?.role === 'Admin' || user?.role === 'Gerente';

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Note: WebSocket real-time updates are handled in AppContext
  // Tasks automatically update when created/updated/deleted via WebSocket

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (columnId: string) => {
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTask(taskId, status);
    }
    setActiveDragTask(null);
    setDragOverColumn(null);
  };

  // Modified to accept an optional status (column ID)
  const handleNewTask = (status?: string) => {
    let initialTask: Partial<Task> = {};
    
    // If we are on a specific project page, force that project
    if (projectId) {
      initialTask.projectId = projectId;
    } 
    // If we are on the main board but filtering by a specific project, pre-fill it
    else if (viewFilter !== 'all' && viewFilter !== 'mine') {
      initialTask.projectId = viewFilter;
    }

    // Pre-fill status if provided (clicked from column)
    if (status) {
      initialTask.status = status;
    }

    if (Object.keys(initialTask).length > 0) {
      setEditingTask(initialTask as Task);
    } else {
      setEditingTask(null);
    }
    setIsModalOpen(true);
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      addColumn(newColumnTitle);
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  const handleUpdateColumn = (id: string) => {
    if (editColumnTitle.trim()) {
      updateColumn(id, editColumnTitle);
      setEditingColumnId(null);
    }
  };

  // Filter Logic: Global vs Project Specific vs My Tasks
  const filteredTasks = tasks.filter(task => {
    // 1. Mandatory Project Prop (if component is used inside ProjectDetailsPage)
    if (projectId && task.projectId !== projectId) {
      return false;
    }

    // 2. View Filter (Only applies if NOT inside ProjectDetailsPage)
    if (!projectId) {
      if (viewFilter === 'mine') {
        // Show tasks assigned to current user
        if (!user || !task.assignees.includes(user.id)) return false;
      } else if (viewFilter !== 'all') {
        // Show specific project selected in dropdown
        if (task.projectId !== viewFilter) return false;
      }
    }

    // 3. Priority Filter
    const matchesPriority = filterPriority === 'Todas' || task.priority === filterPriority;

    // 4. Search Filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPriority && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Board Controls */}
      <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full xl:w-auto">
           {/* View Selector (Only visible on main board) */}
           {!projectId && (
             <div className="relative group min-w-[200px]">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Filter size={16} className="text-slate-500" />
               </div>
               <select
                 className="pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                 value={viewFilter}
                 onChange={(e) => setViewFilter(e.target.value)}
               >
                 <option value="all">Visão Geral (Tudo)</option>
                 <option value="mine">Minhas Tarefas</option>
                 <optgroup label="Por Projeto">
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </optgroup>
               </select>
             </div>
           )}

           <select 
             className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
             value={filterPriority}
             onChange={(e) => setFilterPriority(e.target.value)}
           >
             <option value="Todas">Todas Prioridades</option>
             {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
           </select>
           
           <input 
             type="text"
             placeholder="Buscar tarefas..."
             className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
        
        <button 
          onClick={() => handleNewTask()}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Plus size={16} className="mr-2" />
          Nova Tarefa
        </button>
      </div>

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {columns.map(column => {
            const columnTasks = filteredTasks
              .filter(t => t.status === column.id)
              .sort((a, b) => {
                // Sort by due date (ascending - closest deadline first)
                // Tasks without due date go to the end
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              });

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`w-80 flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 transition-all duration-200 h-full max-h-[calc(100vh-200px)] group/column ${
                  dragOverColumn === column.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  {editingColumnId === column.id && canManageColumns ? (
                     <div className="flex items-center w-full">
                       <input 
                         autoFocus
                         className="flex-1 bg-white dark:bg-slate-800 border border-blue-500 rounded px-2 py-1 text-sm mr-2 outline-none"
                         value={editColumnTitle}
                         onChange={(e) => setEditColumnTitle(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumn(column.id)}
                       />
                       <button onClick={() => handleUpdateColumn(column.id)} className="text-green-500 mr-1"><Check size={16}/></button>
                       <button onClick={() => setEditingColumnId(null)} className="text-red-500"><X size={16}/></button>
                     </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                        {column.title}
                        <span className="ml-2 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300">
                          {columnTasks.length}
                        </span>
                      </h3>
                      <div className="flex items-center opacity-0 group-hover/column:opacity-100 transition-opacity">
                         {/* Add Task Button in Column Header */}
                         <button 
                            onClick={() => handleNewTask(column.id)}
                            className="text-slate-400 hover:text-green-500 mr-2"
                            title="Adicionar nesta coluna"
                         >
                            <Plus size={16} />
                         </button>

                         {canManageColumns && (
                            <>
                              <button 
                                onClick={() => { setEditingColumnId(column.id); setEditColumnTitle(column.title); }}
                                className="text-slate-400 hover:text-blue-500 mr-2"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => deleteColumn(column.id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                         )}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3 relative">
                  {/* Drop Zone Indicator */}
                  {dragOverColumn === column.id && (
                    <div className="absolute inset-0 border-4 border-dashed border-blue-500 rounded-lg bg-blue-100/20 dark:bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
                      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg">
                        Soltar aqui
                      </div>
                    </div>
                  )}

                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                    />
                  ))}

                  {/* Empty State / Add Button at bottom */}
                  {columnTasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      Sem tarefas
                    </div>
                  )}

                  <button
                    onClick={() => handleNewTask(column.id)}
                    className="w-full py-2 rounded-lg border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-sm flex items-center justify-center transition-colors group"
                  >
                    <Plus size={14} className="mr-2 group-hover:text-blue-500" />
                    Adicionar
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Column Button (Only Admin/Manager) */}
          {canManageColumns && (
            <div className="w-80 flex-shrink-0">
               {!isAddingColumn ? (
                 <button 
                   onClick={() => setIsAddingColumn(true)}
                   className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center font-medium"
                 >
                   <Plus size={20} className="mr-2" />
                   Adicionar Coluna
                 </button>
               ) : (
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
                   <input 
                     autoFocus
                     placeholder="Título da coluna"
                     className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm mb-3 bg-transparent dark:text-white"
                     value={newColumnTitle}
                     onChange={(e) => setNewColumnTitle(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                   />
                   <div className="flex justify-end space-x-2">
                     <button onClick={() => setIsAddingColumn(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                     <button onClick={handleAddColumn} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Adicionar</button>
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <TaskModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          initialTask={editingTask}
        />
      )}
    </div>
  );
};