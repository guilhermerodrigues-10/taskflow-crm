import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Kanban, Calendar, Settings, PieChart, Users, Folder, Image, Headphones } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, user } = useApp();

  // Define items with required roles
  // If requiredRoles is undefined, everyone can access
  const allNavItems = [
    { icon: LayoutDashboard, label: 'Painel', path: '/' },
    { icon: Kanban, label: 'Quadro Kanban', path: '/board' },
    { icon: Folder, label: 'Projetos', path: '/projects' },
    { icon: Image, label: 'Biblioteca de Assets', path: '/assets' },
    {
      icon: PieChart,
      label: 'Relatórios',
      path: '/reports',
      requiredRoles: ['Admin', 'Gerente']
    },
    {
      icon: Headphones,
      label: 'Demandas TI',
      path: '/it-demands',
      requiredRoles: ['Admin']
    },
    { icon: Users, label: 'Equipe', path: '/team' },
    { icon: Calendar, label: 'Calendário', path: '/calendar' },
  ];

  // Filter items based on current user role
  const navItems = allNavItems.filter(item => {
    if (!item.requiredRoles) return true;
    return user && item.requiredRoles.includes(user.role);
  });

  return (
    <aside 
      className={`
        fixed top-0 left-0 z-40 h-screen transition-transform bg-white border-r border-slate-200 dark:bg-black dark:border-slate-800
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`h-24 flex items-center justify-center px-6 border-b border-slate-200 dark:border-slate-800`}>
          <img
            src="/logo.png"
            alt="TaskFlow"
            className={`${sidebarOpen ? 'h-16' : 'h-12'} w-auto object-contain`}
          />
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center px-3 py-2.5 rounded-lg transition-colors group
                ${isActive 
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-500' 
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}
                ${!sidebarOpen && 'justify-center'}
              `}
            >
              <item.icon size={20} className={`${sidebarOpen ? 'mr-3' : 'mr-0'}`} />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-slate-900 text-white text-xs invisible opacity-0 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer Settings */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <NavLink
            to="/settings"
            className={`
              flex items-center px-3 py-2.5 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900
              ${!sidebarOpen && 'justify-center'}
            `}
          >
            <Settings size={20} className={`${sidebarOpen ? 'mr-3' : 'mr-0'}`} />
            {sidebarOpen && <span className="text-sm font-medium">Configurações</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};