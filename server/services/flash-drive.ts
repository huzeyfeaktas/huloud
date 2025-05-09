import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Doğrudan bilgisayara bağlanan flash bellek servisi
 * Bu servis, bilgisayara takılan USB flash belleğe erişim sağlar
 */
export class FlashDriveService {
  private storagePath: string;
  private connected: boolean = false;

  // Bu metod artık ihtiyaç duyulmadığı için kaldırıldı

  constructor(config: {
    storagePath?: string;
  } = {}) {
    // Windows uyumlu depolama yolu
    try {
      // Kullanıcı özel bir yol belirttiyse onu kullan
      if (config.storagePath) {
        this.storagePath = config.storagePath;
      } else {
        // Platformdan bağımsız yol kullan - file-storage.ts ile aynı konumu kullan!
        const defaultPath = path.join(process.cwd(), 'storage', 'data');
        
        try {
          // Dizin yoksa oluştur
          if (!fs.existsSync(defaultPath)) {
            fs.mkdirSync(defaultPath, { recursive: true });
            console.log("Depolama dizini oluşturuldu:", defaultPath);
          }
          this.storagePath = defaultPath;
        } catch (dirError) {
          // Dizin oluşturulamazsa temp klasörü kullan
          this.storagePath = path.join(os.tmpdir(), 'huloud-storage');
          console.log("Alternatif depolama yolu kullanılıyor:", this.storagePath);
        }
      }
    } catch (error) {
      // Hata durumunda, tmp dizinini kullan
      this.storagePath = path.join(os.tmpdir(), 'huloud-storage');
      console.log("Hata nedeniyle alternatif depolama yolu kullanılıyor:", this.storagePath);
    }
  }

  /**
   * Depolama klasörünü hazırla ve bağlantıyı kur
   */
  async connect(): Promise<boolean> {
    try {
      console.log('Depolama alanı hazırlanıyor...');
      
      // Dosya sistemini kontrol et ve depolama klasörünü oluştur
      if (!fs.existsSync(this.storagePath)) {
        console.log(`Depolama klasörü (${this.storagePath}) bulunamadı, oluşturuluyor...`);
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      // Kullanıcı klasörlerini oluştur (her kullanıcı için ayrı klasör)
      const usersPath = path.join(this.storagePath, 'users');
      if (!fs.existsSync(usersPath)) {
        fs.mkdirSync(usersPath, { recursive: true });
      }

      this.connected = true;
      console.log('Depolama alanı başarıyla hazırlandı ve kullanıma hazır.');
      return true;
    } catch (error) {
      console.error('Depolama alanı hazırlanırken hata:', error);
      return false;
    }
  }

  /**
   * Kullanıcı için depolama klasörü yolu
   */
  private getUserStoragePath(userId: number): string {
    return path.join(this.storagePath, 'users', userId.toString());
  }

  /**
   * Belirtilen kullanıcı için dosyaları listele
   */
  async listFiles(directoryPath: string = '/', userId: number): Promise<string[]> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Kullanıcı klasörü yoksa oluştur
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }

    const targetPath = path.join(userPath, directoryPath);
    
    // Belirtilen klasör yoksa ve kök klasör değilse, hata ver
    if (!fs.existsSync(targetPath) && directoryPath !== '/') {
      throw new Error(`Klasör bulunamadı: ${directoryPath}`);
    }
    
    // Klasör yoksa ve kök klasörse, kullanıcı klasörünü kullan
    const pathToList = fs.existsSync(targetPath) ? targetPath : userPath;
    
    try {
      const files = await fs.promises.readdir(pathToList);
      return files;
    } catch (error) {
      console.error(`Dosya listesi alınırken hata: ${directoryPath}`, error);
      throw error;
    }
  }

  /**
   * Dosya oku
   */
  async readFile(filePath: string, userId: number): Promise<Buffer> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Dosya yolunu normalize et (başındaki / işaretini kaldır)
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Windows uyumlu hale getir (path.normalize kullanımı)
    const pathToNormalize = path.normalize(normalizedPath).replace(/\\/g, '/');
    
    // Final dosya yolunu oluştur
    const targetPath = path.join(userPath, pathToNormalize);
    
    console.log(`Dosya okunuyor: ${targetPath}`);
    
    try {
      // Dosya var mı kontrol et
      if (!fs.existsSync(targetPath)) {
        console.error(`Dosya bulunamadı: ${targetPath}`);
        throw new Error(`Dosya bulunamadı: ${filePath}`);
      }
      
      // Dosya mı klasör mü kontrol et
      const stats = await fs.promises.stat(targetPath);
      if (stats.isDirectory()) {
        console.error(`Hedef bir klasör: ${targetPath}`);
        throw new Error(`Bu bir dosya değil, klasör: ${filePath}`);
      }
      
      return await fs.promises.readFile(targetPath);
    } catch (error) {
      console.error(`Dosya okunurken hata: ${filePath}, hedef: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Dosya yaz
   */
  async writeFile(filePath: string, data: Buffer | string, userId: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Dosya yolunu normalize et (başındaki / işaretini kaldır)
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Windows uyumlu hale getir (path.normalize kullanımı)
    const pathToNormalize = path.normalize(normalizedPath).replace(/\\/g, '/');
    
    // Final dosya yolunu oluştur
    const targetPath = path.join(userPath, pathToNormalize);
    const targetDir = path.dirname(targetPath);

    console.log(`Dosya yazılıyor: ${targetPath}`);
    
    // Klasörün var olduğundan emin ol
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    try {
      await fs.promises.writeFile(targetPath, data);
      console.log(`Dosya başarıyla yazıldı: ${targetPath}`);
    } catch (error) {
      console.error(`Dosya yazılırken hata: ${filePath}, hedef: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Dosya sil
   */
  async deleteFile(filePath: string, userId: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Dosya yolunu normalize et (başındaki / işaretini kaldır)
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Windows uyumlu hale getir (path.normalize kullanımı)
    const pathToNormalize = path.normalize(normalizedPath).replace(/\\/g, '/');
    
    // Final dosya yolunu oluştur
    const targetPath = path.join(userPath, pathToNormalize);
    
    console.log(`Dosya siliniyor: ${targetPath}`);
    
    try {
      // Dosya var mı kontrol et
      if (!fs.existsSync(targetPath)) {
        console.error(`Silinecek dosya bulunamadı: ${targetPath}`);
        throw new Error(`Dosya bulunamadı: ${filePath}`);
      }
      
      await fs.promises.unlink(targetPath);
      console.log(`Dosya başarıyla silindi: ${targetPath}`);
    } catch (error) {
      console.error(`Dosya silinirken hata: ${filePath}, hedef: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Klasör oluştur
   */
  async createDirectory(directoryPath: string, userId: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Dizin yolunu normalize et (başındaki / işaretini kaldır)
    const normalizedPath = directoryPath.startsWith('/') ? directoryPath.substring(1) : directoryPath;
    
    // Windows uyumlu hale getir (path.normalize kullanımı)
    const pathToNormalize = path.normalize(normalizedPath).replace(/\\/g, '/');
    
    // Final klasör yolunu oluştur
    const targetPath = path.join(userPath, pathToNormalize);
    
    console.log(`Klasör oluşturuluyor: ${targetPath}`);
    
    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
      console.log(`Klasör başarıyla oluşturuldu: ${targetPath}`);
    } catch (error) {
      console.error(`Klasör oluşturulurken hata: ${directoryPath}, hedef: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Klasör sil
   */
  async deleteDirectory(directoryPath: string, userId: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    const targetPath = path.join(userPath, directoryPath);
    
    try {
      // Klasörü ve içindeki tüm dosyaları sil
      await this.recursiveDelete(targetPath);
    } catch (error) {
      console.error(`Klasör silinirken hata: ${directoryPath}`, error);
      throw error;
    }
  }

  /**
   * Özyinelemeli klasör silme
   */
  private async recursiveDelete(itemPath: string): Promise<void> {
    const stats = await fs.promises.stat(itemPath);
    
    if (stats.isDirectory()) {
      // Klasör içindeki tüm dosyaları listele
      const files = await fs.promises.readdir(itemPath);
      
      // Her dosya için özyinelemeli silme işlemi
      for (const file of files) {
        await this.recursiveDelete(path.join(itemPath, file));
      }
      
      // Boş klasörü sil
      await fs.promises.rmdir(itemPath);
    } else {
      // Dosyayı sil
      await fs.promises.unlink(itemPath);
    }
  }

  /**
   * Dosya veya klasör bilgilerini al
   */
  async getFileInfo(filePath: string, userId: number): Promise<fs.Stats> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Dosya yolunu normalize et (başındaki / işaretini kaldır)
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    
    // Windows uyumlu hale getir (path.normalize kullanımı)
    const pathToNormalize = path.normalize(normalizedPath).replace(/\\/g, '/');
    
    // Final dosya yolunu oluştur
    const targetPath = path.join(userPath, pathToNormalize);
    
    console.log(`Dosya bilgisi alınıyor: ${targetPath}`);
    
    try {
      // Dosya var mı kontrol et
      if (!fs.existsSync(targetPath)) {
        console.error(`Bilgisi alınacak dosya bulunamadı: ${targetPath}`);
        throw new Error(`Dosya bulunamadı: ${filePath}`);
      }
      
      return await fs.promises.stat(targetPath);
    } catch (error) {
      console.error(`Dosya bilgisi alınırken hata: ${filePath}, hedef: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * Kullanıcı deposunun toplam ve kullanılan alanını al
   */
  async getDiskSpace(userId: number): Promise<{ total: number; used: number; free: number }> {
    if (!this.connected) {
      await this.connect();
    }

    const userPath = this.getUserStoragePath(userId);
    
    // Kullanıcı klasörü yoksa oluştur
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }

    try {
      // Kullanıcı klasöründeki tüm dosyaların boyutunu hesapla
      const calculateSize = async (dirPath: string): Promise<number> => {
        let size = 0;
        
        try {
          const entries = await fs.promises.readdir(dirPath);
          
          for (const entry of entries) {
            const entryPath = path.join(dirPath, entry);
            
            try {
              const stats = await fs.promises.stat(entryPath);
              
              if (stats.isDirectory()) {
                // Alt klasörlerin boyutunu hesapla
                size += await calculateSize(entryPath);
              } else {
                // Dosya boyutunu ekle
                size += stats.size;
              }
            } catch (statError) {
              console.warn(`Dosya/klasör bilgileri alınamadı: ${entryPath}`, statError);
              // Hata durumunda bu dosyayı/klasörü atla ve diğerlerine devam et
            }
          }
        } catch (readError) {
          console.warn(`Klasör içeriği okunamadı: ${dirPath}`, readError);
          // Klasör okunamazsa 0 döndür
          return 0;
        }
        
        return size;
      };
      
      // Kullanıcının kullandığı alanı hesapla
      console.log(`${userId} ID'li kullanıcı için kullanılan alanı hesaplama başlıyor...`);
      console.time('calculateDiskSpace');
      const used = await calculateSize(userPath);
      console.timeEnd('calculateDiskSpace');
      console.log(`Kullanıcı ${userId}, kullanılan alan: ${(used / (1024*1024)).toFixed(2)} MB`);
      
      // Sistem diskinin toplam alanını al
      // Bu sadece bir tahmin - gerçek bir uygulamada kullanıcı kotası belirlenir
      const total = 32 * 1024 * 1024 * 1024; // 32GB kota
      const free = total - used;
      
      return { total, used, free };
    } catch (error) {
      console.error('Disk alanı bilgisi alınamadı', error);
      // Varsayılan değerleri döndür
      return { total: 32 * 1024 * 1024 * 1024, used: 0, free: 32 * 1024 * 1024 * 1024 };
    }
  }

  /**
   * Bağlantıyı kapat (bu durumda bir şey yapmaya gerek yok)
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Depolama bağlantısı kapatıldı.');
  }
}

// Servis örneği oluşturma
export const storageService = new FlashDriveService();