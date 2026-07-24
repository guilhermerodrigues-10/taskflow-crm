import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, File as FileIcon, Trash2, Download, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { ITDemand, itDemandsAPI } from '../../lib/itDemandsAPI';
import { assetsAPI } from '../../lib/api';
import { Attachment } from '../../types';
import { Portal } from '../ui/Portal';

interface ITDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: ITDemand | null;
}

export const ITDemandModal: React.FC<ITDemandModalProps> = ({ isOpen, onClose, demand }) => {
  const { user, users, projects } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'Normal' as 'Baixa' | 'Normal' | 'Alta' | 'Urgente',
    urgency: 'Média' as 'Baixa' | 'Média' | 'Alta' | 'Crítica',
    dueDate: '',
    projectId: '',
    assignees: [] as string[],
    attachments: [] as Attachment[]
  });

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Permissions - only admin can edit
  const canEdit = user?.role === 'Admin';
  const canDelete = user?.role === 'Admin';

  useEffect(() => {
    if (demand) {
      // EDIT MODE - viewing existing demand
      setFormData({
        title: demand.title,
        description: demand.description,
        status: demand.status,
        priority: (demand as any).priority || 'Normal',
        urgency: demand.urgency,
        dueDate: (demand as any).dueDate ? new Date((demand as any).dueDate).toISOString().slice(0, 16) : '',
        projectId: (demand as any).projectId || '',
        assignees: (demand as any).assignees || [],
        attachments: (demand as any).attachments || []
      });
    } else {
      // CREATE MODE - new demand
      setFormData({
        title: '',
        description: '',
        status: 'backlog',
        priority: 'Normal',
        urgency: 'Média',
        dueDate: '',
        projectId: projects.length > 0 ? projects[0].id : '',
        assignees: [],
        attachments: []
      });
    }
  }, [demand, isOpen, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Por favor, preencha o título da demanda');
      return;
    }

    if (!formData.description.trim()) {
      alert('Por favor, descreva a demanda');
      return;
    }

    try {
      if (demand?.id) {
        // UPDATE existing demand (Admin only)
        await itDemandsAPI.update(demand.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          urgency: formData.urgency,
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
          assignees: formData.assignees,
          projectId: formData.projectId || undefined
        });
        alert('Demanda atualizada com sucesso!');
      } else {
        // CREATE new demand
        const newDemand = await itDemandsAPI.create({
          title: formData.title,
          description: formData.description,
          urgency: formData.urgency,
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
          assignees: formData.assignees,
          projectId: formData.projectId || undefined
        });

        // Upload pending files if any
        if (pendingFiles.length > 0) {
          setIsUploading(true);
          try {
            for (const file of pendingFiles) {
              const reader = new FileReader();
              await new Promise((resolve, reject) => {
                reader.onload = async (e) => {
                  try {
                    const base64Content = e.target?.result as string;
                    await assetsAPI.uploadTaskAttachment(
                      file.name,
                      base64Content,
                      'it-demands',
                      newDemand.id,
                      user?.id || ''
                    );
                    resolve(true);
                  } catch (error) {
                    reject(error);
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            }
            setPendingFiles([]);
          } catch (error) {
            console.error('Error uploading files:', error);
            alert('Demanda criada, mas houve erro ao enviar anexos.');
          } finally {
            setIsUploading(false);
          }
        }

        alert('Demanda enviada com sucesso! A equipe de TI irá analisá-la em breve.');
      }

      onClose();
    } catch (error: any) {
      console.error('Error submitting IT demand:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Erro desconhecido';
      alert(`Erro ao enviar demanda: ${errorMsg}\n\nDetalhes: ${JSON.stringify(error?.response?.data || {})}\n\nTente novamente ou entre em contato com o administrador.`);
    }
  };

  const handleDelete = async () => {
    if (!demand?.id || !canDelete) return;

    if (!confirm('Tem certeza que deseja excluir esta demanda?')) return;

    try {
      await itDemandsAPI.delete(demand.id);
      alert('Demanda excluída com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error deleting demand:', error);
      alert('Erro ao excluir demanda.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Deseja remover este anexo?')) return;

    try {
      await assetsAPI.deleteAttachment(attachmentId);
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Erro ao remover anexo');
    }
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId]
    }));
  };

  const getAssigneeNames = () => {
    if (formData.assignees.length === 0) {
      return 'Nenhum responsável selecionado';
    }
    return formData.assignees
      .map(id => users.find(u => u.id === id)?.name || 'Desconhecido')
      .join(', ');
  };

  // Determine if viewing mode (existing demand but not admin)
  const isViewMode = !!demand && !canEdit;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {demand ? (isViewMode ? 'Detalhes da Demanda' : 'Editar Demanda TI') : 'Nova Demanda TI'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Requester Info (read-only) */}
          {demand && (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Solicitante:</strong> {demand.requesterName} ({demand.requesterEmail})
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                <strong>Criada em:</strong> {new Date(demand.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {/* Title */}
            <Input
              label="Título da Demanda"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Problema no sistema de login"
              disabled={isViewMode}
            />

            {/* Description */}
            <Textarea
              label="Descrição"
              rows={6}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhadamente o problema ou solicitação..."
              required
              disabled={isViewMode}
            />

            {/* Project Selection */}
            {projects.length > 0 && (
              <Select
                label="Projeto Relacionado"
                options={[
                  { label: 'Nenhum projeto', value: '' },
                  ...projects.map(p => ({ label: p.name, value: p.id }))
                ]}
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                disabled={isViewMode}
              />
            )}

            {/* Status (Admin only) */}
            {canEdit && demand && (
              <Select
                label="Status"
                options={[
                  { label: 'Backlog', value: 'backlog' },
                  { label: 'Em Análise', value: 'em-analise' },
                  { label: 'Bloqueado/Aguardando', value: 'bloqueado' },
                  { label: 'Em Desenvolvimento', value: 'em-desenvolvimento' },
                  { label: 'Em Teste', value: 'em-teste' },
                  { label: 'Concluído', value: 'concluido' }
                ]}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority (Admin only for new, or viewing) */}
              {(!demand || canEdit) && (
                <Select
                  label="Prioridade"
                  options={[
                    { label: 'Baixa', value: 'Baixa' },
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Alta', value: 'Alta' },
                    { label: 'Urgente', value: 'Urgente' }
                  ]}
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  disabled={isViewMode}
                />
              )}

              {/* Urgency */}
              <Select
                label="Urgência"
                options={[
                  { label: 'Baixa - Pode aguardar', value: 'Baixa' },
                  { label: 'Média - Atenção normal', value: 'Média' },
                  { label: 'Alta - Precisa de atenção', value: 'Alta' },
                  { label: 'Crítica - Urgente!', value: 'Crítica' }
                ]}
                value={formData.urgency}
                onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}
                disabled={isViewMode}
              />
            </div>

            {/* Due Date and Assignees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prazo de Entrega"
                type="datetime-local"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={isViewMode}
              />

              {/* Assignees (Responsáveis - in this case who requested it) */}
              {!demand && (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Responsáveis
                  </label>
                  <div
                    className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 cursor-pointer bg-white dark:bg-slate-800"
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  >
                    <p className="text-sm text-slate-900 dark:text-white truncate">
                      {getAssigneeNames()}
                    </p>
                  </div>

                  {showAssigneeDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {users.map(u => (
                        <label
                          key={u.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignees.includes(u.id)}
                            onChange={() => toggleAssignee(u.id)}
                            className="mr-2"
                          />
                          <span className="text-sm text-slate-900 dark:text-white">{u.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Upload */}
            {!isViewMode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Anexos
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload size={16} className="mr-2" />
                    {isUploading ? 'Enviando...' : 'Selecionar Arquivos'}
                  </Button>
                </div>

                {/* Pending Files */}
                {pendingFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Arquivos pendentes:</p>
                    {pendingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center space-x-2">
                          <FileIcon size={16} className="text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-white truncate">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Existing Attachments */}
            {formData.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Anexos Existentes
                </label>
                <div className="space-y-2">
                  {formData.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center space-x-3">
                        <FileIcon size={18} className="text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(attachment.uploadedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Download size={18} />
                        </a>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              {canDelete && demand && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} className="mr-2" />
                  Excluir Demanda
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                {isViewMode ? 'Fechar' : 'Cancelar'}
              </Button>
              {!isViewMode && (
                <Button type="submit" disabled={isUploading} className="w-full sm:w-auto">
                  {isUploading && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {demand ? 'Salvar Alterações' : 'Enviar Demanda'}
                </Button>
              )}
            </div>
          </div>
        </form>
        </div>
      </div>
    </Portal>
  );
};
