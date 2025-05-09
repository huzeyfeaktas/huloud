import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  HardDrive, Database, Settings, Server, Globe, Shield, 
  Folder, FileText, ArrowLeft, Download, Eye, ChevronRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFileSize } from '@/lib/file-utils';

// Depolama aygıtı tipi
type StorageDeviceType = 'flash' | 'disk';

// Depolama aygıtı
interface StorageDevice {
  id: string;
  name: string;
  path: string;
  type: StorageDeviceType;
  totalSpace: number;
  freeSpace: number;
}

// Ağ ayarları
interface NetworkSettings {
  enableRemoteAccess: boolean;
  port: number;
  useSSL: boolean;
  domain?: string;
}

// Sistem Dosyaları için gerekli tipler
interface SystemFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  type: string;
  modifiedAt: string;
}

interface SystemFilesResponse {
  currentPath: string;
  items: SystemFile[];
}

// Sistem Dosyaları Gezgini Bileşeni
function SystemFilesExplorer() {
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<SystemFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{name: string, path: string}[]>([]);
  const [selectedFile, setSelectedFile] = useState<SystemFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Dizin içeriğini yükle
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/admin/system-files?directory=${encodeURIComponent(currentPath)}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Dizin içeriği alınamadı: ${response.statusText}`);
        }
        
        const data: SystemFilesResponse = await response.json();
        setFiles(data.items);
        
        // Breadcrumbs oluştur
        const pathParts = data.currentPath.split('/').filter(Boolean);
        let pathSoFar = '/';
        
        const breadcrumbItems = [{ name: 'Ana Dizin', path: '/' }];
        
        for (const part of pathParts) {
          pathSoFar = `${pathSoFar}${part}/`;
          breadcrumbItems.push({ name: part, path: pathSoFar });
        }
        
        setBreadcrumbs(breadcrumbItems);
      } catch (error) {
        console.error('Sistem dosyaları yüklenirken hata:', error);
        toast({
          title: 'Hata',
          description: error instanceof Error ? error.message : 'Sistem dosyaları yüklenemedi',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFiles();
  }, [currentPath, toast]);
  
  // Dosya tipine göre ikon döndür
  const getFileIcon = (file: SystemFile) => {
    if (file.isDirectory) {
      return <Folder className="h-5 w-5 text-yellow-500" />;
    }
    
    switch (file.type) {
      case 'image':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'audio':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'archive':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Dosya önizleme URL'ini oluştur
  const getPreviewUrl = (file: SystemFile) => {
    if (file.isDirectory) return null;
    
    const isPreviewable = ['image', 'video', 'audio', 'document'].includes(file.type);
    
    if (!isPreviewable) return null;
    
    return `/api/admin/system-files/download?path=${encodeURIComponent(file.path)}&preview=true`;
  };
  
  // Dosya indirme URL'ini oluştur
  const getDownloadUrl = (file: SystemFile) => {
    if (file.isDirectory) return null;
    return `/api/admin/system-files/download?path=${encodeURIComponent(file.path)}`;
  };
  
  // Dosya veya klasöre tıklandığında
  const handleFileClick = (file: SystemFile) => {
    if (file.isDirectory) {
      // Klasörse, o klasöre gir
      setCurrentPath(file.path);
    } else {
      // Dosyaysa, seç ve önizleme URL'ini oluştur
      setSelectedFile(file);
      setPreviewUrl(getPreviewUrl(file));
    }
  };
  
  // Breadcrumb öğesine tıklama
  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };
  
  // Dosya özellikleri formatla
  const formatLastModified = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Server className="mr-2 h-5 w-5" />
          Sistem Dosyalarına Erişim
        </CardTitle>
        <CardDescription>
          Bilgisayarınızdaki tüm dosyalara buradan erişebilirsiniz. Bu özellik sadece yönetici hesabında çalışır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Dizin Yolu (Breadcrumb) */}
        <div className="flex items-center mb-4 overflow-auto">
          <div className="flex items-center space-x-1 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={item.path} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
                <button
                  onClick={() => handleBreadcrumbClick(item.path)}
                  className="hover:underline flex items-center px-2 py-1 rounded hover:bg-secondary"
                >
                  {index === 0 ? (
                    <><Server className="h-3 w-3 mr-1" /> {item.name}</>
                  ) : (
                    item.name
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dosya Listesi */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">İsim</TableHead>
                <TableHead>Boyut</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Son Değiştirilme</TableHead>
                <TableHead className="w-[100px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                      <span>Dosyalar yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Folder className="h-10 w-10 mb-2" />
                      <span>Bu klasör boş görünüyor.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.path} className="cursor-pointer hover:bg-muted/50" onClick={() => handleFileClick(file)}>
                    <TableCell className="font-medium flex items-center">
                      <div className="mr-2">
                        {getFileIcon(file)}
                      </div>
                      <span>{file.name}</span>
                    </TableCell>
                    <TableCell>
                      {file.isDirectory ? '-' : formatFileSize(file.size)}
                    </TableCell>
                    <TableCell>
                      {file.isDirectory 
                        ? 'Klasör' 
                        : file.type === 'image' 
                          ? 'Resim' 
                          : file.type === 'video' 
                            ? 'Video' 
                            : file.type === 'audio' 
                              ? 'Ses' 
                              : file.type === 'document' 
                                ? 'Belge' 
                                : file.type === 'archive' 
                                  ? 'Arşiv' 
                                  : 'Diğer'}
                    </TableCell>
                    <TableCell>
                      {formatLastModified(file.modifiedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {!file.isDirectory && (
                          <>
                            <Button size="icon" variant="ghost" onClick={(e) => {
                              e.stopPropagation();
                              window.open(getPreviewUrl(file) || '', '_blank');
                            }} title="Önizle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={(e) => {
                              e.stopPropagation();
                              window.open(getDownloadUrl(file) || '', '_blank');
                            }} title="İndir">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Seçili dosya önizleme */}
        {selectedFile && !selectedFile.isDirectory && previewUrl && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              {getFileIcon(selectedFile)}
              <span className="ml-2">{selectedFile.name} Önizlemesi</span>
            </h3>
            <div className="overflow-hidden rounded-md border">
              {selectedFile.type === 'image' && (
                <img src={previewUrl} alt={selectedFile.name} className="max-h-[400px] object-contain mx-auto" />
              )}
              {selectedFile.type === 'video' && (
                <video src={previewUrl} controls className="w-full max-h-[400px]">
                  Tarayıcınız video oynatmayı desteklemiyor.
                </video>
              )}
              {selectedFile.type === 'audio' && (
                <audio src={previewUrl} controls className="w-full">
                  Tarayıcınız ses oynatmayı desteklemiyor.
                </audio>
              )}
              {selectedFile.type === 'document' && selectedFile.name.endsWith('.pdf') && (
                <iframe src={previewUrl} className="w-full h-[500px]">
                  PDF görüntüleyici yüklenemedi.
                </iframe>
              )}
              {(selectedFile.type !== 'image' && 
                selectedFile.type !== 'video' && 
                selectedFile.type !== 'audio' && 
                !(selectedFile.type === 'document' && selectedFile.name.endsWith('.pdf'))) && (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2" />
                  <p>Bu dosya türü için önizleme mevcut değil.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => window.open(getDownloadUrl(selectedFile) || '', '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    İndir
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('storage');
  const [availableDevices, setAvailableDevices] = useState<StorageDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    enableRemoteAccess: false,
    port: 8080,
    useSSL: false,
    domain: '',
  });

  // Admin kontrolü
  const isAdmin = user?.username === 'huzeyfeakt';

  // Eğer kullanıcı admin değilse ana sayfaya yönlendir
  if (!user || !isAdmin) {
    return <Redirect to="/" />;
  }

  // Kullanılabilir depolama aygıtlarını yükle
  useEffect(() => {
    const loadAvailableDevices = async () => {
      try {
        setIsLoading(true);
        
        // Depolama aygıtlarını API'den al
        const devicesResponse = await fetch('/api/admin/storage/devices', {
          credentials: 'include'
        });
        
        if (!devicesResponse.ok) {
          throw new Error('Depolama aygıtları alınamadı');
        }
        
        const devices: StorageDevice[] = await devicesResponse.json();
        setAvailableDevices(devices);
        
        // Eğer daha önce seçilmiş bir aygıt yoksa ilk aygıtı seç
        if (!selectedDevice && devices.length > 0) {
          setSelectedDevice(devices[0].id);
        }
        
        // Ağ ayarlarını API'den al
        const networkResponse = await fetch('/api/admin/network', {
          credentials: 'include'
        });
        
        if (!networkResponse.ok) {
          throw new Error('Ağ ayarları alınamadı');
        }
        
        const networkData: NetworkSettings = await networkResponse.json();
        setNetworkSettings(networkData);
      } catch (error) {
        console.error('Ayarlar yüklenirken hata oluştu:', error);
        toast({
          title: 'Hata',
          description: 'Ayarlar yüklenirken bir sorun oluştu.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableDevices();
  }, [toast, selectedDevice]);

  // Depolama aygıtını değiştir
  const handleChangeStorageDevice = async (deviceId: string) => {
    try {
      setIsLoading(true);
      setSelectedDevice(deviceId);
      
      // API çağrısı ile depolama aygıtını değiştir
      await apiRequest('POST', '/api/admin/storage/device', { deviceId });
      
      toast({
        title: 'Başarılı',
        description: 'Depolama aygıtı başarıyla değiştirildi.',
      });
    } catch (error) {
      console.error('Depolama aygıtı değiştirilirken hata oluştu:', error);
      toast({
        title: 'Hata',
        description: 'Depolama aygıtı değiştirilirken bir sorun oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ağ ayarlarını güncelle
  const handleNetworkSettingsChange = (setting: keyof NetworkSettings, value: any) => {
    setNetworkSettings(prev => ({ ...prev, [setting]: value }));
  };

  // Ağ ayarlarını kaydet
  const saveNetworkSettings = async () => {
    try {
      setIsLoading(true);
      
      // API çağrısı ile ağ ayarlarını kaydet
      await apiRequest('POST', '/api/admin/network', networkSettings);
      
      toast({
        title: 'Başarılı',
        description: 'Ağ ayarları başarıyla kaydedildi.',
      });
    } catch (error) {
      console.error('Ağ ayarları kaydedilirken hata oluştu:', error);
      toast({
        title: 'Hata',
        description: 'Ağ ayarları kaydedilirken bir sorun oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Boyut formatla
  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Yönetici Paneli</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="storage">
            <HardDrive className="mr-2 h-4 w-4" />
            Depolama Ayarları
          </TabsTrigger>
          <TabsTrigger value="network">
            <Globe className="mr-2 h-4 w-4" />
            Ağ Ayarları
          </TabsTrigger>
          <TabsTrigger value="system-files">
            <Server className="mr-2 h-4 w-4" />
            Sistem Dosyaları
          </TabsTrigger>
        </TabsList>
        
        {/* Depolama Ayarları */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="mr-2 h-5 w-5" />
                Depolama Aygıtı Seçimi
              </CardTitle>
              <CardDescription>
                Huloud'un dosyaları depolayacağı aygıtı seçin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="storageDevice">Aktif Depolama Aygıtı</Label>
                  <Select 
                    value={selectedDevice} 
                    onValueChange={handleChangeStorageDevice}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="storageDevice">
                      <SelectValue placeholder="Depolama aygıtı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices.map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({formatSize(device.freeSpace)} boş / {formatSize(device.totalSpace)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedDevice && (
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Seçilen Aygıt Bilgileri</h3>
                    {availableDevices
                      .filter(d => d.id === selectedDevice)
                      .map(device => (
                        <div key={device.id} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">İsim:</span>
                            <span>{device.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Tür:</span>
                            <span>{device.type === 'flash' ? 'Flash Bellek' : 'Sabit Disk'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Sistem Yolu:</span>
                            <span className="font-mono text-sm">{device.path}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Toplam Alan:</span>
                            <span>{formatSize(device.totalSpace)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Boş Alan:</span>
                            <span>{formatSize(device.freeSpace)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Kullanılan Alan:</span>
                            <span>{formatSize(device.totalSpace - device.freeSpace)}</span>
                          </div>
                          
                          {/* İlerleme Çubuğu */}
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div 
                              className="bg-primary h-2.5 rounded-full" 
                              style={{ width: `${((device.totalSpace - device.freeSpace) / device.totalSpace) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {Math.round(((device.totalSpace - device.freeSpace) / device.totalSpace) * 100)}% kullanılıyor
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Ağ Ayarları */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Uzak Erişim Ayarları
              </CardTitle>
              <CardDescription>
                Huloud'a internet üzerinden erişim için gereken ayarları yapılandırın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="remoteAccess">Uzaktan Erişimi Etkinleştir</Label>
                  <p className="text-sm text-muted-foreground">
                    Bu seçenek, Huloud'a internet üzerinden erişim sağlanmasını etkinleştirir.
                  </p>
                </div>
                <Switch
                  id="remoteAccess"
                  checked={networkSettings.enableRemoteAccess}
                  onCheckedChange={(checked) => 
                    handleNetworkSettingsChange('enableRemoteAccess', checked)
                  }
                  disabled={isLoading}
                />
              </div>
              
              {networkSettings.enableRemoteAccess && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="port">Port Numarası</Label>
                    <Input
                      id="port"
                      type="number"
                      value={networkSettings.port}
                      onChange={(e) => 
                        handleNetworkSettingsChange('port', parseInt(e.target.value))
                      }
                      min={1024}
                      max={65535}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Güvenlik duvarında bu portu açmanız gerekebilir.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ssl">SSL Güvenliği</Label>
                      <p className="text-sm text-muted-foreground">
                        HTTPS protokolünü kullanarak iletişimi şifreler.
                      </p>
                    </div>
                    <Switch
                      id="ssl"
                      checked={networkSettings.useSSL}
                      onCheckedChange={(checked) => 
                        handleNetworkSettingsChange('useSSL', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="domain">Domain Adı (İsteğe Bağlı)</Label>
                    <Input
                      id="domain"
                      value={networkSettings.domain || ''}
                      onChange={(e) => 
                        handleNetworkSettingsChange('domain', e.target.value)
                      }
                      placeholder="örnek: huloud.benimalan.com"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Özel bir domain adına sahipseniz girebilirsiniz.
                    </p>
                  </div>
                
                  <div className="p-4 bg-primary/10 rounded-lg mt-6">
                    <h3 className="font-medium mb-2">Uzaktan Erişim Bilgileri</h3>
                    <p className="text-sm mb-4">
                      Aşağıdaki URL'i kullanarak diğer cihazlardan Huloud'a erişebilirsiniz:
                    </p>
                    <div className="bg-background p-3 rounded border font-mono text-sm break-all">
                      {networkSettings.useSSL ? 'https://' : 'http://'}
                      {networkSettings.domain 
                        ? networkSettings.domain 
                        : 'IP_ADRESINIZ'}
                      {networkSettings.port !== 80 && networkSettings.port !== 443 
                        ? `:${networkSettings.port}` 
                        : ''}
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground">
                      Not: IP adresiniz dinamikse, sabit bir adres için DDNS servisleri kullanabilirsiniz.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={saveNetworkSettings}
                disabled={isLoading}
              >
                Ayarları Kaydet
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Güvenlik Önerileri
              </CardTitle>
              <CardDescription>
                Sisteminizi güvenli tutmak için aşağıdaki önerileri dikkate alın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc pl-5">
                <li>Güçlü şifreler kullanın ve periyodik olarak değiştirin.</li>
                <li>Yönlendiricinizde yalnızca ihtiyaç duyduğunuz portları açın.</li>
                <li>Mümkünse, SSL sertifikası kullanarak bağlantıları şifreleyin.</li>
                <li>Kullanmadığınızda uzaktan erişimi devre dışı bırakın.</li>
                <li>İşletim sisteminizi ve uygulamalarınızı güncel tutun.</li>
                <li>Önemli verilerin düzenli yedeklerini alın.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sistem Dosyaları */}
        <TabsContent value="system-files" className="space-y-6">
          <SystemFilesExplorer />
        </TabsContent>
      </Tabs>
    </div>
  );
}