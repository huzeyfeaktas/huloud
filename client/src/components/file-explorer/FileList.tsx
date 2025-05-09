import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { FileSystemItem } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  MoreVertical,
  Folder,
  FileText,
  Image,
  Video,
  File,
  Music,
  Archive
} from 'lucide-react';
import FileContextMenu from './FileContextMenu';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { formatDistance } from 'date-fns';

interface FileListProps {
  parentId: number | null;
  onFileAction: (action: string, file: FileSystemItem) => void;
}

const FileList: React.FC<FileListProps> = ({ parentId, onFileAction }) => {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Route'a göre farklı API endpoint'leri kullanılır
  const [, params] = useRoute('/files/type/:type');
  const [isFavoritesRoute] = useRoute('/files/favorites');
  const [location] = useLocation();
  
  // URL'e göre doğru API endpoint'ini belirle
  let queryEndpoint = '/api/files';
  
  if (parentId !== null) {
    queryEndpoint = `/api/files?parentId=${parentId}`;
  } else if (params?.type) {
    queryEndpoint = `/api/files/type/${params.type}`;
  } else if (location.includes('/files/favorites')) {
    queryEndpoint = '/api/files/favorites';
  }
  
  console.log("Using API endpoint:", queryEndpoint);
  
  const { data: files, isLoading, error } = useQuery<FileSystemItem[]>({
    queryKey: [queryEndpoint],
  });

  const getFileIcon = (file: FileSystemItem) => {
    if (file.isDirectory) return <Folder className="h-5 w-5 text-primary" />;
    
    // Dosya uzantısını kontrol et
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Resim dosyaları için doğrudan önizleme göster
    if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      const previewUrl = `/api/files/${file.id}/download?preview=true&t=${Date.now()}&r=${Math.random()}`;
      return (
        <div className="h-5 w-5 overflow-hidden rounded">
          <img 
            src={previewUrl} 
            alt={file.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
    
    // Diğer dosya türleri için ikon göster
    switch(file.type) {
      case 'document':
        return <FileText className="h-5 w-5 text-primary" />;
      case 'image':
        return <Image className="h-5 w-5 text-primary" />;
      case 'video':
        return <Video className="h-5 w-5 text-primary" />;
      case 'audio':
        return <Music className="h-5 w-5 text-primary" />;
      case 'archive':
        return <Archive className="h-5 w-5 text-primary" />;
      default:
        return <File className="h-5 w-5 text-primary" />;
    }
  };

  const formatFileSize = (size: number) => {
    if (size === 0) return '--';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (date: Date) => {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  };
  
  if (isLoading) {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        
        <div className="bg-white rounded-lg border border-neutral-medium shadow-sm">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="p-4 border-b border-neutral-medium flex items-center">
              <Skeleton className="h-5 w-5 mr-3" />
              <Skeleton className="h-5 flex-1 max-w-xs" />
              <Skeleton className="h-5 w-20 ml-4 hidden md:block" />
              <Skeleton className="h-5 w-32 ml-4 hidden md:block" />
              <Skeleton className="h-8 w-8 ml-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-4">Error loading files: {error.message}</div>;
  }

  // Pagination
  const totalPages = Math.ceil((files?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = files?.slice(startIndex, startIndex + itemsPerPage) || [];

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-foreground">Dosyalar & Klasörler</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-muted-foreground">Görünüm:</span>
          <Button 
            variant="ghost" 
            size="icon"
            className={view === 'grid' ? 'text-primary' : 'text-muted-foreground'}
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className={view === 'list' ? 'text-primary' : 'text-muted-foreground'}
            onClick={() => setView('list')}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* File List Headers */}
          <div className="hidden md:flex py-2 px-4 bg-muted rounded-t-lg border border-border">
            <div className="flex-1 font-medium text-foreground">İsim</div>
            <div className="w-32 font-medium text-foreground">Boyut</div>
            <div className="w-40 font-medium text-foreground">Değiştirilme</div>
            <div className="w-20"></div>
          </div>

          {/* File Items */}
          <div className="bg-card rounded-lg md:rounded-t-none border border-border md:border-t-0 shadow-sm divide-y divide-border">
            {paginatedFiles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Bu konumda dosya veya klasör bulunamadı
              </div>
            ) : (
              paginatedFiles.map((file) => (
                <div key={file.id} className="p-3 md:p-4 hover:bg-muted flex items-center">
                  <div className="flex-1 flex items-center min-w-0">
                    {getFileIcon(file)}
                    {file.isDirectory ? (
                      <Link href={`/folder/${file.id}`} className="font-medium text-foreground truncate ml-3 hover:underline">
                        {file.name}
                      </Link>
                    ) : (
                      <span 
                        className="font-medium text-foreground truncate ml-3 cursor-pointer hover:underline"
                        onClick={() => onFileAction('open', file)}
                      >
                        {file.name}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block w-32 text-muted-foreground">
                    {formatFileSize(file.size)}
                  </div>
                  <div className="hidden md:block w-40 text-muted-foreground">
                    {formatDate(file.updatedAt)}
                  </div>
                  <div className="w-8 md:w-20 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <FileContextMenu file={file} onAction={onFileAction} />
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Gösteriliyor: {startIndex + 1}-{Math.min(startIndex + itemsPerPage, files?.length || 0)} / Toplam: {files?.length || 0} öğe
              </div>
              <div className="flex">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-r-none"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button 
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    className="rounded-none border-x-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  size="icon"
                  className="rounded-l-none"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedFiles.length === 0 ? (
            <div className="col-span-full p-8 text-center text-muted-foreground">
              Bu konumda dosya veya klasör bulunamadı
            </div>
          ) : (
            paginatedFiles.map((file) => (
              <div 
                key={file.id}
                onClick={() => !file.isDirectory && onFileAction('open', file)}
                className="file-card bg-card rounded-lg shadow-sm p-4 border border-border cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    {getFileIcon(file)}
                    {file.isDirectory ? (
                      <Link href={`/folder/${file.id}`} className="font-medium text-foreground truncate ml-2 hover:underline">
                        {file.name}
                      </Link>
                    ) : (
                      <span 
                        className="font-medium text-foreground truncate ml-2 cursor-pointer hover:underline"
                        onClick={() => onFileAction('open', file)}
                      >
                        {file.name}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <FileContextMenu file={file} onAction={onFileAction} />
                  </DropdownMenu>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {file.isDirectory ? (
                      '—'
                    ) : (
                      formatFileSize(file.size)
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(file.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FileList;
