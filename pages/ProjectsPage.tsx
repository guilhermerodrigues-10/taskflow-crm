import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Project } from '../types';
import { Plus, Edit2, Trash2, Folder, Briefcase, Layout, Lock } from 'lucide-react';
import { PROJECT_COLORS } from '../constants';

export const ProjectsPage: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, user } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    color: 'bg-blue-500'
  });

  // Permission Check
  const canManageProjects = user?.role === 'Admin' || user?.role === 'Gerente';

  const handleOpenModal = (project: Project | null = null) => {
    setEditingProject(project);
    if (project) {
      setFormData({
        name: project.name,
        clientName: project.clientName,
        color: project.color
      });
    } else {
      setFormData({ name: '', clientName: '', color: 'bg-blue-500' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      await updateProject(editingProject.id, formData);
    } else {
      await addProject(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Tem certeza? Isso pode afetar tarefas vinculadas.')) {
      await deleteProject(id);
    }
  };

  const colors = PROJECT_COLORS;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projetos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seus projetos e clientes</p>
        </div>
        {canManageProjects && (
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" /> Novo Projeto
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${project.color} bg-opacity-10`}>
                <Folder className={`${project.color.replace('bg-', 'text-')}`} size={24} />
              </div>
              <div className="flex space-x-2">
                {canManageProjects ? (
                  <>
                    <button onClick={() => handleOpenModal(project)} className="text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(project.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </>
                ) : (
                  <div title="Somente leitura" className="text-slate-300">
                    <Lock size={16} />
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{project.name}</h3>
            <div className="flex items-center text-sm text-slate-500 mb-4">
              <Briefcase size={14} className="mr-1" />
              {project.clientName}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-auto">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex -space-x-2">
                    {project.members && project.members.slice(0, 3).map((mid, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border border-white dark:border-slate-800 overflow-hidden">
                         <img src={`https://picsum.photos/32/32?random=${mid}`} alt="User" />
                      </div>
                    ))}
                 </div>
               </div>

               <Link to={`/projects/${project.id}`}>
                 <Button variant="outline" className="w-full">
                    <Layout size={16} className="mr-2" />
                    Ver Quadro
                 </Button>
               </Link>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && canManageProjects && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input 
                label="Nome do Projeto" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
              <Input
                label="Cliente"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full ${c} ${formData.color === c ? 'ring-2 ring-offset-2 ring-slate-500' : ''}`}
                      onClick={() => setFormData({...formData, color: c})}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};