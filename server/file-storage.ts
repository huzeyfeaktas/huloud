import fs from 'fs';
import path from 'path';

// Dosya sistemi işlemleri için yardımcı sınıf
export class FileSystemStorage {
  private storagePath: string;

  constructor(storagePath: string = path.join(process.cwd(), 'storage', 'data')) {
    this.storagePath = storagePath;
    this.ensureDirectoryExists(this.storagePath);
  }
  
  // Dosyanın varlığını kontrol eder
  async fileExists(filePath: string, userId: number): Promise<boolean> {
    try {
      // Kullanıcının depolama yolu
      const userStoragePath = this.getUserStoragePath(userId);
      const absolutePath = path.join(userStoragePath, filePath);
      
      const stat = await fs.promises.stat(absolutePath);
      return stat.isFile();
    } catch (err) {
      return false;
    }
  }
  
  // Kullanıcının depolama yolunu oluştur
  private getUserStoragePath(userId: number): string {
    const userPath = path.join(this.storagePath, 'users', userId.toString());
    this.ensureDirectoryExists(userPath);
    return userPath;
  }

  // Dizin var mı kontrol et, yoksa oluştur
  private ensureDirectoryExists(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  // JSON veriyi dosyaya kaydet
  async saveJSON(fileName: string, data: any): Promise<void> {
    const filePath = path.join(this.storagePath, `${fileName}.json`);
    
    try {
      await fs.promises.writeFile(
        filePath, 
        JSON.stringify(data, null, 2), 
        'utf8'
      );
    } catch (error) {
      console.error(`Dosya kaydedilirken hata: ${filePath}`, error);
      throw error;
    }
  }

  // JSON veriyi dosyadan oku
  async loadJSON<T>(fileName: string, defaultValue: T): Promise<T> {
    const filePath = path.join(this.storagePath, `${fileName}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data) as T;
      }
      return defaultValue;
    } catch (error) {
      console.error(`Dosya okunurken hata: ${filePath}`, error);
      return defaultValue;
    }
  }

  // Dosyayı sil
  async deleteFile(fileName: string): Promise<boolean> {
    const filePath = path.join(this.storagePath, `${fileName}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Dosya silinirken hata: ${filePath}`, error);
      return false;
    }
  }
}

export const fileSystemStorage = new FileSystemStorage();