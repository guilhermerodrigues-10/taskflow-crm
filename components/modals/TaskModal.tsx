import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, File as FileIcon, Trash2, Check, Clock, Download, Eye, Play, Pause, Square, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Task, Priority, Attachment } from '../../types';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { assetsAPI } from '../../lib/api';
import { useSocket } from '../../lib/useSocket';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, initialTask }) => {
  const { addTask, updateTask, deleteTask, toggleTimeTracking, projects, users, columns, user } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socket = useSocket();

  // Form State
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: Priority.NORMAL,
    status: columns[0]?.id || 'backlog',
    projectId: '',
    assignees: [],
    attachments: [],
    dueDate: undefined
  });

  // Stopwatch State
  const [timeSpent, setTimeSpent] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

  // Store pending files to upload after task creation
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Permissions
  const canDeleteTask = user?.role === 'Admin' || user?.role === 'Gerente';

  useEffect(() => {
    // Reset saving state when modal opens
    setIsSaving(false);

    // Check if initialTask is a full task (has ID) or just a partial preset (from "Add Task" button with presets)
    if (initialTask?.id) {
      // EDIT MODE
      setFormData({
        ...initialTask,
        dueDate: initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().slice(0, 16) : ''
      });

      // Calculate Hours, Minutes, and Seconds from total seconds
      const totalSeconds = initialTask.timeTracked || 0;
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setTimeSpent({ hours: h, minutes: m, seconds: s });

      // Restore timer running state
      setIsTimerRunning(initialTask.isTracking || false);

    } else {
      // CREATE MODE (with possible presets)
      const presets = initialTask ? { ...initialTask } : {};
      // Force assignees to be empty for new tasks - user must select explicitly
      delete presets.assignees;

      setFormData({
        title: '',
        description: '',
        priority: Priority.NORMAL,
        // Use preset status if available, else default
        status: initialTask?.status || columns[0]?.id || 'backlog',
        // Use preset projectId if available, else default
        projectId: initialTask?.projectId || projects[0]?.id || '',
        assignees: [], // Start with empty assignees - user must select
        attachments: [],
        dueDate: '',
        tags: [],
        subtasks: [],
        ...presets // Apply any other presets passed (except assignees)
      });
      setTimeSpent({ hours: 0, minutes: 0, seconds: 0 });
    }

    // Cleanup timer on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [initialTask, isOpen, projects, users, columns]);

  // Timer effect - runs the stopwatch
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeSpent(prev => {
          let newSeconds = prev.seconds + 1;
          let newMinutes = prev.minutes;
          let newHours = prev.hours;

          if (newSeconds >= 60) {
            newSeconds = 0;
            newMinutes += 1;
          }

          if (newMinutes >= 60) {
            newMinutes = 0;
            newHours += 1;
          }

          return { hours: newHours, minutes: newMinutes, seconds: newSeconds };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // WebSocket listener for real-time attachment updates
  useEffect(() => {
    if (!socket || !initialTask?.id) return;

    const handleAttachmentAdded = (data: { taskId: string; attachment: Attachment }) => {
      // Only update if this is the current task
      if (data.taskId === initialTask.id) {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), data.attachment]
        }));
      }
    };

    const handleAttachmentDeleted = (data: { taskId: string; attachmentId: string }) => {
      // Only update if this is the current task
      if (data.taskId === initialTask.id) {
        setFormData(prev => ({
          ...prev,
          attachments: (prev.attachments || []).filter(a => a.id !== data.attachmentId)
        }));
      }
    };

    socket.on('task:attachment-added', handleAttachmentAdded);
    socket.on('task:attachment-deleted', handleAttachmentDeleted);

    return () => {
      socket.off('task:attachment-added', handleAttachmentAdded);
      socket.off('task:attachment-deleted', handleAttachmentDeleted);
    };
  }, [socket, initialTask?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSaving) return;

    // Validate required fields
    if (!formData.title?.trim()) {
      alert('Por favor, preencha o título da tarefa');
      return;
    }

    if (!formData.assignees || formData.assignees.length === 0) {
      alert('Por favor, selecione pelo menos um responsável');
      return;
    }

    setIsSaving(true);

    try {
      // Convert Hours/Minutes/Seconds back to total seconds
      const totalSeconds = (Number(timeSpent.hours) * 3600) + (Number(timeSpent.minutes) * 60) + Number(timeSpent.seconds);

      if (initialTask?.id) {
        // UPDATE: include all fields including timeTracked and isTracking
        const updateData = {
          title: formData.title,
          description: formData.description || '',
          status: formData.status,
          priority: formData.priority,
          dueDate: formData.dueDate && formData.dueDate !== '' ? new Date(formData.dueDate).toISOString() : null,
          projectId: formData.projectId,
          assignees: formData.assignees || [],
          subtasks: formData.subtasks || [],
          tags: formData.tags || [],
          timeTracked: totalSeconds,
          isTracking: isTimerRunning
        };
        await updateTask(initialTask.id, updateData);
        onClose();
      } else {
        // CREATE: exclude timeTracked (will be 0 by default)
        const createData = {
          title: formData.title!,
          description: formData.description || '',
          status: formData.status!,
          priority: formData.priority!,
          dueDate: formData.dueDate && formData.dueDate !== '' ? new Date(formData.dueDate).toISOString() : null,
          projectId: formData.projectId!,
          assignees: formData.assignees || [],
          subtasks: formData.subtasks || [],
          tags: formData.tags || []
        };

        console.log('📋 Creating task with data:', createData);
        console.log('📍 Task status:', createData.status);

        // Create task and get the ID
        const newTaskId = await addTask(createData);
        console.log('✅ Task created with ID:', newTaskId);

        // Upload pending files after task creation with the task ID
        if (pendingFiles.length > 0) {
          console.log(`📤 Uploading ${pendingFiles.length} pending files to task ${newTaskId}...`);
          setIsUploading(true);

          try {
            for (const file of pendingFiles) {
              try {
                const reader = new FileReader();
                const base64Content = await new Promise<string>((resolve, reject) => {
                  reader.onload = () => {
                    const base64String = reader.result as string;
                    resolve(base64String.split(',')[1]);
                  };
                  reader.onerror = () => reject(new Error('Failed to read file'));
                  reader.readAsDataURL(file);
                });

                await assetsAPI.uploadTaskAttachment(
                  file.name,
                  base64Content,
                  formData.projectId!,
                  newTaskId, // Now we have the task ID!
                  user?.id || ''
                );
                console.log(`✅ Uploaded: ${file.name} to task ${newTaskId}`);
              } catch (error) {
                console.error(`❌ Failed to upload ${file.name}:`, error);
                alert(`Erro ao fazer upload de ${file.name}`);
              }
            }
          } finally {
            setIsUploading(false);
          }
        }

        // Close modal immediately - WebSocket will update the UI
        onClose();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Erro ao salvar tarefa. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (initialTask?.id && confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(initialTask.id);
      onClose();
    }
  };

  const toggleAssignee = (userId: string) => {
    const currentAssignees = formData.assignees || [];
    if (currentAssignees.includes(userId)) {
      setFormData({ ...formData, assignees: currentAssignees.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assignees: [...currentAssignees, userId] });
    }
  };

  const handleDownloadAttachment = (url: string, filename: string) => {
    // Convert Dropbox URL to force download
    let downloadUrl = url;

    // If it's a Dropbox URL, add ?dl=1 to force download
    if (url.includes('dropbox')) {
      downloadUrl = url.replace(/[?&]dl=0/, '?dl=1');
      if (!downloadUrl.includes('dl=1')) {
        downloadUrl += (url.includes('?') ? '&' : '?') + 'dl=1';
      }
    }

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // If editing existing task, upload immediately
      if (initialTask?.id) {
        setIsUploading(true);
        try {
          // Convert file to base64
          const reader = new FileReader();
          reader.readAsDataURL(file);

          reader.onload = async () => {
            const base64String = reader.result as string;
            const base64Content = base64String.split(',')[1];

            try {
              // Upload to Dropbox and save to database
              const response = await assetsAPI.uploadTaskAttachment(
                file.name,
                base64Content,
                formData.projectId || '',
                initialTask.id,
                user?.id || ''
              );

              if (response.success && response.asset) {
                // Add the uploaded asset to attachments
                const newAttachment: Attachment = {
                  id: response.asset.id,
                  name: response.asset.name,
                  type: response.asset.type,
                  url: response.asset.url
                };
                setFormData({ ...formData, attachments: [...(formData.attachments || []), newAttachment] });
              }
            } catch (uploadError) {
              console.error('Error uploading file:', uploadError);
              alert('Erro ao fazer upload do arquivo. Verifique se o Dropbox está configurado.');
            } finally {
              setIsUploading(false);
            }
          };

          reader.onerror = () => {
            console.error('Error reading file');
            alert('Erro ao ler o arquivo.');
            setIsUploading(false);
          };
        } catch (error) {
          console.error('Error handling file upload:', error);
          alert('Erro ao processar o arquivo.');
          setIsUploading(false);
        }
      } else {
        // For new tasks, store file to upload after task creation
        setPendingFiles([...pendingFiles, file]);

        // Show placeholder in UI
        const placeholderAttachment: Attachment = {
          id: `pending-${Date.now()}`,
          name: file.name,
          type: file.type,
          url: '' // Will be filled after upload
        };
        setFormData({ ...formData, attachments: [...(formData.attachments || []), placeholderAttachment] });
      }
    }
  };

  const removeAttachment = async (attId: string) => {
    if (!confirm('Tem certeza que deseja remover este anexo?')) return;

    try {
      // Call API to delete attachment
      await assetsAPI.deleteAttachment(attId);

      // Update local state
      setFormData({ ...formData, attachments: (formData.attachments || []).filter(a => a.id !== attId) });

      console.log('✅ Attachment deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting attachment:', error);
      alert('Erro ao deletar anexo. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {initialTask?.id ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <Input 
                label="Título da Tarefa" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
                placeholder="ex: Corrigir layout da home"
              />
            </div>

            <Select 
              label="Status" 
              options={columns.map(c => ({ label: c.title, value: c.id }))}
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
            />

            <Select 
              label="Prioridade" 
              options={Object.values(Priority).map(p => ({ label: p, value: p }))}
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
            />

            <Select 
              label="Projeto" 
              options={projects.map(p => ({ label: p.name, value: p.id }))}
              value={formData.projectId}
              onChange={e => setFormData({...formData, projectId: e.target.value})}
            />

            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prazo de Entrega (Opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.dueDate || ''}
                onChange={e => setFormData({...formData, dueDate: e.target.value || undefined})}
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* Time Tracking Stopwatch */}
            <div className="col-span-1">
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tempo Gasto</label>
               <div className="flex items-center space-x-2">
                 {/* Editable Time Inputs */}
                 <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-2 border border-slate-300 dark:border-slate-700">
                   <Clock size={16} className="text-slate-500 dark:text-slate-400 mr-2 flex-shrink-0" />
                   <div className="flex items-center">
                     <input
                       type="number"
                       min="0"
                       max="999"
                       value={timeSpent.hours}
                       onChange={(e) => setTimeSpent(prev => ({ ...prev, hours: Math.max(0, parseInt(e.target.value) || 0) }))}
                       onFocus={(e) => e.target.select()}
                       className="w-10 text-center text-lg font-mono font-semibold bg-transparent text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-700 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       disabled={isTimerRunning}
                       title="Horas"
                     />
                     <span className="text-lg font-mono font-semibold text-slate-900 dark:text-white">:</span>
                     <input
                       type="number"
                       min="0"
                       max="59"
                       value={String(timeSpent.minutes).padStart(2, '0')}
                       onChange={(e) => setTimeSpent(prev => ({ ...prev, minutes: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) }))}
                       onFocus={(e) => e.target.select()}
                       className="w-10 text-center text-lg font-mono font-semibold bg-transparent text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-700 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       disabled={isTimerRunning}
                       title="Minutos"
                     />
                     <span className="text-lg font-mono font-semibold text-slate-900 dark:text-white">:</span>
                     <input
                       type="number"
                       min="0"
                       max="59"
                       value={String(timeSpent.seconds || 0).padStart(2, '0')}
                       onChange={(e) => setTimeSpent(prev => ({ ...prev, seconds: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) }))}
                       onFocus={(e) => e.target.select()}
                       className="w-10 text-center text-lg font-mono font-semibold bg-transparent text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-700 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       disabled={isTimerRunning}
                       title="Segundos"
                     />
                   </div>
                 </div>
                 {/* Control Buttons */}
                 <div className="flex space-x-1">
                   <button
                     type="button"
                     onClick={() => {
                       setIsTimerRunning(!isTimerRunning);
                       if (initialTask?.id) {
                         toggleTimeTracking(initialTask.id);
                       }
                     }}
                     className={`p-2 rounded-lg ${isTimerRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors`}
                     title={isTimerRunning ? 'Pausar' : 'Iniciar'}
                   >
                     {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                   </button>
                   <button
                     type="button"
                     onClick={() => {
                       if (isTimerRunning && initialTask?.id) {
                         toggleTimeTracking(initialTask.id);
                       }
                       setIsTimerRunning(false);
                       setTimeSpent({ hours: 0, minutes: 0, seconds: 0 });
                       if (initialTask?.id) {
                         updateTask(initialTask.id, { timeTracked: 0, isTracking: false });
                       }
                     }}
                     className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                     title="Resetar"
                   >
                     <Square size={16} />
                   </button>
                 </div>
               </div>
            </div>

            {/* Custom Multi-Select for Assignees with Search */}
            <div className="col-span-2 relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsáveis</label>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Digite o nome do responsável..."
                value={assigneeSearchQuery}
                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                onFocus={() => setShowAssigneeDropdown(true)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />

              {/* Selected Assignees Tags */}
              {formData.assignees && formData.assignees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.assignees.map(id => {
                    const u = users.find(user => user.id === id);
                    return u ? (
                      <span key={id} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Avatar name={u.name} avatarUrl={u.avatarUrl} size="xs" className="mr-1" />
                        {u.name}
                        <button
                          type="button"
                          onClick={() => toggleAssignee(u.id)}
                          className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Dropdown with filtered results */}
              {showAssigneeDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-48 rounded-md py-1 text-base ring-1 ring-slate-200 dark:ring-slate-700 overflow-auto focus:outline-none sm:text-sm border border-slate-200 dark:border-slate-700">
                  {users
                    .filter(u => u.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()))
                    .map(u => (
                      <div
                        key={u.id}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                        onClick={() => {
                          toggleAssignee(u.id);
                          setAssigneeSearchQuery('');
                        }}
                      >
                        <div className="flex items-center">
                          <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" className="mr-2" />
                          <span className="font-normal block truncate">{u.name}</span>
                        </div>
                        {formData.assignees?.includes(u.id) && (
                          <span className="text-primary-500 absolute inset-y-0 right-0 flex items-center pr-4">
                            <Check size={16} />
                          </span>
                        )}
                      </div>
                    ))}
                  {users.filter(u => u.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase())).length === 0 && (
                    <div className="py-2 pl-3 text-slate-400 text-sm">
                      Nenhum responsável encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="col-span-2">
              <Textarea 
                label="Descrição" 
                rows={5}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Adicione instruções detalhadas..."
              />
            </div>

            {/* Attachments Section */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Anexos</label>
              <div className="space-y-3">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                 />
                 <div className="flex flex-wrap gap-2">
                    {formData.attachments?.map(att => (
                       <div key={att.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm border border-slate-200 dark:border-slate-700">
                          <FileIcon size={16} className="text-primary-500 flex-shrink-0" />
                          <span className="truncate max-w-[150px] dark:text-white">{att.name}</span>
                          <div className="flex items-center gap-1 ml-auto">
                             <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Ver arquivo"
                             >
                                <Eye size={16} />
                             </a>
                             <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att.url, att.name)}
                                className="p-1 text-slate-400 hover:text-green-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Baixar arquivo"
                             >
                                <Download size={16} />
                             </button>
                             <button
                                type="button"
                                onClick={() => removeAttachment(att.id)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Remover anexo"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                    ))}
                    {isUploading && (
                       <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                          <Loader2 size={14} className="text-blue-500 animate-spin" />
                          <span className="text-blue-600 dark:text-blue-400">Enviando arquivo...</span>
                       </div>
                    )}
                    <button
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isUploading}
                       className="flex items-center px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:text-primary-500 hover:border-primary-500 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <Upload size={14} className="mr-2" /> Upload
                    </button>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
             {initialTask?.id && canDeleteTask ? (
               <Button type="button" variant="danger" onClick={handleDelete}>Excluir</Button>
             ) : (
               <div></div>
             )}
             <div className="flex space-x-3">
               <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
               <Button type="submit" disabled={isSaving}>
                 {isSaving ? 'Salvando...' : 'Salvar'}
               </Button>
             </div>
          </div>
        </form>
      </div>
      {/* Overlay to close assignee dropdown if clicked outside */}
      {showAssigneeDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowAssigneeDropdown(false)} style={{backgroundColor: 'transparent'}}></div>}
    </div>
  );
};