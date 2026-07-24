import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/Button';
import { Asset, AssetType } from '../types';
import {
  Upload, Image as ImageIcon, Video, FileText, File,
  Trash2, Download, Search, Filter, Tag, X, AlertCircle, Folder, FolderOpen, Plus
} from 'lucide-react';
import {
  isDropboxConfigured,
  uploadAsset,
  deleteAsset,
  formatFileSize,
  getAssetTypeFromMimeType
} from '../lib/dropbox';
import { useSocket } from '../lib/useSocket';

const ASSETS_STORAGE_KEY = 'taskflow-crm-assets';

export const AssetsPage: React.FC = () => {
  const { user, projects, addProject } = useApp();
  const socket = useSocket();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Load assets from localStorage on mount
  React.useEffect(() => {
    console.log('📄 AssetsPage mounted');
    console.log('User:', user);
    console.log('Dropbox configured:', isDropboxConfigured);

    // Load saved assets from localStorage
    const savedAssets = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (savedAssets) {
      try {
        const parsedAssets = JSON.parse(savedAssets);
        console.log('📦 Loaded assets from localStorage:', parsedAssets.length, 'files');
        setAssets(parsedAssets);
      } catch (error) {
        console.error('❌ Error loading assets from localStorage:', error);
      }
    }
  }, []);

  // Save assets to localStorage whenever they change
  React.useEffect(() => {
    if (assets.length > 0) {
      console.log('💾 Saving assets to localStorage:', assets.length, 'files');
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    }
  }, [assets]);

  // WebSocket listener for real-time asset updates
  useEffect(() => {
    if (!socket) return;

    const handleAssetUploaded = (data: { asset: Asset }) => {
      console.log('🔔 Asset uploaded event received:', data.asset.name);
      setAssets(prev => {
        // Check if asset already exists
        const exists = prev.some(a => a.id === data.asset.id);
        if (exists) return prev;
        return [data.asset, ...prev];
      });
    };

    const handleAssetDeleted = (data: { id: string }) => {
      console.log('🔔 Asset deleted event received:', data.id);
      setAssets(prev => prev.filter(a => a.id !== data.id));
    };

    socket.on('asset:uploaded', handleAssetUploaded);
    socket.on('asset:deleted', handleAssetDeleted);

    return () => {
      socket.off('asset:uploaded', handleAssetUploaded);
      socket.off('asset:deleted', handleAssetDeleted);
    };
  }, [socket]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🎯 handleFileUpload triggered');
    console.log('User:', user?.name);
    console.log('Dropbox configured:', isDropboxConfigured);

    if (!user) {
      console.error('❌ User not logged in');
      alert('Você precisa estar logado para fazer upload');
      return;
    }

    if (!isDropboxConfigured) {
      console.error('❌ Dropbox not configured');
      alert('Dropbox não está configurado. Adicione o token no arquivo .env');
      return;
    }

    const files = e.target.files;
    console.log('Files selected:', files?.length);
    if (!files || files.length === 0) {
      console.log('⚠️ No files selected');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      try {
        console.log('📤 Starting upload for:', (file as File).name);
        const result = await uploadAsset(file as File, user.id, filterProject !== 'all' ? filterProject : undefined);

        if (result) {
          console.log('✅ Upload successful:', (file as File).name);
          const newAsset: Asset = {
            id: `asset${Date.now()}-${Math.random()}`,
            name: (file as File).name,
            url: result.url,
            path: result.path,
            type: getAssetTypeFromMimeType((file as File).type) as AssetType,
            mimeType: (file as File).type,
            size: (file as File).size,
            projectId: filterProject !== 'all' && filterProject !== 'none' ? filterProject : undefined,
            tags: [],
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString()
          };
          setAssets((prev: Asset[]) => [newAsset, ...prev]);

          // Emit WebSocket event for real-time updates
          if (socket) {
            socket.emit('asset:uploaded', { asset: newAsset });
          }

          successCount++;
        } else {
          console.error('❌ Upload failed (no result):', (file as File).name);
          failCount++;
        }
      } catch (error) {
        console.error('❌ Upload exception:', error);
        failCount++;
      }
    }

    setIsUploading(false);
    e.target.value = ''; // Reset input

    // Show summary
    if (successCount > 0) {
      alert(`✅ ${successCount} arquivo(s) enviado(s) com sucesso!`);
    }
    if (failCount > 0) {
      alert(`❌ ${failCount} arquivo(s) falharam. Verifique o console (F12) para detalhes.`);
    }
  };

  // Handle file deletion
  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Tem certeza que deseja excluir "${asset.name}"?`)) return;

    const success = await deleteAsset(asset.path);
    if (success) {
      const updatedAssets = assets.filter((a: Asset) => a.id !== asset.id);
      setAssets(updatedAssets);

      // Emit WebSocket event for real-time updates
      if (socket) {
        socket.emit('asset:deleted', { id: asset.id });
      }

      // Update localStorage
      if (updatedAssets.length === 0) {
        localStorage.removeItem(ASSETS_STORAGE_KEY);
        console.log('🗑️ Removed assets from localStorage (no more files)');
      } else {
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
        console.log('💾 Updated assets in localStorage after deletion');
      }

      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
    } else {
      alert('Falha ao excluir arquivo');
    }
  };

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Digite um nome para a pasta');
      return;
    }

    // Create a new project (folder)
    const newProject = await addProject({
      name: newFolderName.trim(),
      description: '',
      status: 'active',
      priority: 'medium',
      clientName: '',
      startDate: new Date().toISOString().split('T')[0],
      teamMembers: user ? [user.id] : []
    });

    if (newProject) {
      setNewFolderName('');
      setShowCreateFolder(false);
      setFilterProject(newProject.id);
    }
  };

  // Filter assets
  const filteredAssets = assets.filter((asset: Asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesProject = filterProject === 'all' ||
                          (filterProject === 'none' ? !asset.projectId : asset.projectId === filterProject);
    return matchesSearch && matchesType && matchesProject;
  });

  // Get icon for asset type
  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.IMAGE: return <ImageIcon size={20} />;
      case AssetType.VIDEO: return <Video size={20} />;
      case AssetType.DOCUMENT: return <FileText size={20} />;
      default: return <File size={20} />;
    }
  };

  // Check if Dropbox is configured
  if (!isDropboxConfigured) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Biblioteca de Assets</h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie logos, imagens, vídeos e documentos</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 mr-4 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">Dropbox Não Configurado</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                Para usar a Biblioteca de Assets, você precisa configurar sua integração com o Dropbox.
              </p>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Passo a passo:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Acesse <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Dropbox App Console</a></li>
                  <li>Crie um novo app (Scoped access → Full Dropbox)</li>
                  <li>Em "Permissions", habilite: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">files.content.write</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">files.content.read</code>, <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">sharing.write</code></li>
                  <li>Em "Settings", gere um "Access Token"</li>
                  <li>Crie um arquivo <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.env</code> na raiz do projeto</li>
                  <li>Adicione: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">VITE_DROPBOX_ACCESS_TOKEN=seu-token</code></li>
                  <li>Reinicie o servidor de desenvolvimento</li>
                </ol>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Veja o arquivo <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env.example</code> e <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">DROPBOX_SETUP.md</code> para mais detalhes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Biblioteca de Assets</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie logos, imagens, vídeos e documentos
            {isDropboxConfigured ? (
              <span className="ml-2 text-green-600 dark:text-green-400 text-xs">● Dropbox conectado</span>
            ) : (
              <span className="ml-2 text-red-600 dark:text-red-400 text-xs">● Dropbox não configurado</span>
            )}
            {!user && (
              <span className="ml-2 text-red-600 dark:text-red-400 text-xs">● Faça login para fazer upload</span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileUpload}
            disabled={isUploading || !isDropboxConfigured}
            className="hidden"
            id="file-upload-input"
          />
          <Button
            disabled={isUploading || !isDropboxConfigured}
            isLoading={isUploading}
            onClick={() => {
              console.log('🖱️ Button clicked');
              const input = document.getElementById('file-upload-input') as HTMLInputElement;
              if (input) {
                console.log('✅ Input found, triggering click');
                input.click();
              } else {
                console.error('❌ Input not found');
              }
            }}
          >
            <Upload size={18} className="mr-2" />
            {isUploading ? 'Enviando...' : 'Upload de Arquivos'}
          </Button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pastas</h3>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-500 transition-colors"
              title="Criar Pasta"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* All Files */}
          <button
            onClick={() => setFilterProject('all')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
              filterProject === 'all'
                ? 'bg-primary-500 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {filterProject === 'all' ? <FolderOpen size={18} /> : <Folder size={18} />}
            <span>Todos os Arquivos</span>
            <span className="ml-auto text-xs opacity-70">{assets.length}</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>

          {/* Project Folders */}
          {projects.map(project => {
            const projectAssets = assets.filter(a => a.projectId === project.id);
            return (
              <button
                key={project.id}
                onClick={() => setFilterProject(project.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  filterProject === project.id
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {filterProject === project.id ? <FolderOpen size={18} /> : <Folder size={18} />}
                <span className="truncate flex-1 text-left">{project.name}</span>
                <span className="text-xs opacity-70">{projectAssets.length}</span>
              </button>
            );
          })}

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>

          {/* Uncategorized */}
          <button
            onClick={() => setFilterProject('none')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              filterProject === 'none'
                ? 'bg-primary-500 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {filterProject === 'none' ? <FolderOpen size={18} /> : <Folder size={18} />}
            <span>Sem Pasta</span>
            <span className="ml-auto text-xs opacity-70">{assets.filter(a => !a.projectId).length}</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Type Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar arquivos..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value={AssetType.IMAGE}>Imagens</option>
                <option value={AssetType.VIDEO}>Vídeos</option>
                <option value={AssetType.DOCUMENT}>Documentos</option>
                <option value={AssetType.OTHER}>Outros</option>
              </select>
            </div>
          </div>

          {/* Assets Grid */}
          <div className="flex-1 overflow-auto">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Upload size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum arquivo encontrado</p>
            <p className="text-sm">Faça upload de arquivos para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-6">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg transition-all"
              >
                {/* Preview */}
                <div className="aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  {asset.type === AssetType.IMAGE ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-400">
                      {getAssetIcon(asset.type)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatFileSize(asset.size)}
                  </p>
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={asset.url}
                    download={asset.name}
                    onClick={e => e.stopPropagation()}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                    title="Download"
                  >
                    <Download size={18} className="text-white" />
                  </a>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(asset); }}
                    className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg backdrop-blur-sm transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} className="text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Asset Details Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedAsset(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detalhes do Arquivo</h2>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              <div className="mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {selectedAsset.type === AssetType.IMAGE ? (
                  <img src={selectedAsset.url} alt={selectedAsset.name} className="w-full h-auto" />
                ) : selectedAsset.type === AssetType.VIDEO ? (
                  <video src={selectedAsset.url} controls className="w-full h-auto" />
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    {getAssetIcon(selectedAsset.type)}
                    <p className="ml-3">Preview não disponível</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                  <p className="text-slate-900 dark:text-white">{selectedAsset.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tamanho</label>
                  <p className="text-slate-900 dark:text-white">{formatFileSize(selectedAsset.size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                  <p className="text-slate-900 dark:text-white">{selectedAsset.mimeType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload</label>
                  <p className="text-slate-900 dark:text-white">
                    {new Date(selectedAsset.uploadedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                {selectedAsset.projectId && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Projeto</label>
                    <p className="text-slate-900 dark:text-white">
                      {projects.find(p => p.id === selectedAsset.projectId)?.name || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <a
                  href={selectedAsset.url}
                  download={selectedAsset.name}
                  className="flex-1"
                >
                  <Button className="w-full" variant="secondary">
                    <Download size={18} className="mr-2" />
                    Download
                  </Button>
                </a>
                <Button
                  onClick={() => handleDelete(selectedAsset)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 size={18} className="mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCreateFolder(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Nova Pasta</h2>
              <button onClick={() => setShowCreateFolder(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome da Pasta
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Digite o nome da pasta..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => setShowCreateFolder(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateFolder}
                className="flex-1"
              >
                Criar Pasta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
