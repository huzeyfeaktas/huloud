import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { FileSystemItem } from '@shared/schema';
import { 
  Folder,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  File as FileIcon,
  Music,
  Archive,
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface FileCardProps {
  file: FileSystemItem;
  onClick?: (file: FileSystemItem) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  const { user } = useAuth(); // Oturum bilgilerini al
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  // Dosya bir resim mi?
  const isImageFile = file.type === 'image' || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
      file.name.split('.').pop()?.toLowerCase() || ''
    );

  useEffect(() => {
    // Önbellek yönetimi - resim ve video dosyaları için önizleme URL'si oluştur
    if (!file.isDirectory && user && (isImageFile || file.type === 'video')) {
      // Önceki bağlantıyı temizle
      if (previewUrl) {
        setPreviewLoaded(false);
        setPreviewError(false);
      }
      
      // Önbellek kıran parametreler - benzersiz olmalı
      const timestamp = Date.now();
      const randomValue = Math.floor(Math.random() * 1000000);
      setPreviewUrl(`/api/files/${file.id}/download?preview=true&t=${timestamp}&r=${randomValue}`);
    }
  }, [file.id, user]);

  // Dosyayı açma fonksiyonu
  const handleFileClick = () => {
    if (onClick) {
      onClick(file);
    }
  };

  // Dosya uzantısını belirle ve güvenli bir şekilde al
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  // Önizleme hatalarını önlemek için ek kontroller
  const safeFileId = file.id || 0;

  // SADECE RESİM DOSYALARI İÇİN: Basit ve doğrudan bir yaklaşım
  const renderFilePreview = () => {
    // Resim dosyası mı?
    const isImage = file.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
    
    // Klasör için ikon göster
    if (file.isDirectory) {
      return <Folder className="h-16 w-16 text-blue-500" />;
    }
    
    // Resim dosyaları için önizleme
    if (isImage) {
      // Basit statik görünüm için stil
      const colorIndex = file.name.length % 5;
      const bgColors = [
        'bg-gradient-to-br from-red-300 to-pink-200', 
        'bg-gradient-to-br from-blue-300 to-teal-200',
        'bg-gradient-to-br from-green-300 to-lime-200',
        'bg-gradient-to-br from-purple-300 to-indigo-200',
        'bg-gradient-to-br from-orange-300 to-amber-200'
      ];
      
      // Doğrudan resmi göstermek için benzersiz bir URL oluştur
      // Önbellek sorunlarını çözmek için rastgele değer ekle
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const directImageUrl = `/api/files/${safeFileId}/download?preview=true&t=${timestamp}&r=${random}`;
      
      return (
        <div className="relative w-full h-full">
          {/* Arka plan rengi */}
          <div className={`absolute inset-0 ${bgColors[colorIndex]}`}></div>
          
          {/* Yükleniyor göstergesi */}
          {!previewLoaded && !previewError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
            </div>
          )}
          
          {/* Gerçek resim */}
          <img 
            src={directImageUrl}
            alt={file.name}
            className="absolute inset-0 w-full h-full object-cover z-10"
            style={{ opacity: previewLoaded ? 1 : 0 }}
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setPreviewError(true)}
          />
          
          {/* Hata durumunda ikon gösterme */}
          {previewError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <ImageIcon className="h-12 w-12 text-white" />
              <span className="text-xs text-white mt-2 bg-black bg-opacity-50 px-2 py-1 rounded">Önizleme yüklenemedi</span>
            </div>
          )}
          
          {/* Dosya türü etiketi */}
          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded z-20">
            {extension ? extension.toUpperCase() : 'IMG'}
          </div>
        </div>
      );
    }

    // Video dosyaları için önizleme
    if (file.type === 'video' || ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(extension)) {
      // Video dosyaları için kapak resmi URL'si
      const videoThumbnailUrl = `/api/files/${safeFileId}/download?preview=true&t=${Date.now()}&r=${Math.random()}`;
      
      return (
        <>
          {/* Video önizleme (thumbnail) resmi */}
          <img 
            src={videoThumbnailUrl}
            alt={file.name}
            className={`w-full h-full object-cover ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setPreviewError(true)}
          />
          
          {/* Yükleniyor göstergesi */}
          {!previewLoaded && !previewError && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <VideoIcon className="h-12 w-12 text-purple-500" />
                <span className="mt-2 text-xs text-purple-500">Yükleniyor...</span>
              </div>
            </div>
          )}

          {/* Video etiketi */}
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-sm shadow-sm">
            VİDEO
          </div>

          {/* Oynatma butonu */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full p-3 bg-black bg-opacity-50 flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L19 12L5 21V3Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          {/* Hata durumunda alternatif görünüm */}
          {previewError && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center">
              <VideoIcon className="h-12 w-12 text-purple-500 mb-2" />
              <span className="text-xs text-purple-500 font-medium px-2 py-1 bg-white bg-opacity-70 rounded">Önizleme yüklenemedi</span>
            </div>
          )}
        </>
      );
    }

    // PDF dosyaları için önizleme
    if (extension === 'pdf') {
      // PDF önizleme URL'si
      const pdfThumbnailUrl = `/api/files/${safeFileId}/download?preview=true&t=${Date.now()}&r=${Math.random()}`;
      
      return (
        <>
          {/* PDF önizleme resmi */}
          <img 
            src={pdfThumbnailUrl}
            alt={file.name}
            className={`w-full h-full object-cover ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setPreviewError(true)}
          />
          
          {/* Yükleniyor göstergesi ve alternatif görünüm */}
          {!previewLoaded && !previewError && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping bg-red-200 rounded-md opacity-50"></div>
                  <FileText className="h-12 w-12 text-red-500 relative" />
                </div>
                <span className="mt-2 text-xs text-red-500">PDF yükleniyor...</span>
              </div>
            </div>
          )}
          
          {/* PDF etiketi - her durumda görünür */}
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-sm shadow-sm">
            PDF
          </div>
          
          {/* Hata durumunda alternatif görünüm */}
          {previewError && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 flex flex-col items-center justify-center">
              <div className="absolute inset-4 bg-white border border-gray-200 shadow-sm rounded-md flex flex-col">
                <div className="bg-red-500 h-1 w-full"></div>
                <div className="flex-1 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-red-500" />
                </div>
              </div>
              
              {/* Hata mesajı */}
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="text-xs text-red-500 bg-white bg-opacity-70 px-2 py-1 rounded-sm">Önizleme alınamadı</span>
              </div>
            </div>
          )}
          
          {/* Katmanlı arka plan efekti - opsiyonel, şık bir efekt */}
          <div className="absolute -bottom-1 right-0 left-0 h-2 bg-gray-200 transform -skew-x-12"></div>
          <div className="absolute -bottom-2 right-0 left-0 h-2 bg-gray-300 transform skew-x-12"></div>
        </>
      );
    }

    // Doküman dosyaları (Word, Excel, PowerPoint)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'].includes(extension)) {
      // Dosya türüne göre renk ve etiket belirle
      let fileColor = 'text-blue-500 bg-blue-100';
      let fileBorder = 'border-blue-500';
      let fileLabel = 'DOC';
      let bgGradient = 'from-blue-50 to-indigo-50';
      
      if (['xls', 'xlsx'].includes(extension)) {
        fileColor = 'text-green-500 bg-green-100';
        fileBorder = 'border-green-500';
        fileLabel = 'XLS';
        bgGradient = 'from-green-50 to-emerald-50';
      } else if (['ppt', 'pptx'].includes(extension)) {
        fileColor = 'text-orange-500 bg-orange-100';
        fileBorder = 'border-orange-500';
        fileLabel = 'PPT';
        bgGradient = 'from-orange-50 to-amber-50';
      } else if (['txt', 'rtf'].includes(extension)) {
        fileColor = 'text-gray-500 bg-gray-100';
        fileBorder = 'border-gray-500';
        fileLabel = 'TXT';
        bgGradient = 'from-gray-50 to-slate-50';
      }
      
      // Doküman önizleme URL'si
      const docThumbnailUrl = `/api/files/${safeFileId}/download?preview=true&t=${Date.now()}&r=${Math.random()}`;
      
      return (
        <>
          {/* Doküman önizleme resmi (eğer varsa) */}
          <img 
            src={docThumbnailUrl}
            alt={file.name}
            className={`w-full h-full object-cover ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setPreviewError(true)}
          />
          
          {/* Yükleniyor animasyonu ya da hata olmadığında gösterilecek fallback */}
          {(!previewLoaded || previewError) && (
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`}>
              {/* Doküman gösterimi */}
              <div className={`absolute inset-4 bg-white border ${fileBorder} border-t-4 shadow-sm rounded-sm flex flex-col`}>
                {/* Belge içeriği çizgileri */}
                <div className="flex-1 flex flex-col justify-start p-3 gap-1.5">
                  <div className="h-1 bg-gray-200 w-3/4 rounded-full"></div>
                  <div className="h-1 bg-gray-200 w-4/5 rounded-full"></div>
                  <div className="h-1 bg-gray-200 w-2/3 rounded-full"></div>
                  <div className="h-1 bg-gray-200 w-4/5 rounded-full"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Etiket - her durumda görünür */}
          <div className={`absolute top-2 right-2 ${fileColor.split(' ')[1]} border ${fileBorder} text-xs px-2 py-0.5 rounded-sm font-medium ${fileColor.split(' ')[0]} shadow-sm`}>
            {fileLabel}
          </div>
        </>
      );
    }

    // Ses dosyaları için önizleme
    if (file.type === 'audio' || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            {/* Ses dalgaları animasyonu */}
            <div className="flex items-end space-x-1">
              <div className="w-1 h-4 bg-white opacity-70 rounded-t animate-soundwave"></div>
              <div className="w-1 h-8 bg-white opacity-80 rounded-t animate-soundwave animation-delay-200"></div>
              <div className="w-1 h-12 bg-white opacity-90 rounded-t animate-soundwave animation-delay-300"></div>
              <div className="w-1 h-16 bg-white rounded-t animate-soundwave animation-delay-400"></div>
              <div className="w-1 h-12 bg-white opacity-90 rounded-t animate-soundwave animation-delay-300"></div>
              <div className="w-1 h-8 bg-white opacity-80 rounded-t animate-soundwave animation-delay-200"></div>
              <div className="w-1 h-4 bg-white opacity-70 rounded-t animate-soundwave"></div>
            </div>
          </div>
          
          {/* Ses dosyası ikonu */}
          <div className="absolute bottom-2 right-2 bg-white rounded-full p-1.5">
            <Music className="h-5 w-5 text-indigo-600" />
          </div>
          
          {/* Ses formatı etiketi */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-30 text-white text-xs px-2 py-0.5 rounded">
            {extension ? extension.toUpperCase() : 'AUDIO'}
          </div>
        </>
      );
    }

    // Arşiv dosyaları için önizleme
    if (file.type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return (
        <>
          {/* Arşiv klasörü görünümü */}
          <div className="absolute inset-4 bg-yellow-100 rounded-md shadow border border-yellow-200 flex flex-col overflow-hidden">
            <div className="h-6 bg-yellow-400 w-full"></div>
            <div className="flex-1 flex items-center justify-center">
              <Archive className="h-10 w-10 text-yellow-700" />
            </div>
            
            {/* Fermuar görünümü */}
            <div className="absolute h-full w-0.5 bg-yellow-400 left-1/2 transform -translate-x-1/2 top-6">
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full"></div>
              <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full"></div>
              <div className="absolute top-9 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full"></div>
              <div className="absolute top-13 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-600 rounded-full"></div>
            </div>
          </div>
          
          {/* Arşiv formatı etiketi */}
          <div className="absolute bottom-2 right-2 bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-sm">
            {extension ? extension.toUpperCase() : 'ZIP'}
          </div>
        </>
      );
    }

    // Varsayılan dosya gösterimi (tanınmayan türler için)
    return (
      <>
        <div className="absolute inset-4 bg-white border border-gray-200 shadow rounded-sm flex items-center justify-center">
          <div className="relative h-16 w-12 bg-white border border-gray-300 rounded-sm shadow-sm">
            {/* Kağıt köşesi kıvrımı */}
            <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-t-white border-r-transparent"></div>
            
            {/* Dosya uzantısı */}
            <div className="absolute bottom-1 inset-x-0 text-center text-xs text-gray-600 font-semibold">
              {extension ? extension.toUpperCase() : '?'}
            </div>
            
            {/* Genel dosya ikonu */}
            <div className="absolute inset-0 flex items-center justify-center -mt-2">
              <FileIcon className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </>
    );
  };

  // Dosya boyutu formatı
  const formatFileSize = (size: number) => {
    if (size === 0) return '--';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Dosya türüne göre UI sınıfları
  const getBackgroundColor = () => {
    if (file.isDirectory) return 'bg-blue-50';
    
    switch(true) {
      case file.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension):
        return 'bg-emerald-50';
      case file.type === 'video' || ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(extension):
        return 'bg-purple-50';
      case file.type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension):
        return 'bg-indigo-50';
      case extension === 'pdf':
        return 'bg-red-50';
      case ['doc', 'docx'].includes(extension):
        return 'bg-blue-50';
      case ['xls', 'xlsx'].includes(extension):
        return 'bg-green-50';
      case ['ppt', 'pptx'].includes(extension):
        return 'bg-orange-50';
      case ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension):
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div 
      className="file-card bg-card rounded-lg shadow-sm p-4 border border-border hover:shadow-md transition-all"
      onClick={handleFileClick}
    >
      {/* Dosya önizleme kartı - Google Drive benzeri arayüz */}
      <div 
        className={`w-full h-28 rounded-md mb-3 relative overflow-hidden ${getBackgroundColor()} flex items-center justify-center cursor-pointer`}
      >
        {renderFilePreview()}
      </div>
      
      {/* Dosya adı */}
      <div className="flex items-center mb-2">
        <span className="font-medium text-foreground truncate cursor-pointer hover:underline">
          {file.name}
        </span>
      </div>
      
      {/* Dosya bilgileri */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {file.isDirectory ? 'Klasör' : formatFileSize(file.size)}
        </span>
        <span>
          {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default FileCard;
