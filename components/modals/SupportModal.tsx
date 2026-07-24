import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { useApp } from '../../contexts/AppContext';
import { itDemandsAPI } from '../../lib/itDemandsAPI';
import { Portal } from '../ui/Portal';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useApp();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    urgency: 'Média' as 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Por favor, preencha o título da sua dúvida');
      return;
    }

    if (!formData.description.trim()) {
      alert('Por favor, descreva sua dúvida ou problema');
      return;
    }

    try {
      await itDemandsAPI.create({
        title: formData.title,
        description: formData.description,
        urgency: formData.urgency
      });

      alert('Solicitação enviada! A equipe de TI entrará em contato em breve.');

      // Reset form
      setFormData({
        title: '',
        description: '',
        urgency: 'Média'
      });

      onClose();
    } catch (error: any) {
      console.error('Error submitting support request:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Erro desconhecido';
      alert(`Erro ao enviar solicitação: ${errorMsg}\n\nTente novamente ou entre em contato com o administrador.`);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ left: 0, top: 0, right: 0, bottom: 0 }}>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
              <Phone size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Suporte TI
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <strong>Precisa de ajuda?</strong> Descreva sua dúvida ou problema e a equipe de TI irá te auxiliar.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Solicitante: {user?.name} ({user?.email})
            </p>
          </div>

          <Input
            label="Assunto"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Ex: Dúvida sobre criação de tarefas"
          />

          <Textarea
            label="Descreva sua dúvida ou problema"
            rows={5}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Explique detalhadamente o que você precisa..."
            required
          />

          <Select
            label="Urgência"
            options={[
              { label: 'Baixa - Posso aguardar', value: 'Baixa' },
              { label: 'Média - Normal', value: 'Média' },
              { label: 'Alta - Preciso de atenção', value: 'Alta' },
              { label: 'Crítica - Urgente!', value: 'Crítica' }
            ]}
            value={formData.urgency}
            onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}
          />

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Enviar Solicitação
            </Button>
          </div>
        </form>
        </div>
      </div>
    </Portal>
  );
};
