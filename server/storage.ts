import { 
  files, 
  users,
  type File, 
  type User,
  type InsertFile, 
  type InsertUser,
  type FileSystemItem,
  type StorageStats,
  FileType 
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";
import { formatDistanceToNow } from "date-fns";
import createMemoryStore from "memorystore";
import fs from 'fs';
import path from 'path';
import { fileSystemStorage } from './file-storage';
import { storageService } from './services/flash-drive';

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File system operations
  getFileById(id: number): Promise<FileSystemItem | undefined>;
  getFiles(parentId: number | null, userId: number): Promise<FileSystemItem[]>;
  getRecentFiles(limit: number, userId: number): Promise<FileSystemItem[]>;
  searchFiles(query: string, userId: number): Promise<FileSystemItem[]>;
  getFilesByType(type: (typeof FileType)[keyof typeof FileType], userId: number): Promise<FileSystemItem[]>;
  getFavorites(userId: number): Promise<FileSystemItem[]>;
  createFile(file: InsertFile): Promise<FileSystemItem>;
  updateFile(id: number, updates: Partial<InsertFile>, userId: number): Promise<FileSystemItem | undefined>;
  deleteFile(id: number, userId: number): Promise<boolean>;
  getStorageStats(userId: number): Promise<StorageStats>;
  
  // Session store for authentication
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions'
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Error retrieving user by ID:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Error retrieving user by username:', error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error('Error retrieving user by email:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await pool.query(
        'INSERT INTO users (username, password, email, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
        [user.username, user.password, user.email, user.displayName]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }
  
  // File methods
  async getFileById(id: number): Promise<FileSystemItem | undefined> {
    try {
      const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
      if (result.rows.length === 0) return undefined;
      
      return this.mapDbFileToFileSystemItem(result.rows[0]);
    } catch (error) {
      console.error('Error retrieving file by ID:', error);
      return undefined;
    }
  }

  async getFiles(parentId: number | null, userId: number): Promise<FileSystemItem[]> {
    try {
      const parentIdCondition = parentId === null ? 'IS NULL' : '= $2';
      const values = parentId === null ? [userId] : [userId, parentId];
      
      const query = `SELECT * FROM files WHERE user_id = $1 AND parent_id ${parentIdCondition} ORDER BY is_directory DESC, name ASC`;
      
      const result = await pool.query(query, values);
      return result.rows.map(this.mapDbFileToFileSystemItem);
    } catch (error) {
      console.error('Error retrieving files:', error);
      return [];
    }
  }

  async getRecentFiles(limit: number, userId: number): Promise<FileSystemItem[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM files WHERE user_id = $1 AND is_directory = false ORDER BY updated_at DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows.map(this.mapDbFileToFileSystemItem);
    } catch (error) {
      console.error('Error retrieving recent files:', error);
      return [];
    }
  }

  async searchFiles(query: string, userId: number): Promise<FileSystemItem[]> {
    try {
      const searchPattern = `%${query}%`;
      const result = await pool.query(
        'SELECT * FROM files WHERE user_id = $1 AND name ILIKE $2 ORDER BY is_directory DESC, name ASC',
        [userId, searchPattern]
      );
      return result.rows.map(this.mapDbFileToFileSystemItem);
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  async getFilesByType(type: (typeof FileType)[keyof typeof FileType], userId: number): Promise<FileSystemItem[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM files WHERE user_id = $1 AND type = $2 ORDER BY name ASC',
        [userId, type]
      );
      return result.rows.map(this.mapDbFileToFileSystemItem);
    } catch (error) {
      console.error('Error retrieving files by type:', error);
      return [];
    }
  }

  async getFavorites(userId: number): Promise<FileSystemItem[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM files WHERE user_id = $1 AND is_favorite = true ORDER BY is_directory DESC, name ASC',
        [userId]
      );
      return result.rows.map(this.mapDbFileToFileSystemItem);
    } catch (error) {
      console.error('Error retrieving favorite files:', error);
      return [];
    }
  }

  async createFile(file: InsertFile): Promise<FileSystemItem> {
    try {
      const result = await pool.query(
        `INSERT INTO files (
          name, path, type, size, parent_id, user_id, is_directory, 
          is_favorite, is_public, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [
          file.name, 
          file.path, 
          file.type, 
          file.size || 0, 
          file.parentId, 
          file.userId, 
          file.isDirectory || false, 
          file.isFavorite || false, 
          file.isPublic || false
        ]
      );
      
      return this.mapDbFileToFileSystemItem(result.rows[0]);
    } catch (error) {
      console.error('Error creating file/folder:', error);
      throw new Error('Failed to create file or folder');
    }
  }

  async updateFile(id: number, updates: Partial<InsertFile>, userId: number): Promise<FileSystemItem | undefined> {
    try {
      // Build the SET clause dynamically based on the provided updates
      const setClauses = [];
      const values = [id, userId];
      let paramIndex = 3;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`${this.snakeCaseKey(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      // Add updated_at to the SET clause
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      
      if (setClauses.length === 0) return await this.getFileById(id);
      
      const query = `
        UPDATE files 
        SET ${setClauses.join(', ')} 
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) return undefined;
      
      return this.mapDbFileToFileSystemItem(result.rows[0]);
    } catch (error) {
      console.error('Error updating file:', error);
      return undefined;
    }
  }

  async deleteFile(id: number, userId: number): Promise<boolean> {
    try {
      // First, check if the file exists and belongs to the user
      const fileCheck = await pool.query(
        'SELECT * FROM files WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (fileCheck.rows.length === 0) return false;
      
      // If it's a directory, delete all children recursively
      if (fileCheck.rows[0].is_directory) {
        await this.deleteDirectoryContents(id, userId);
      }
      
      // Now delete the file itself
      const result = await pool.query(
        'DELETE FROM files WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  private async deleteDirectoryContents(directoryId: number, userId: number): Promise<void> {
    try {
      // Get all immediate children
      const childrenResult = await pool.query(
        'SELECT * FROM files WHERE parent_id = $1 AND user_id = $2',
        [directoryId, userId]
      );
      
      // Recursively delete subdirectories
      for (const child of childrenResult.rows) {
        if (child.is_directory) {
          await this.deleteDirectoryContents(child.id, userId);
        }
      }
      
      // Delete all children
      await pool.query(
        'DELETE FROM files WHERE parent_id = $1 AND user_id = $2',
        [directoryId, userId]
      );
    } catch (error) {
      console.error('Error deleting directory contents:', error);
      throw error;
    }
  }

  async getStorageStats(userId: number): Promise<StorageStats> {
    try {
      const result = await pool.query(
        'SELECT COALESCE(SUM(size), 0) as total_size FROM files WHERE user_id = $1 AND is_directory = false',
        [userId]
      );
      
      const usedBytes = parseInt(result.rows[0].total_size) || 0;
      const totalBytes = 10 * 1024 * 1024 * 1024; // 10 GB default storage limit
      const usedPercentage = (usedBytes / totalBytes) * 100;
      
      return {
        used: usedBytes,
        total: totalBytes,
        usedPercentage
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        used: 0,
        total: 10 * 1024 * 1024 * 1024,
        usedPercentage: 0
      };
    }
  }

  // Helper method to convert database file to FileSystemItem
  private mapDbFileToFileSystemItem(dbFile: any): FileSystemItem {
    return {
      id: dbFile.id,
      name: dbFile.name,
      path: dbFile.path,
      type: dbFile.type,
      size: dbFile.size || 0,
      parentId: dbFile.parent_id,
      userId: dbFile.user_id,
      isDirectory: dbFile.is_directory,
      isFavorite: dbFile.is_favorite,
      isPublic: dbFile.is_public,
      createdAt: new Date(dbFile.created_at),
      updatedAt: new Date(dbFile.updated_at)
    };
  }

  // Helper to convert camelCase to snake_case for database fields
  private snakeCaseKey(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}

import { fileSystemStorage } from './file-storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import createMemoryStore from "memorystore";

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private filesMap: Map<number, FileSystemItem>;
  private currentUserId: number;
  private currentFileId: number;
  private totalStorage: number;
  sessionStore: any;
  private initialized: boolean = false;
  
  // Dosya adları
  private readonly USERS_FILE = 'users';
  private readonly FILES_FILE = 'files';
  private readonly COUNTERS_FILE = 'counters';

  constructor() {
    this.users = new Map();
    this.filesMap = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.totalStorage = 32 * 1024 * 1024 * 1024; // 32GB
    
    // Session store'u oluştur
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Verileri diskten yükle ve eksik klasörleri oluştur
    this.loadData().then(() => {
      // Eğer hiç dosya yoksa varsayılan klasörleri oluştur
      if (this.filesMap.size === 0) {
        this.initializeDefaultFiles().then(() => {
          console.log("Varsayılan klasörler oluşturuldu:", this.filesMap.size);
        }).catch(error => {
          console.error("Varsayılan klasörler oluşturulurken hata:", error);
        });
      } else {
        console.log("Disk verisi yüklendi:", this.filesMap.size, "dosya,", this.users.size, "kullanıcı");
      }
      this.initialized = true;
    }).catch(error => {
      console.error("Veriler yüklenirken hata:", error);
    });
  }
  
  // Disk verilerini yükle
  private async loadData(): Promise<void> {
    try {
      // Sayaçları yükle
      const counters = await fileSystemStorage.loadJSON(this.COUNTERS_FILE, {
        userId: 1,
        fileId: 1
      });
      this.currentUserId = counters.userId;
      this.currentFileId = counters.fileId;
      
      // Kullanıcıları yükle
      const users = await fileSystemStorage.loadJSON<User[]>(this.USERS_FILE, []);
      users.forEach(user => {
        this.users.set(user.id, user);
      });
      
      // Dosyaları yükle
      const files = await fileSystemStorage.loadJSON<FileSystemItem[]>(this.FILES_FILE, []);
      files.forEach(file => {
        this.filesMap.set(file.id, file);
      });
    } catch (error) {
      console.error("Veriler yüklenirken hata:", error);
    }
  }
  
  // Sayaçları kaydet
  private async saveCounters(): Promise<void> {
    await fileSystemStorage.saveJSON(this.COUNTERS_FILE, {
      userId: this.currentUserId,
      fileId: this.currentFileId
    });
  }
  
  // Kullanıcıları kaydet
  private async saveUsers(): Promise<void> {
    const users = Array.from(this.users.values());
    await fileSystemStorage.saveJSON(this.USERS_FILE, users);
  }
  
  // Dosyaları kaydet
  private async saveFiles(): Promise<void> {
    const files = Array.from(this.filesMap.values());
    await fileSystemStorage.saveJSON(this.FILES_FILE, files);
  }

  private async initializeDefaultFiles() {
    // Kullanıcı varsayılan dosya istemediği için boş bırakıyoruz
    console.log("Varsayılan dosya oluşturma devre dışı bırakıldı.");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user = { 
      ...insertUser, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    
    // Kullanıcıları diske kaydet
    await this.saveUsers();
    await this.saveCounters();
    
    return user;
  }

  // File methods
  async getFileById(id: number): Promise<FileSystemItem | undefined> {
    const file = this.filesMap.get(id);
    
    // Dosya yoksa undefined dön
    if (!file) {
      return undefined;
    }
    
    // Dosya bir klasörse veya fiziksel dosya kontrolü gerekmiyorsa dosyayı dön
    if (file.isDirectory || file.userId === undefined || file.path === undefined) {
      return file;
    }
    
    try {
      // Dosyanın fiziksel olarak var olup olmadığını kontrol et
      // StorageService kullanarak kontrol et
      try {
        // Yoldan baştaki slash'ı kaldırarak kontrol edelim
        const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        await storageService.getFileInfo(normalizedPath, file.userId);
      } catch (error) {
        console.log(`Dosya fiziksel olarak bulunamadı: ${file.path} (userId: ${file.userId}), veritabanından kaldırılıyor.`);
        this.filesMap.delete(id);
        await this.saveFiles();
        return undefined;
      }
    } catch (error) {
      console.error(`Dosya kontrol hatası (id=${id}):`, error);
    }
    
    return file;
  }

  async getFiles(parentId: number | null, userId: number = 1): Promise<FileSystemItem[]> {
    // Sadece kullanıcıya ait olan dosyaları getir
    const files = Array.from(this.filesMap.values()).filter(
      file => file.parentId === parentId && file.userId === userId
    );
    return files;
  }

  async getRecentFiles(limit: number, userId: number = 1): Promise<FileSystemItem[]> {
    const files = Array.from(this.filesMap.values())
      .filter(file => !file.isDirectory && file.userId === userId) // Sadece kullanıcıya ait dosyalar
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
    return files;
  }

  async searchFiles(query: string, userId: number = 1): Promise<FileSystemItem[]> {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.filesMap.values()).filter(file => 
      file.name.toLowerCase().includes(normalizedQuery) && file.userId === userId
    );
  }

  async getFilesByType(type: (typeof FileType)[keyof typeof FileType], userId: number = 1): Promise<FileSystemItem[]> {
    return Array.from(this.filesMap.values()).filter(file => 
      file.type === type && file.userId === userId
    );
  }

  async getFavorites(userId: number = 1): Promise<FileSystemItem[]> {
    return Array.from(this.filesMap.values()).filter(file => 
      file.isFavorite && file.userId === userId
    );
  }

  async createFile(insertFile: InsertFile): Promise<FileSystemItem> {
    const id = this.currentFileId++;
    const now = new Date();
    
    const newFile: FileSystemItem = {
      id,
      ...insertFile,
      createdAt: now,
      updatedAt: now,
    };
    
    this.filesMap.set(id, newFile);
    
    // Dosyaları ve sayaçları diske kaydet
    await this.saveFiles();
    await this.saveCounters();
    
    return newFile;
  }

  async updateFile(id: number, updates: Partial<InsertFile>, userId: number = 1): Promise<FileSystemItem | undefined> {
    const file = this.filesMap.get(id);
    if (!file) return undefined;
    
    // Sadece kullanıcının kendi dosyalarını güncellemesine izin ver
    if (file.userId !== userId) {
      return undefined;
    }

    const updatedFile = {
      ...file,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.filesMap.set(id, updatedFile);
    
    // Favorilere eklenip çıkarıldığında log bilgisi
    if ('isFavorite' in updates) {
      console.log(`Dosya favori durumu güncellendi - ID: ${id}, Kullanıcı: ${userId}, Yeni durum:`, updates.isFavorite);
    }
    
    // Dosyaları diske kaydet
    await this.saveFiles();
    
    return updatedFile;
  }

  async deleteFile(id: number, userId: number = 1): Promise<boolean> {
    const file = this.filesMap.get(id);
    if (!file) return false;
    
    // Sadece kullanıcının kendi dosyalarını silmesine izin ver
    if (file.userId !== userId) {
      return false;
    }

    try {
      // Fiziksel dosyayı sil (klasör veya dosya)
      if (!file.isDirectory) {
        // Fiziksel dosyayı sil
        console.log(`Fiziksel dosyayı silmeye çalışıyor: ${file.path}`);
        await storageService.deleteFile(file.path, userId);
      } else {
        // Klasörü sil
        console.log(`Fiziksel klasörü silmeye çalışıyor: ${file.path}`);
        await storageService.deleteDirectory(file.path, userId);
      }
    } catch (error) {
      console.error(`Fiziksel dosya/klasör silinirken hata: ${file.path}`, error);
      // Fiziksel silme hata verse bile veritabanından silmeye devam et
    }

    // If it's a directory, also delete all children
    if (file.isDirectory) {
      const childrenToDelete: number[] = [];
      
      // Find all descendants recursively
      const findDescendants = (parentId: number) => {
        for (const [fileId, file] of this.filesMap.entries()) {
          if (file.parentId === parentId) {
            childrenToDelete.push(fileId);
            if (file.isDirectory) {
              findDescendants(fileId);
            }
          }
        }
      };
      
      findDescendants(id);
      
      // Delete all descendants
      for (const childId of childrenToDelete) {
        const childFile = this.filesMap.get(childId);
        if (childFile && !childFile.isDirectory) {
          try {
            // Dosya içinde bulunan fiziksel dosyaları sil
            console.log(`Alt dosyayı silmeye çalışıyor: ${childFile.path}`);
            await storageService.deleteFile(childFile.path, userId);
          } catch (error) {
            console.error(`Alt dosya silinirken hata: ${childFile.path}`, error);
          }
        }
        this.filesMap.delete(childId);
      }
    }
    
    this.filesMap.delete(id);
    
    // Dosyaları diske kaydet
    await this.saveFiles();
    
    return true;
  }

  async getStorageStats(userId: number = 1): Promise<StorageStats> {
    const used = Array.from(this.filesMap.values())
      .filter(file => !file.isDirectory && file.userId === userId)
      .reduce((sum, file) => sum + file.size, 0);
    
    return {
      used,
      total: this.totalStorage,
      usedPercentage: (used / this.totalStorage) * 100
    };
  }
}

// Veriler bellek tabanlı depolamada saklanıyor (Veritabanı kullanılmıyor)
export const storage = new MemStorage();
