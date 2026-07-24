import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { User } from '../types';
import { Mail, Shield, Plus, X, Edit2, Trash2 } from 'lucide-react';

export const TeamPage: React.FC = () => {
  const { user: currentUser, users, addUser, updateUser, deleteUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Membro' as User['role'],
    password: ''
  });

  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        password: ''
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'Membro', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        // Only update password if provided
        ...(formData.password ? { password: formData.password } : {})
      });
    } else {
      addUser({
        ...formData,
        avatarUrl: `https://picsum.photos/32/32?random=${Date.now()}`
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja remover ${userName} da equipe?\n\nEsta ação irá:\n- Remover o usuário de todos os projetos\n- Remover o usuário de todas as tarefas atribuídas\n- Esta ação não pode ser desfeita`)) {
      deleteUser(userId);
    }
  };

  const canEdit = currentUser?.role === 'Admin'; // Apenas Admin pode gerenciar equipe

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Equipe</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie membros e permissões</p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} className="mr-2" /> Convidar Membro
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Função</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-full object-cover" src={user.avatarUrl} alt="" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-slate-500">
                    <Mail size={14} className="mr-2" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'Gerente' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEdit && (
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center transition-colors"
                        title="Editar membro"
                      >
                        <Edit2 size={16} className="mr-1"/> Editar
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center transition-colors"
                          title="Remover membro"
                        >
                          <Trash2 size={16} className="mr-1"/> Remover
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingUser ? 'Editar Membro' : 'Convidar Membro'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input 
                label="Nome Completo" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
              <Input 
                label="Email" 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                required 
              />
              
              <div>
                <Input 
                  label={editingUser ? "Nova Senha (opcional)" : "Definir Senha de Acesso"}
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder={editingUser ? "Deixe em branco para manter" : "Digite uma senha segura"}
                  required={!editingUser}
                />
                {!editingUser && (
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded">
                    ℹ️ A senha que você definir aqui será usada pelo membro para fazer login na plataforma.
                  </p>
                )}
              </div>

              <Select 
                label="Função"
                options={[
                  { label: 'Admin', value: 'Admin' },
                  { label: 'Gerente', value: 'Gerente' },
                  { label: 'Membro', value: 'Membro' },
                  { label: 'Convidado', value: 'Convidado' },
                ]}
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
              />
              
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