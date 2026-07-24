import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Bell, Lock, User, Monitor, Save, Loader2 } from 'lucide-react';
import { assetsAPI } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const { user, isDarkMode, toggleTheme, updateUser } = useApp();

  // Local state for profile form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatarUrl: ''
  });

  // Local state for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Loading state for avatar upload
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const handleSaveProfile = () => {
    if (user) {
      updateUser(user.id, formData);
      alert('Perfil atualizado com sucesso!');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha');
      }

      alert('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao alterar senha');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Upload to Dropbox via assets API
      const response = await assetsAPI.uploadTaskAttachment(
        file.name,
        base64Content,
        'avatars', // Use 'avatars' as project folder
        undefined, // No task ID
        user?.id || ''
      );

      if (response.success && response.asset) {
        // Update form data with the Dropbox URL
        setFormData({...formData, avatarUrl: response.asset.url});
        alert('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie suas preferências e perfil</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center">
            <User className="mr-3 text-primary-500" size={20}/>
            <h2 className="font-bold text-slate-900 dark:text-white">Perfil</h2>
         </div>
         <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
               <label className="relative group cursor-pointer">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleFileUpload}
                   className="hidden"
                 />
                 <div className="w-24 h-24 rounded-full border-4 border-primary-100 dark:border-primary-900 overflow-hidden flex items-center justify-center bg-primary-100 dark:bg-primary-900 relative">
                   {isUploadingAvatar ? (
                     <Loader2 size={32} className="text-primary-600 dark:text-primary-400 animate-spin" />
                   ) : formData.avatarUrl ? (
                     <img
                       src={formData.avatarUrl}
                       alt="Avatar"
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                       {formData.name.charAt(0).toUpperCase()}
                     </span>
                   )}
                 </div>
                 {!isUploadingAvatar && (
                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-white text-xs font-medium">Alterar</span>
                   </div>
                 )}
               </label>
               <div className="flex-1 w-full">
                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Foto de Perfil</p>
                 <p className="text-xs text-slate-400">Clique na imagem para fazer upload de uma nova foto.</p>
                 {formData.avatarUrl && (
                   <button
                     type="button"
                     onClick={() => setFormData({...formData, avatarUrl: ''})}
                     className="mt-2 text-xs text-red-600 hover:text-red-700"
                   >
                     Remover foto
                   </button>
                 )}
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input 
                 label="Nome Completo" 
                 value={formData.name} 
                 onChange={(e) => setFormData({...formData, name: e.target.value})}
               />
               <Input 
                 label="Email" 
                 value={formData.email} 
                 onChange={(e) => setFormData({...formData, email: e.target.value})}
               />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfile}>
                <Save size={16} className="mr-2" />
                Salvar Alterações
              </Button>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center">
            <Lock className="mr-3 text-red-500" size={20}/>
            <h2 className="font-bold text-slate-900 dark:text-white">Segurança</h2>
         </div>
         <div className="p-6 space-y-4">
            <Input
              label="Senha Atual"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              placeholder="Digite sua senha atual"
            />
            <Input
              label="Nova Senha"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              placeholder="Digite sua nova senha (mínimo 6 caracteres)"
            />
            <Input
              label="Confirmar Nova Senha"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              placeholder="Digite novamente a nova senha"
            />

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleChangePassword}
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                <Lock size={16} className="mr-2" />
                Alterar Senha
              </Button>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center">
            <Monitor className="mr-3 text-purple-500" size={20}/>
            <h2 className="font-bold text-slate-900 dark:text-white">Aparência</h2>
         </div>
         <div className="p-6 flex items-center justify-between">
            <div>
               <h3 className="font-medium text-slate-900 dark:text-white">Modo Escuro</h3>
               <p className="text-sm text-slate-500">Alternar entre tema claro (Branco) e escuro (Preto)</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}/>
            </button>
         </div>
      </div>
    </div>
  );
};