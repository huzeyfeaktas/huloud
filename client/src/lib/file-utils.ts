import { FileSystemItem, FileType } from '@shared/schema';

export function getFileTypeFromName(filename: string): (typeof FileType)[keyof typeof FileType] {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
    return FileType.IMAGE;
  }
  
  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) {
    return FileType.VIDEO;
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
    return FileType.AUDIO;
  }
  
  // Document files
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return FileType.DOCUMENT;
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return FileType.ARCHIVE;
  }
  
  return FileType.OTHER;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFilePathParts(path: string): string[] {
  return path.split('/').filter(part => part.length > 0);
}

export function buildBreadcrumbTrail(file: FileSystemItem, filesMap: Map<number, FileSystemItem>): FileSystemItem[] {
  const trail: FileSystemItem[] = [file];
  let currentParentId = file.parentId;
  
  while (currentParentId !== null) {
    const parent = filesMap.get(currentParentId);
    if (parent) {
      trail.unshift(parent);
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }
  
  return trail;
}

export function sortFiles(files: FileSystemItem[], sortBy: string, sortDirection: 'asc' | 'desc'): FileSystemItem[] {
  return [...files].sort((a, b) => {
    // Always put directories first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'date':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'desc' ? -comparison : comparison;
  });
}
