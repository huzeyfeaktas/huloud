import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute, useParams } from 'wouter';
import { FileSystemItem } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ChevronRight, 
  Upload, 
  FolderPlus, 
  Home, 
  AlertTriangle,
  Music
} from 'lucide-react';
import FileList from '@/components/file-explorer/FileList';
import RecentUploads from '@/components/file-explorer/RecentUploads';
import UploadDialog from '@/components/dialogs/UploadDialog';
import CreateFolderDialog from '@/components/dialogs/CreateFolderDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from 'wouter';
import VideoPlayer from '@/components/ui/video-player';

const FilesPage: React.FC = () => {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const [isFolder] = useRoute('/folder/:id');
  const [isFileType] = useRoute('/files/:type');
  const params = useParams();
  
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [fileViewerType, setFileViewerType] = useState<'video' | 'audio' | 'pdf'>('video');
  const [fileViewerUrl, setFileViewerUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Set current folder ID from URL params
  useEffect(() => {
    if (isFolder && params.id) {
      setCurrentFolderId(parseInt(params.id));
    } else {
      setCurrentFolderId(null);
    }
  }, [isFolder, params.id]);

  // Get current folder details if we have an ID
  const { data: currentFolder, isLoading: isFolderLoading } = useQuery<FileSystemItem>({
    queryKey: [`/api/files/${currentFolderId}`],
    enabled: currentFolderId !== null,
  });

  // Get parent folder info if we have a current folder
  const { data: parentFolder } = useQuery<FileSystemItem>({
    queryKey: [`/api/files/${currentFolder?.parentId}`],
    enabled: !!currentFolder?.parentId,
  });

  // Delete file/folder mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;
      await apiRequest('DELETE', `/api/files/${selectedFile.id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: `${selectedFile?.isDirectory ? 'Klasör' : 'Dosya'} başarıyla silindi`,
      });
      
      // API önbelleklerini temizle (tekrar yüklemek için)
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/type'] });
      
      // Mevcut klasör içeriğini yenile
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
      }
      
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete: ${error.message}`,
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
    },
  });

  // Rename file/folder mutation
  const renameMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !newFileName) return;
      const response = await apiRequest('PATCH', `/api/files/${selectedFile.id}`, {
        name: newFileName,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Item renamed successfully',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
      }
      
      setIsRenameDialogOpen(false);
      setSelectedFile(null);
      setNewFileName('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to rename: ${error.message}`,
        variant: 'destructive',
      });
      setIsRenameDialogOpen(false);
    },
  });

  // Toggle favorite status mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (file: FileSystemItem) => {
      const response = await apiRequest('PATCH', `/api/files/${file.id}/favorite`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/files/favorites'] });
      
      toast({
        title: 'Başarılı',
        description: 'Favori durumu güncellendi',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: `Favori durumu güncellenemedi: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleFileAction = (action: string, file: FileSystemItem) => {
    setSelectedFile(file);
    
    switch (action) {
      case 'open':
        if (file.isDirectory) {
          navigate(`/folder/${file.id}`);
        } else {
          // Resim dosyaları için özel görüntüleyici açalım, diğer dosyalar için normal işlem yapalım
          const isImage = file.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
            file.name.split('.').pop()?.toLowerCase() || ''
          );
          
          if (isImage) {
            // Resim dosyası için özel görüntüleyici açalım
            setSelectedFile(file);
            setIsImageViewerOpen(true);
          } else {
            // Diğer dosya türleri için normal işlem yap
            const extension = file.name.split('.').pop()?.toLowerCase();
            const videoTypes = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
            const audioTypes = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
            const documentTypes = ['pdf', 'txt', 'html', 'css', 'js'];
            
            // Video dosyaları için
            if (extension && videoTypes.includes(extension)) {
              setFileViewerType('video');
              setFileViewerUrl(`/api/files/${file.id}/download?preview=true&t=${Date.now()}&r=${Math.random()}`);
              setIsFileViewerOpen(true);
            }
            // Ses dosyaları için
            else if (extension && audioTypes.includes(extension)) {
              setFileViewerType('audio');
              setFileViewerUrl(`/api/files/${file.id}/download?preview=true&t=${Date.now()}&r=${Math.random()}`);
              setIsFileViewerOpen(true);
            }
            // Belge dosyaları için
            else if (extension && documentTypes.includes(extension)) {
              // PDF ve diğer belge dosyaları için önizleme
              window.open(`/api/files/${file.id}/download?preview=true&t=${Date.now()}&r=${Math.random()}`, '_blank');
            } else {
              // Diğer dosya türleri için normal indirme
              window.open(`/api/files/${file.id}/download?t=${Date.now()}&r=${Math.random()}`, '_blank');
            }
          }
        }
        break;
        
      case 'download':
        window.open(`/api/files/${file.id}/download?t=${new Date().getTime()}`, '_blank');
        break;
        
      case 'rename':
        setNewFileName(file.name);
        setIsRenameDialogOpen(true);
        break;
        
      case 'toggleFavorite':
        toggleFavoriteMutation.mutate(file);
        break;
        
      case 'share':
        toast({
          title: 'Paylaş',
          description: 'Paylaşım özelliği henüz uygulanmadı',
        });
        break;
        
      case 'delete':
        setIsDeleteDialogOpen(true);
        break;
        
      default:
        break;
    }
  };

  const handleRename = () => {
    if (newFileName && selectedFile) {
      renameMutation.mutate();
    }
  };

  // Determine page title and breadcrumb
  let pageTitle = 'Tüm Dosyalar';
  let currentPageType = '';
  
  // Check if this is a file type route
  const [isFileTypeRoute] = useRoute('/files/type/:type');
  const [isFavoritesRoute] = useRoute('/files/favorites');
  
  // URL'den dosya tipini çıkartmak için
  if (isFileTypeRoute && params.type) {
    currentPageType = params.type;
    switch (params.type) {
      case 'image':
        pageTitle = 'Resimler';
        break;
      case 'video':
        pageTitle = 'Videolar';
        break;
      case 'document':
        pageTitle = 'Belgeler';
        break;
      default:
        pageTitle = 'Tüm Dosyalar';
    }
  } else if (isFavoritesRoute) {
    pageTitle = 'Favoriler';
    currentPageType = 'favorites';
  } else if (isFolder && currentFolder) {
    pageTitle = currentFolder.name;
  }

  return (
    <main className="p-4 md:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center mb-4 text-sm">
        <Link href="/files" className="text-primary hover:underline flex items-center">
          <Home className="h-4 w-4 mr-1" />
          Ana Sayfa
        </Link>
        
        {currentFolder && (
          <>
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            {parentFolder && (
              <>
                <Link href={`/folder/${parentFolder.id}`} className="text-primary hover:underline">
                  {parentFolder.name}
                </Link>
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
              </>
            )}
            <span className="text-foreground">{currentFolder.name}</span>
          </>
        )}
        
        {isFileType && params.type && (
          <>
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            <span className="text-foreground">{pageTitle}</span>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        {isFolderLoading ? (
          <Skeleton className="h-8 w-40 mb-3 md:mb-0" />
        ) : (
          <h1 className="text-2xl font-medium text-foreground mb-3 md:mb-0">{pageTitle}</h1>
        )}
        
        <div className="flex space-x-2">
          <Button onClick={() => setIsUploadDialogOpen(true)} className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Yükle
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setIsCreateFolderDialogOpen(true)}
            className="flex items-center"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Yeni Klasör
          </Button>
        </div>
      </div>

      {/* Recent Uploads (only on main file page) */}
      {!isFolder && !isFileType && (
        <RecentUploads />
      )}

      {/* File List */}
      <FileList 
        parentId={currentFolderId} 
        onFileAction={handleFileAction} 
      />

      {/* Upload Dialog */}
      <UploadDialog 
        isOpen={isUploadDialogOpen} 
        onClose={() => setIsUploadDialogOpen(false)}
        currentFolderId={currentFolderId}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog 
        isOpen={isCreateFolderDialogOpen} 
        onClose={() => setIsCreateFolderDialogOpen(false)}
        currentFolderId={currentFolderId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem{' '}
              <span className="font-medium">
                {selectedFile?.name}
              </span>
              {selectedFile?.isDirectory ? ' ve içindeki tüm dosyaları' : ''} kalıcı olarak silecektir.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeniden Adlandır</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full"
              placeholder="Yeni isim girin"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRenameDialogOpen(false)}
            >
              İptal
            </Button>
            <Button 
              onClick={handleRename}
              disabled={!newFileName || newFileName === selectedFile?.name}
            >
              Yeniden Adlandır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resim Görüntüleyici - Tam sayfamızda resimi göstermek için */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[85vh] p-0">
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
            {/* Resim görüntüsü */}
            {selectedFile && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-3 border-b bg-black text-white">
                  <DialogTitle className="text-white">{selectedFile.name}</DialogTitle>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-gray-800"
                    onClick={() => setIsImageViewerOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
                  <img 
                    src={`/api/files/${selectedFile.id}/download?preview=true&t=${Date.now()}`}
                    alt={selectedFile.name}
                    className="max-w-full max-h-[70vh] object-contain"
                    style={{ margin: 'auto' }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Medya Görüntüleyici - Video/Ses dosyaları için */}
      <Dialog open={isFileViewerOpen} onOpenChange={setIsFileViewerOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[85vh] p-0">
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
            {fileViewerType === 'video' && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-3 border-b bg-black text-white">
                  <DialogTitle className="text-white">{selectedFile?.name}</DialogTitle>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-gray-800"
                    onClick={() => setIsFileViewerOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
                  <VideoPlayer 
                    src={fileViewerUrl}
                    title={selectedFile?.name}
                    className="max-w-full max-h-[70vh] w-full"
                  />
                </div>
              </div>
            )}
            
            {fileViewerType === 'audio' && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-3 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <DialogTitle className="text-white">{selectedFile?.name}</DialogTitle>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-indigo-700"
                    onClick={() => setIsFileViewerOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
                
                <div className="flex-1 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-8">
                    <Music className="h-10 w-10 text-white" />
                  </div>
                  
                  <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-medium mb-4 text-center">{selectedFile?.name}</h3>
                    <audio 
                      src={fileViewerUrl}
                      className="w-full" 
                      controls 
                      autoPlay
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default FilesPage;
