import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, FileUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileSystemItem } from '@shared/schema';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: number | null;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, currentFolderId }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation<FileSystemItem, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await apiRequest('POST', '/api/files/upload', formData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
      
      const newProgresses: UploadProgress[] = newFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      }));
      
      setUploadProgresses([...uploadProgresses, ...newProgresses]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
      
      const newProgresses: UploadProgress[] = newFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      }));
      
      setUploadProgresses([...uploadProgresses, ...newProgresses]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    // Process each file individually
    for (let i = 0; i < files.length; i++) {
      if (uploadProgresses[i].status === 'completed') continue;

      try {
        setUploadProgresses(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'uploading', progress: 10 };
          return updated;
        });

        const formData = new FormData();
        formData.append('file', files[i]);
        if (currentFolderId) {
          formData.append('parentId', currentFolderId.toString());
        }

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgresses(prev => {
            const updated = [...prev];
            if (updated[i] && updated[i].progress < 90) {
              updated[i] = { 
                ...updated[i], 
                progress: Math.min(updated[i].progress + 10, 90) 
              };
            }
            return updated;
          });
        }, 300);

        // FormData için doğrudan fetch kullanın, apiRequest yerine
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          // Content-Type header belirtmeyin, browser otomatik ekleyecek
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || response.statusText);
        }
        
        const data = await response.json();

        clearInterval(progressInterval);

        setUploadProgresses(prev => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = { ...updated[i], status: 'completed', progress: 100 };
          }
          return updated;
        });

      } catch (error) {
        setUploadProgresses(prev => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = { 
              ...updated[i], 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
          return updated;
        });

        toast({
          title: "Yükleme başarısız",
          description: `${files[i].name} dosyası yüklenemedi`,
          variant: "destructive"
        });
      }
    }

    // Update any queries that would show the files
    queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    
    if (currentFolderId) {
      queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
    }
    
    // Also invalidate recent files
    queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
    
    // Find file type and invalidate those queries too
    const fileExtensions = files.map(file => file.name.split('.').pop()?.toLowerCase());
    if (fileExtensions.some(ext => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext || ''))) {
      queryClient.invalidateQueries({ queryKey: ['/api/files/type/image'] });
    }
    if (fileExtensions.some(ext => ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext || ''))) {
      queryClient.invalidateQueries({ queryKey: ['/api/files/type/video'] });
    }
    if (fileExtensions.some(ext => ['doc', 'docx', 'pdf', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || ''))) {
      queryClient.invalidateQueries({ queryKey: ['/api/files/type/document'] });
    }
    
    toast({
      title: "Yükleme tamamlandı",
      description: "Tüm dosyalar başarıyla yüklendi",
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgresses(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    // Reset state if all uploads are complete or if there are no uploads
    if (
      uploadProgresses.every(p => p.status === 'completed' || p.status === 'error') ||
      uploadProgresses.length === 0
    ) {
      setFiles([]);
      setUploadProgresses([]);
      onClose();
    } else {
      // Confirm if there are ongoing uploads
      if (window.confirm('Cancel ongoing uploads?')) {
        setFiles([]);
        setUploadProgresses([]);
        onClose();
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dosya Yükle</DialogTitle>
        </DialogHeader>
        
        <div 
          className="border-2 border-dashed border-muted rounded-lg p-6 mb-4 text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="mb-2 text-foreground">Dosyaları sürükleyip bırakın</p>
          <p className="text-sm text-muted-foreground mb-4">veya</p>
          <Button onClick={triggerFileInput}>
            Dosyalara Göz At
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileChange}
          />
        </div>
        
        {/* Upload Progress */}
        {uploadProgresses.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
            {uploadProgresses.map((item, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatFileSize(item.file.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-1"
                      onClick={() => removeFile(index)}
                      disabled={item.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Progress 
                  value={item.progress} 
                  className={`h-2 ${
                    item.status === 'error' ? 'bg-destructive/20' : ''
                  }`}
                />
                {item.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
            İptal
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={
              files.length === 0 ||
              uploadMutation.isPending ||
              uploadProgresses.every(p => p.status === 'completed')
            }
            className="flex items-center"
          >
            <FileUp className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Yükleniyor...' : 'Yükle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
