import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileSchema, FileType } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { setupAuth } from "./auth";
import { storageService } from "./services/flash-drive";
import * as config from "./config";

// Configure multer for file uploads - without size limit
const upload = multer({
  storage: multer.memoryStorage(),
  // Dosya boyutu sınırı kaldırıldı
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Kullanıcı kimlik doğrulama sistemi kurulumu
  setupAuth(app);
  
  // Uygulama başlangıcında depolama servisi bağlantısını kur
  await storageService.connect();

  // Kullanıcının depolama istatistiklerini getir
  app.get("/api/storage", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Seçili depolama aygıtını al
      const selectedDeviceId = config.getSelectedStorageDevice();
      
      // Önce C sürücüsü verilerini almaya çalış (ayar menüsündeki gibi)
      try {
        // Burada C sürücüsü bilgilerini al - aynı yönetim panelindeki gösterilen veriler
        const devices = [
          {
            id: "disk-1",
            name: "Sistem Diski (C:)",
            path: "/mnt/c",
            type: "disk",
            totalSpace: 500 * 1024 * 1024 * 1024, // 500 GB
            freeSpace: 350 * 1024 * 1024 * 1024, // 350 GB
          },
          {
            id: "flash-1",
            name: "USB Flash Bellek",
            path: "/mnt/usb",
            type: "flash",
            totalSpace: 32 * 1024 * 1024 * 1024, // 32 GB
            freeSpace: 28 * 1024 * 1024 * 1024, // 28 GB
          }
        ];
        
        // Seçili cihazı bul
        const selectedDevice = devices.find(device => device.id === selectedDeviceId) || devices[0];
        
        // Kullanıcı dizinindeki gerçek kullanılan alanı hesapla
        const diskSpace = await storageService.getDiskSpace(req.user.id);
        
        // Aygıta göre değerleri ayarla
        const total = selectedDevice.totalSpace;
        const systemFreeSpace = selectedDevice.freeSpace;
        
        // Gerçek kullanılan alanı al
        const usedValue = diskSpace.used;
        
        const stats = {
          used: usedValue,
          total: total,
          free: systemFreeSpace,
          usedPercentage: (usedValue / total) * 100,
          deviceName: selectedDevice.name
        };
        
        console.log(`Depolama istatistikleri hesaplandı: Kullanılan: ${(usedValue / (1024*1024)).toFixed(2)} MB, Toplam: ${(total / (1024*1024*1024)).toFixed(2)} GB`);
        
        return res.json(stats);
      } catch (diskSpaceError) {
        console.error("Disk alanı hesaplanırken hata:", diskSpaceError);
        
        // Hata durumunda varsayılan değerleri kullan
        const stats = await storage.getStorageStats(req.user.id);
        return res.json(stats);
      }
    } catch (error) {
      console.error("Depolama istatistikleri alınırken hata:", error);
      res.status(500).json({ message: "Depolama istatistikleri alınamadı" });
    }
  });

  // Get files by parent ID or root if not specified
  app.get("/api/files", async (req: Request, res: Response) => {
    try {
      // Kullanıcı giriş yapmamış ise 401 dön
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : null;
      
      // Her kullanıcı sadece kendi dosyalarını görebilir
      console.log(`Dosyalar isteniyor: parentId=${parentId}, userId=${req.user.id}`);
      const files = await storage.getFiles(parentId, req.user.id);
      console.log(`Bulunan dosya sayısı: ${files.length}`);
      
      res.json(files);
    } catch (error) {
      console.error("Error getting files:", error);
      res.status(500).json({ message: "Dosyalar alınamadı" });
    }
  });

  // Get a single file by ID
  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const id = parseInt(req.params.id);
      const file = await storage.getFileById(id);
      
      if (!file) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }
      
      // Dosya sahibini kontrol et
      if (file.userId !== undefined && file.userId !== req.user.id && !file.isPublic) {
        return res.status(403).json({ message: "Bu dosyaya erişim izniniz yok" });
      }
      
      res.json(file);
    } catch (error) {
      console.error("Error getting file:", error);
      res.status(500).json({ message: "Dosya alınamadı" });
    }
  });

  // Get recent files
  app.get("/api/files/recent", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const files = await storage.getRecentFiles(limit, req.user.id);
      res.json(files);
    } catch (error) {
      console.error("Error getting recent files:", error);
      res.status(500).json({ message: "Son dosyalar alınamadı" });
    }
  });

  // Search files
  app.get("/api/files/search", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Arama sorgusu gerekli" });
      }
      
      const files = await storage.searchFiles(query, req.user.id);
      res.json(files);
    } catch (error) {
      console.error("Error searching files:", error);
      res.status(500).json({ message: "Dosya araması yapılamadı" });
    }
  });

  // Get files by type
  app.get("/api/files/type/:type", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const type = req.params.type as (typeof FileType)[keyof typeof FileType];
      if (!Object.values(FileType).includes(type)) {
        return res.status(400).json({ message: "Geçersiz dosya türü" });
      }
      
      const files = await storage.getFilesByType(type, req.user.id);
      res.json(files);
    } catch (error) {
      console.error("Error getting files by type:", error);
      res.status(500).json({ message: "Dosya türüne göre dosyalar alınamadı" });
    }
  });

  // Get favorite files
  app.get("/api/files/favorites", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const files = await storage.getFavorites(req.user.id);
      res.json(files);
    } catch (error) {
      console.error("Error getting favorite files:", error);
      res.status(500).json({ message: "Favori dosyalar alınamadı" });
    }
  });

  // Klasör oluştur
  app.post("/api/folders", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const validationResult = insertFileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Geçersiz klasör verisi", 
          errors: validationResult.error.errors 
        });
      }

      const folderData = validationResult.data;
      if (!folderData.isDirectory) {
        return res.status(400).json({ message: "Bu endpoint ile sadece klasör oluşturulabilir" });
      }
      
      // Kullanıcı bilgisini ekle
      folderData.userId = req.user.id;

      // Yolu oluştur
      if (folderData.parentId) {
        const parent = await storage.getFileById(folderData.parentId);
        if (!parent) {
          return res.status(404).json({ message: "Üst klasör bulunamadı" });
        }
        
        // Üst klasörün sahibini kontrol et
        if (parent.userId !== undefined && parent.userId !== req.user.id) {
          return res.status(403).json({ message: "Bu klasöre erişim izniniz yok" });
        }
        
        folderData.path = `${parent.path}/${folderData.name}`;
      } else {
        folderData.path = `/${folderData.name}`;
      }

      // Önce fiziksel klasörü oluştur
      await storageService.createDirectory(folderData.path, req.user.id);
      
      // Sonra veritabanı kaydını oluştur
      const folder = await storage.createFile(folderData);
      res.status(201).json(folder);
    } catch (error) {
      console.error("Klasör oluşturulurken hata:", error);
      res.status(500).json({ message: "Klasör oluşturulamadı" });
    }
  });

  // Dosya yükleme
  app.post("/api/files/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const parentId = req.body.parentId ? parseInt(req.body.parentId) : null;
      
      // Determine file type
      let type = FileType.OTHER;
      const mimeType = req.file.mimetype;
      if (mimeType.startsWith("image/")) {
        type = FileType.IMAGE;
      } else if (mimeType.startsWith("video/")) {
        type = FileType.VIDEO;
      } else if (mimeType.startsWith("audio/")) {
        type = FileType.AUDIO;
      } else if (
        mimeType === "application/pdf" ||
        mimeType.includes("document") ||
        mimeType.includes("spreadsheet") ||
        mimeType.includes("presentation")
      ) {
        type = FileType.DOCUMENT;
      } else if (
        mimeType.includes("zip") ||
        mimeType.includes("rar") ||
        mimeType.includes("tar") ||
        mimeType.includes("compress")
      ) {
        type = FileType.ARCHIVE;
      }

      // Generate path
      let filePath = `/${req.file.originalname}`;
      if (parentId) {
        const parent = await storage.getFileById(parentId);
        if (!parent) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        // Üst klasörün sahibini kontrol et
        if (parent.userId !== undefined && parent.userId !== req.user.id) {
          return res.status(403).json({ message: "Bu klasöre erişim izniniz yok" });
        }
        
        filePath = `${parent.path}/${req.file.originalname}`;
      }

      // Dosyayı fiziksel olarak kaydetme
      try {
        await storageService.writeFile(
          filePath, 
          req.file.buffer, 
          req.user.id
        );
      } catch (err) {
        console.error("Dosya yazma hatası:", err);
        return res.status(500).json({ message: "Dosya fiziksel olarak kaydedilemedi" });
      }

      const fileData = {
        name: req.file.originalname,
        path: filePath,
        type,
        size: req.file.size,
        isDirectory: false,
        parentId,
        isFavorite: false,
        userId: req.user.id
      };

      const file = await storage.createFile(fileData);
      res.status(201).json(file);
    } catch (error) {
      console.error("Dosya yükleme hatası:", error);
      res.status(500).json({ message: "Dosya yüklenemedi" });
    }
  });

  // Update a file (rename or move)
  app.patch("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const id = parseInt(req.params.id);
      const file = await storage.getFileById(id);
      
      if (!file) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }
      
      // Dosya sahibini kontrol et
      if (file.userId !== undefined && file.userId !== req.user.id) {
        return res.status(403).json({ message: "Bu dosyayı düzenleme yetkiniz yok" });
      }

      // Validate update data
      const updateSchema = insertFileSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Geçersiz güncelleme verisi", 
          errors: validationResult.error.errors 
        });
      }

      const updates = validationResult.data;
      
      // If name is being updated, update the path as well
      if (updates.name) {
        const dirPath = path.dirname(file.path);
        updates.path = `${dirPath}/${updates.name}`;
      }

      const updatedFile = await storage.updateFile(id, updates, req.user.id);
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: "Dosya güncellenemedi" });
    }
  });

  // Toggle favorite status
  app.patch("/api/files/:id/favorite", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const id = parseInt(req.params.id);
      const file = await storage.getFileById(id);
      
      if (!file) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }
      
      // Dosya sahibini kontrol et
      if (file.userId !== undefined && file.userId !== req.user.id) {
        return res.status(403).json({ message: "Bu dosyayı favorilere eklemek/çıkarmak için yetkiniz yok" });
      }

      // Debug log ekle
      console.log(`Favori durumu değiştiriliyor - Dosya ID: ${id}, Önceki durum: ${file.isFavorite}, Yeni durum: ${!file.isFavorite}`);
      
      const updatedFile = await storage.updateFile(id, {
        isFavorite: !file.isFavorite
      }, req.user.id);
      
      res.json(updatedFile);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Favori durumu değiştirilemedi" });
    }
  });

  // Delete a file or folder
  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      const id = parseInt(req.params.id);
      const file = await storage.getFileById(id);
      
      if (!file) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }
      
      // Dosya sahibini kontrol et
      if (file.userId !== undefined && file.userId !== req.user.id) {
        return res.status(403).json({ message: "Bu dosyayı silme yetkiniz yok" });
      }

      const success = await storage.deleteFile(id, req.user.id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Dosya silinemedi" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Dosya silinemedi" });
    }
  });

  // Dosya indirme ve görüntüleme
  app.get("/api/files/:id/download", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }

      const id = parseInt(req.params.id);
      const file = await storage.getFileById(id);
      if (!file) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }

      if (file.isDirectory) {
        return res.status(400).json({ message: "Klasörler indirilemez" });
      }
      
      // Dosya sahibini kontrol et (veya paylaşılan dosya mı)
      if (file.userId !== undefined && file.userId !== req.user.id && !file.isPublic) {
        return res.status(403).json({ message: "Bu dosyaya erişim izniniz yok" });
      }

      try {
        // Dosyayı oku - önbellek kontrollerini bypass etmek için zaman damgasını kontrol et ve yoksay
        const fileBuffer = await storageService.readFile(file.path, req.user.id);
        
        // Preview modunu kontrol et (URL'de ?preview=true varsa)
        const isPreview = req.query.preview === 'true';
        
        // İstemcide önbellek sorunlarını gidermek için ETag oluştur
        // Dosya ID'si, değiştirilme tarihi ve boyutundan bir hash oluşturalım
        const etag = `W/"${file.id}-${file.size}"`;
        res.setHeader('ETag', etag);
        
        // İstemcinin ETag'ı varsa ve bizimkiyle eşleşiyorsa 304 Not Modified dön
        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return;
        }
        
        // Konsola ek hata ayıklama bilgisi ekle
        console.log(`Dosya okundu - ID: ${file.id}, Yol: ${file.path}, Boyut: ${fileBuffer.length}, Önizleme: ${isPreview}, Kullanıcı: ${req.user.id}`);
        
        // MIME türünü dosya adından tahmin et
        let contentType = 'application/octet-stream';
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (extension) {
          // Yaygın dosya türleri için content-type belirle
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
          };
          
          if (mimeTypes[extension]) {
            contentType = mimeTypes[extension];
          }
        }
        
        // Header'ları ayarla - ön izleme ya da indirme moduna göre
        if (isPreview) {
          // Ön izleme için tarayıcıda göster
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileBuffer.length);
          
          // CORS ayarlarını ekle
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          
          // Görüntüler için önbellekleme izin ver (performans için)
          const isImage = contentType.startsWith('image/');
          const isMedia = contentType.startsWith('video/') || contentType.startsWith('audio/');
          
          if (isImage) {
            // Resimleri önbellekleme - 1 gün
            res.setHeader('Cache-Control', 'public, max-age=86400');
            // X-Content-Type-Options ekle (güvenlik için)
            res.setHeader('X-Content-Type-Options', 'nosniff');
          } else if (isMedia) {
            // Video ve ses için akış başlıkları ekle
            res.setHeader('Accept-Ranges', 'bytes');
            // Tarayıcının video/ses kontrolleri kullanmasına izin ver
            res.setHeader('X-Content-Type-Options', 'nosniff');
            // Video için önbelleğe izin ver (ileri geri sarma için)
            res.setHeader('Cache-Control', 'public, max-age=3600');
          } else {
            // Diğer dosya türleri için önbelleği devre dışı bırak
            res.setHeader('Cache-Control', 'no-store, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
          
        } else {
          // İndirme için indirme başlığını ayarla
          res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileBuffer.length);
          // Önbellek kontrolünü devre dışı bırak
          res.setHeader('Cache-Control', 'no-store, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
        
        // Dosyayı gönder
        res.send(fileBuffer);
      } catch (err) {
        console.error("Dosya okuma hatası:", err);
        return res.status(500).json({ message: "Dosya okunamadı" });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Dosya indirilemedi" });
    }
  });
  
  // Yönetici API'leri
  
  // Sistem dosyalarına erişim (sadece yönetici hesabı için)
  app.get("/api/admin/system-files", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için (huzeyfeakt)
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      // İstekte dizin belirtilip belirtilmediğini kontrol et
      const directory = req.query.directory as string || '/';
      
      // İşletim sistemini kontrol et
      const isWindows = process.platform === "win32";
      
      // Windows'ta C:\ gibi ana dizinlere erişim için özel durum
      if (isWindows && directory === '/') {
        const drives = [];
        // Windows'ta sürücü harflerini listele (C, D, E, ...)
        for (let i = 67; i <= 90; i++) {
          const driveLetter = String.fromCharCode(i);
          const drivePath = `${driveLetter}:\\`;
          
          try {
            if (fs.existsSync(drivePath)) {
              drives.push({
                name: `${driveLetter}: Sürücüsü`,
                path: drivePath,
                isDirectory: true,
                size: 0,
                type: "folder",
                modifiedAt: new Date()
              });
            }
          } catch (error) {
            console.error(`Sürücü kontrol hatası: ${drivePath}`, error);
          }
        }
        
        return res.json({
          currentPath: '/',
          items: drives
        });
      }
      
      // İşletim sistemine göre yolu düzenle
      let systemPath = directory;
      if (isWindows) {
        // Windows yolunu düzelt (örn: '/C:/Users' -> 'C:\\Users')
        if (systemPath.startsWith('/')) {
          systemPath = systemPath.substring(1);
        }
        systemPath = systemPath.replace(/\//g, '\\');
      }
      
      // Dizin içeriğini oku
      const items = await fs.promises.readdir(systemPath, { withFileTypes: true });
      
      // Dosya ve klasörleri formatlayarak döndür
      const formattedItems = await Promise.all(
        items.map(async (item) => {
          const fullPath = path.join(systemPath, item.name);
          let stats;
          let size = 0;
          let type = "other";
          
          try {
            stats = await fs.promises.stat(fullPath);
            size = stats.size;
            
            // Dosya türünü belirle
            if (!item.isDirectory()) {
              const extension = path.extname(item.name).toLowerCase().substring(1);
              if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
                type = "image";
              } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) {
                type = "video";
              } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
                type = "audio";
              } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv'].includes(extension)) {
                type = "document";
              } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
                type = "archive";
              }
            }
          } catch (err) {
            console.error(`Dosya bilgisi okuma hatası: ${fullPath}`, err);
          }
          
          return {
            name: item.name,
            path: isWindows 
              ? `/${fullPath.replace(/\\/g, '/')}` // Windows yolunu URL yolu formatına dönüştür
              : fullPath,
            isDirectory: item.isDirectory(),
            size: size,
            type: item.isDirectory() ? "folder" : type,
            modifiedAt: stats ? stats.mtime : new Date()
          };
        })
      );
      
      // Önce klasörleri, sonra dosyaları göster ve alfabetik sırala
      const sortedItems = formattedItems.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });
      
      res.json({
        currentPath: directory,
        items: sortedItems
      });
    } catch (error) {
      console.error("Sistem dosyaları listelenirken hata:", error);
      res.status(500).json({ 
        message: "Sistem dosyaları listelenemedi", 
        error: error.message 
      });
    }
  });
  
  // Sistem dosyasını indirme (sadece yönetici hesabı için)
  app.get("/api/admin/system-files/download", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için (huzeyfeakt)
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ message: "Dosya yolu belirtilmedi" });
      }
      
      // İşletim sistemine göre yolu düzenle
      let systemPath = filePath;
      if (process.platform === "win32") {
        // Windows yolunu düzelt (örn: '/C:/Users/file.txt' -> 'C:\\Users\\file.txt')
        if (systemPath.startsWith('/')) {
          systemPath = systemPath.substring(1);
        }
        systemPath = systemPath.replace(/\//g, '\\');
      }
      
      // Dosya var mı kontrol et
      if (!fs.existsSync(systemPath)) {
        return res.status(404).json({ message: "Dosya bulunamadı" });
      }
      
      // Klasör mü kontrol et
      const stats = await fs.promises.stat(systemPath);
      if (stats.isDirectory()) {
        return res.status(400).json({ message: "Bu bir klasör, dosya değil" });
      }
      
      // Önizleme modunu kontrol et (URL'de ?preview=true varsa)
      const isPreview = req.query.preview === 'true';
      
      // Dosya adını al
      const fileName = path.basename(systemPath);
      
      // MIME türünü dosya adından tahmin et
      let contentType = 'application/octet-stream';
      const extension = path.extname(fileName).toLowerCase().substring(1);
      
      if (extension) {
        // Yaygın dosya türleri için content-type belirle
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'pdf': 'application/pdf',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'txt': 'text/plain',
          'html': 'text/html',
          'css': 'text/css',
          'js': 'text/javascript',
        };
        
        if (mimeTypes[extension]) {
          contentType = mimeTypes[extension];
        }
      }
      
      // Header'ları ayarla - ön izleme ya da indirme moduna göre
      if (isPreview) {
        // Ön izleme için tarayıcıda göster
        res.setHeader('Content-Type', contentType);
        
        // Video ve ses dosyaları için parçalı akış (range) desteği ekle
        const isMedia = contentType.startsWith('video/') || contentType.startsWith('audio/');
        if (isMedia) {
          // Video ve ses için akış başlıkları ekle
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=3600');
        } else {
          // Diğer dosya türleri için önbelleği tamamen devre dışı bırak
          // Her istek için yeni içerik yükle (önbellek problemini çözmek için)
          const timestamp = Date.now();
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Last-Modified', new Date(timestamp).toUTCString());
        }
      } else {
        // İndirme için indirme başlığını ayarla
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      
      // Dosyayı gönder
      fs.createReadStream(systemPath).pipe(res);
    } catch (error) {
      console.error("Sistem dosyası indirilirken hata:", error);
      res.status(500).json({ message: "Dosya indirilemedi", error: error.message });
    }
  });
  
  // Kullanılabilir depolama aygıtlarını listele
  app.get("/api/admin/storage/devices", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      // Burada gerçek sistemden disk listesi alınabilir, şimdilik örnek veriler
      const devices = [
        {
          id: "disk-1",
          name: "Sistem Diski (C:)",
          path: "/mnt/c",
          type: "disk",
          totalSpace: 500 * 1024 * 1024 * 1024, // 500 GB
          freeSpace: 350 * 1024 * 1024 * 1024, // 350 GB
        },
        {
          id: "flash-1",
          name: "USB Flash Bellek",
          path: "/mnt/usb",
          type: "flash",
          totalSpace: 32 * 1024 * 1024 * 1024, // 32 GB
          freeSpace: 28 * 1024 * 1024 * 1024, // 28 GB
        }
      ];
      
      // Seçili aygıt için işaret ekle
      const selectedDeviceId = config.getSelectedStorageDevice();
      const devicesWithSelected = devices.map(device => ({
        ...device,
        isSelected: device.id === selectedDeviceId
      }));
      
      res.json(devicesWithSelected);
    } catch (error) {
      console.error("Depolama aygıtları listelenirken hata:", error);
      res.status(500).json({ message: "Depolama aygıtları listelenemedi" });
    }
  });
  
  // Aktif depolama aygıtını değiştir
  app.post("/api/admin/storage/device", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ message: "deviceId gerekli" });
      }
      
      // Depolama aygıtını değiştir ve yapılandırmaya kaydet
      const success = config.updateSelectedStorageDevice(deviceId);
      
      if (success) {
        res.json({ 
          success: true,
          message: "Depolama aygıtı başarıyla değiştirildi",
          deviceId 
        });
      } else {
        throw new Error("Depolama aygıtı yapılandırması kaydedilemedi");
      }
    } catch (error) {
      console.error("Depolama aygıtı değiştirilirken hata:", error);
      res.status(500).json({ message: "Depolama aygıtı değiştirilemedi" });
    }
  });
  
  // Ağ ayarlarını getir
  app.get("/api/admin/network", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      // Kaydedilmiş ağ ayarlarını al
      const networkSettings = config.getNetworkConfig();
      
      res.json(networkSettings);
    } catch (error) {
      console.error("Ağ ayarları alınırken hata:", error);
      res.status(500).json({ message: "Ağ ayarları alınamadı" });
    }
  });
  
  // Ağ ayarlarını güncelle
  app.post("/api/admin/network", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Oturum açılmamış." });
      }
      
      // Sadece admin kullanıcılar için
      if (req.user.username !== "huzeyfeakt") {
        return res.status(403).json({ message: "Bu işlem için yönetici yetkileri gerekiyor" });
      }
      
      const { enableRemoteAccess, port, useSSL, domain } = req.body;
      
      // Ağ ayarlarını kaydet
      const success = config.updateNetworkConfig({ 
        enableRemoteAccess, 
        port, 
        useSSL, 
        domain 
      });
      
      if (success) {
        res.json({
          success: true,
          message: "Ağ ayarları başarıyla güncellendi",
          settings: { enableRemoteAccess, port, useSSL, domain }
        });
      } else {
        throw new Error("Ayarlar kaydedilemedi");
      }
    } catch (error) {
      console.error("Ağ ayarları güncellenirken hata:", error);
      res.status(500).json({ message: "Ağ ayarları güncellenemedi" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
