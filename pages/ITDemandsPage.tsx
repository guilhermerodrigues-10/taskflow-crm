import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, useDroppable, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreVertical, Clock, AlertCircle, AlertTriangle, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ITDemandModal } from '../components/modals/ITDemandModal';
import { itDemandsAPI, ITDemand } from '../lib/itDemandsAPI';
import { useSocket } from '../lib/useSocket';

const urgencyColors = {
  'Baixa': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Média': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Alta': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Crítica': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

const urgencyIcons = {
  'Baixa': CheckCircle,
  'Média': Clock,
  'Alta': AlertTriangle,
  'Crítica': AlertCircle
};

interface DemandCardProps {
  demand: ITDemand;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DemandCard: React.FC<DemandCardProps> = ({ demand, onClick, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: demand.id,
    data: { status: demand.status }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const UrgencyIcon = urgencyIcons[demand.urgency];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow relative"
    >
      <div {...attributes} {...listeners} onClick={onClick} className="cursor-move">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-slate-900 dark:text-white flex-1 pr-2">
            {demand.title}
          </h4>
          <div className="relative">
            <button
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg flex items-center"
                  >
                    <Pencil size={14} className="mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg flex items-center"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {demand.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
            {demand.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full flex items-center ${urgencyColors[demand.urgency]}`}>
            <UrgencyIcon size={12} className="mr-1" />
            {demand.urgency}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {demand.requesterName}
          </span>
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  color: string;
  demands: ITDemand[];
  onCardClick: (demand: ITDemand) => void;
  onCardEdit: (demand: ITDemand) => void;
  onCardDelete: (demand: ITDemand) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  id,
  title,
  color,
  demands,
  onCardClick,
  onCardEdit,
  onCardDelete
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 rounded-lg p-4 flex flex-col transition-colors ${
        isOver ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900'
      }`}
      style={{ maxHeight: 'calc(100vh - 280px)' }}
    >
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <span className="ml-2 px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-full">
            {demands.length}
          </span>
        </div>
      </div>

      <SortableContext items={demands.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {demands.map((demand) => (
            <DemandCard
              key={demand.id}
              demand={demand}
              onClick={() => onCardClick(demand)}
              onEdit={() => onCardEdit(demand)}
              onDelete={() => onCardDelete(demand)}
            />
          ))}
          {demands.length === 0 && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
              Sem tarefas
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export const ITDemandsPage: React.FC = () => {
  const { user } = useApp();
  const socket = useSocket();
  const [selectedDemand, setSelectedDemand] = useState<ITDemand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [demands, setDemands] = useState<ITDemand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Only Admins can access IT Demands
  const isAdmin = user?.role === 'Admin';

  console.log('🔐 IT Demands Access Check:', {
    userEmail: user?.email,
    userRole: user?.role,
    isAdmin
  });

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Acesso Negado
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Apenas administradores podem acessar as Demandas TI.
          </p>
        </div>
      </div>
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // IT-specific columns
  const [columns] = useState([
    { id: 'backlog', title: 'Backlog', color: '#64748b' },
    { id: 'em-analise', title: 'Em Análise', color: '#3b82f6' },
    { id: 'bloqueado', title: 'Bloqueado/Aguardando', color: '#ef4444' },
    { id: 'em-desenvolvimento', title: 'Em Desenvolvimento', color: '#f59e0b' },
    { id: 'em-teste', title: 'Em Teste', color: '#8b5cf6' },
    { id: 'concluido', title: 'Concluído', color: '#10b981' }
  ]);

  // Load demands from API (only for Admins)
  useEffect(() => {
    if (isAdmin) {
      loadDemands();
    }
  }, [user, isAdmin]);

  // WebSocket real-time updates (only for Admins)
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleDemandCreated = () => {
      console.log('🔔 New IT demand created, refreshing...');
      loadDemands();
    };

    const handleDemandUpdated = () => {
      console.log('🔔 IT demand updated, refreshing...');
      loadDemands();
    };

    const handleDemandDeleted = () => {
      console.log('🔔 IT demand deleted, refreshing...');
      loadDemands();
    };

    socket.on('it-demand:created', handleDemandCreated);
    socket.on('it-demand:updated', handleDemandUpdated);
    socket.on('it-demand:deleted', handleDemandDeleted);

    return () => {
      socket.off('it-demand:created', handleDemandCreated);
      socket.off('it-demand:updated', handleDemandUpdated);
      socket.off('it-demand:deleted', handleDemandDeleted);
    };
  }, [socket, user, isAdmin]);

  const loadDemands = async () => {
    try {
      console.log('🔄 Loading IT demands...');
      setIsLoading(true);
      const data = await itDemandsAPI.getAll();
      console.log(`✅ Loaded ${data.length} IT demands:`, data);
      setDemands(data);
    } catch (error) {
      console.error('❌ Error loading IT demands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active demand
    const activeDemand = demands.find(d => d.id === activeId);
    if (!activeDemand) return;

    // Determine target column
    let targetColumn = overId;

    // Check if dropped over a column
    const isDroppedOnColumn = columns.find(c => c.id === overId);
    if (isDroppedOnColumn) {
      targetColumn = overId;
    } else {
      // Dropped on another card, use that card's column
      const targetDemand = demands.find(d => d.id === overId);
      if (targetDemand) {
        targetColumn = targetDemand.status;
      }
    }

    // If same column, no update needed
    if (activeDemand.status === targetColumn) {
      return;
    }

    console.log(`🔄 Moving demand ${activeId} from ${activeDemand.status} to ${targetColumn}`);

    // Optimistic update
    setDemands(prevDemands =>
      prevDemands.map(demand =>
        demand.id === activeId
          ? { ...demand, status: targetColumn }
          : demand
      )
    );

    // Update on backend
    try {
      await itDemandsAPI.updateStatus(activeId, targetColumn);
      console.log(`✅ Demand ${activeId} moved to ${targetColumn}`);
    } catch (error) {
      console.error('❌ Error updating demand status:', error);
      // Revert on error
      loadDemands();
    }
  };

  const handleDeleteDemand = async (demand: ITDemand) => {
    if (!confirm(`Tem certeza que deseja excluir a demanda "${demand.title}"?`)) {
      return;
    }

    try {
      await itDemandsAPI.delete(demand.id);
      console.log(`🗑️ Demand ${demand.id} deleted`);
      // Remove from local state
      setDemands(prevDemands => prevDemands.filter(d => d.id !== demand.id));
    } catch (error) {
      console.error('❌ Error deleting demand:', error);
      alert('Erro ao excluir demanda. Tente novamente.');
    }
  };

  const getDemandsByStatus = (status: string) => {
    return demands
      .filter(d => d.status === status)
      .sort((a, b) => {
        // Sort by due date (ascending - closest deadline first)
        // Demands without due date go to the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Carregando demandas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Demandas TI</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie solicitações e suporte técnico
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedDemand(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          <Plus size={20} className="mr-2" />
          Nova Demanda
        </button>
      </div>

      <div className="w-full overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="inline-flex gap-4 pb-4 min-w-full">
            {columns.map(column => (
              <DroppableColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                demands={getDemandsByStatus(column.id)}
                onCardClick={(demand) => {
                  setSelectedDemand(demand);
                  setIsModalOpen(true);
                }}
                onCardEdit={(demand) => {
                  setSelectedDemand(demand);
                  setIsModalOpen(true);
                }}
                onCardDelete={handleDeleteDemand}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border-2 border-primary-500 opacity-90">
                <p className="font-medium text-slate-900 dark:text-white">
                  {demands.find(d => d.id === activeId)?.title}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {isModalOpen && (
        <ITDemandModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDemand(null);
          }}
          demand={selectedDemand}
        />
      )}
    </>
  );
};
