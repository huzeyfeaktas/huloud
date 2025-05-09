import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Home, 
  Image, 
  FileVideo,
  FileText,
  Star,
  Trash,
  HardDrive,
  Settings
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StorageStats } from '@shared/schema';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: storageStats, isLoading } = useQuery<StorageStats>({
    queryKey: ['/api/storage'],
  });

  // Admin kontrolü
  const isAdmin = user?.username === 'huzeyfeakt';

  const navItems: NavItem[] = [
    { icon: <Home className="mr-3 h-5 w-5" />, label: 'Tüm Dosyalar', path: '/files' },
    { icon: <Image className="mr-3 h-5 w-5" />, label: 'Resimler', path: '/files/type/image' },
    { icon: <FileVideo className="mr-3 h-5 w-5" />, label: 'Videolar', path: '/files/type/video' },
    { icon: <FileText className="mr-3 h-5 w-5" />, label: 'Belgeler', path: '/files/type/document' },
    { icon: <Star className="mr-3 h-5 w-5" />, label: 'Favoriler', path: '/files/favorites' },
    { icon: <Trash className="mr-3 h-5 w-5" />, label: 'Çöp Kutusu', path: '/files/trash' },
    ...(isAdmin ? [{ icon: <Settings className="mr-3 h-5 w-5" />, label: 'Yönetici Paneli', path: '/admin' }] : []),
  ];

  const isActive = (path: string) => location === path;

  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className={`drawer fixed z-40 h-full w-64 bg-sidebar border-r border-sidebar-border md:w-64 shadow-lg ${isOpen ? 'open' : ''}`}>
      <div className="px-4 py-3 bg-primary text-white flex items-center">
        <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 4C5 2.89543 5.89543 2 7 2H17C18.1046 2 19 2.89543 19 4V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4Z" />
          <path d="M9 6H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 10H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 14H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 className="text-xl font-medium">Huloud</h1>
      </div>
      
      {/* Depolama Durumu */}
      <div className="p-4 border-b border-sidebar-border">
        {/* Depolama aygıt ismi ve ikonu */}
        <div className="flex items-center mb-2">
          <HardDrive className="h-4 w-4 mr-2 text-primary" />
          <span className="text-sm font-medium">
            {isLoading ? 'Depolama Aygıtı' : (storageStats?.deviceName || 'Depolama Aygıtı')}
          </span>
        </div>
        
        {/* Depolama kullanımı */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-sidebar-foreground">Depolama</span>
          <span className="text-sm text-sidebar-foreground">
            {isLoading ? 'Yükleniyor...' : (
              `${formatStorage(storageStats?.used || 0)} / ${formatStorage(storageStats?.total || 0)}`
            )}
          </span>
        </div>
        <Progress 
          value={storageStats?.usedPercentage || 0} 
          className="h-2 mb-1" 
        />
        
        {/* Sistem diski boş alan bilgisi */}
        {storageStats?.free !== undefined && (
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>Sistem diskinde boş alan:</span>
            <span>{formatStorage(storageStats.free)}</span>
          </div>
        )}
      </div>
      
      {/* Gezinme Bağlantıları */}
      <nav className="p-2">
        <ul>
          {navItems.map((item, index) => (
            <li key={index}>
              <div className={`flex items-center px-4 py-3 rounded-md transition-colors mb-1 group ${
                isActive(item.path)
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}>
                <Link href={item.path} className="flex items-center w-full">
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Alt kısım artık boş, "Flash sürücü bağlı" bilgisi kaldırıldı */}
    </div>
  );
};

export default Sidebar;
