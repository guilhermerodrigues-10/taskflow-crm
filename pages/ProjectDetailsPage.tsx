import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { Button } from '../components/ui/Button';
import { Briefcase, DollarSign, Users, Plus, Check } from 'lucide-react';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, users, toggleProjectMember } = useApp();
  const [showMemberMenu, setShowMemberMenu] = useState(false);

  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return <div className="p-8 text-center">Projeto não encontrado. <Navigate to="/projects" /></div>;
  }

  const projectMembers = users.filter(u => project.members.includes(u.id));

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2 rounded-lg ${project.color} bg-opacity-20`}>
                <Briefcase size={20} className={project.color.replace('bg-', 'text-')} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 ml-1">
              <span>{project.clientName}</span>
              <span className="flex items-center"><DollarSign size={14} className="mr-0.5" /> {project.budget.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                <Users size={16} className="mr-2" />
                Membros ({projectMembers.length})
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {projectMembers.map(member => (
                    <img 
                      key={member.id} 
                      src={member.avatarUrl} 
                      alt={member.name}
                      title={member.name} 
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800"
                    />
                  ))}
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowMemberMenu(!showMemberMenu)}
                    className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-500 transition-colors"
                  >
                    <Plus size={16} />
                  </button>

                  {/* Member Selection Dropdown */}
                  {showMemberMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-2">
                       <h4 className="text-xs font-semibold text-slate-500 uppercase px-2 py-2 mb-1">Gerenciar Equipe</h4>
                       <div className="max-h-60 overflow-y-auto space-y-1">
                         {users.map(u => {
                           const isMember = project.members.includes(u.id);
                           return (
                             <button
                               key={u.id}
                               onClick={() => toggleProjectMember(project.id, u.id)}
                               className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                             >
                               <div className="flex items-center">
                                 <img src={u.avatarUrl} className="w-6 h-6 rounded-full mr-2" />
                                 <span className="text-slate-800 dark:text-slate-200">{u.name}</span>
                               </div>
                               {isMember && <Check size={16} className="text-blue-500" />}
                             </button>
                           );
                         })}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard projectId={projectId} />
      </div>
    </div>
  );
};