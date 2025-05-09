import React, { useState } from 'react';
import { Menu, Search, LogOut, Settings, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  toggleDrawer: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ toggleDrawer }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const isAdmin = user?.username === 'huzeyfeakt';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/files?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleSettings = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/settings');
    }
  };

  return (
    <header className="bg-white border-b border-neutral-medium shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-4"
            onClick={toggleDrawer}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                className="pl-10 pr-4 py-2 w-64"
                placeholder="Dosyalarda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
        
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSettings}
            aria-label="Ayarlar"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-4 p-0" aria-label="Profil">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.displayName || user?.username}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  Yönetici Paneli
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
