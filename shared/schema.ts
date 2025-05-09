import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define file types for categorization
export const FileType = {
  FOLDER: "folder",
  DOCUMENT: "document",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  ARCHIVE: "archive",
  OTHER: "other",
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size").default(0),
  parentId: integer("parent_id").references(() => files.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isDirectory: boolean("is_directory").default(false),
  isFavorite: boolean("is_favorite").default(false),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sharedFiles = pgTable("shared_files", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // "read", "write"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  sharedFiles: many(sharedFiles),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  parent: one(files, {
    fields: [files.parentId],
    references: [files.id],
  }),
  children: many(files),
  owner: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  shares: many(sharedFiles),
}));

export const sharedFilesRelations = relations(sharedFiles, ({ one }) => ({
  file: one(files, {
    fields: [sharedFiles.fileId],
    references: [files.id],
  }),
  user: one(users, {
    fields: [sharedFiles.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// File system specific types
export type FileSystemItem = {
  id: number;
  name: string;
  path: string;
  type: (typeof FileType)[keyof typeof FileType];
  size: number;
  parentId: number | null;
  userId?: number;
  isDirectory: boolean;
  isFavorite: boolean;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: FileSystemItem[];
  owner?: User;
};

// File upload response type
export type UploadResponse = {
  success: boolean;
  file?: FileSystemItem;
  error?: string;
};

// Storage stats
export type StorageStats = {
  used: number;
  total: number;
  free?: number; // Sistemde kalan boş alan
  usedPercentage: number;
  deviceName?: string; // Seçilen depolama aygıtının adı
};
