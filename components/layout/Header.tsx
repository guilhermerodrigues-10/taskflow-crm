import React, { useState } from 'react';
import { Bell, Search, Moon, Sun, Menu, User as UserIcon, LogOut, Check, RefreshCw, Phone } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { SupportModal } from '../modals/SupportModal';

export const Header: React.FC = () => {
  const { user, logout, toggleTheme, isDarkMode, toggleSidebar, notifications, markAsRead, markAllAsRead, refreshData } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/80 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="p-2 mr-4 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu size={20} />
        </button>
        
        {/* Search Bar */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar tarefas, projetos..." 
            className="pl-10 pr-4 py-2 w-64 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Support Button */}
        <button
          onClick={() => setShowSupportModal(true)}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Suporte TI"
        >
          <Phone size={20} />
        </button>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Atualizar dados"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notificações</h3>
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700">Marcar todas como lidas</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">Sem notificações</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n.id)}
                      className={`p-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${n.read ? 'opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(n.date).toLocaleTimeString()} - {new Date(n.date).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-700">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center"
              >
                <LogOut size={14} className="mr-2" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </header>
  );
};