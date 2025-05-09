import React from 'react';
import { 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Download,
  Trash,
  Pencil,
  Star,
  Share,
  ExternalLink,
} from 'lucide-react';
import { FileSystemItem } from '@shared/schema';

interface FileContextMenuProps {
  file: FileSystemItem;
  onAction: (action: string, file: FileSystemItem) => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({ file, onAction }) => {
  return (
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onClick={() => onAction('open', file)}>
        <ExternalLink className="mr-2 h-4 w-4" />
        <span>Aç</span>
      </DropdownMenuItem>
      
      {!file.isDirectory && (
        <DropdownMenuItem onClick={() => onAction('download', file)}>
          <Download className="mr-2 h-4 w-4" />
          <span>İndir</span>
        </DropdownMenuItem>
      )}
      
      <DropdownMenuItem onClick={() => onAction('rename', file)}>
        <Pencil className="mr-2 h-4 w-4" />
        <span>Yeniden Adlandır</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={() => onAction('toggleFavorite', file)}>
        <Star className="mr-2 h-4 w-4" fill={file.isFavorite ? "currentColor" : "none"} />
        <span>{file.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</span>
      </DropdownMenuItem>
      
      <DropdownMenuItem onClick={() => onAction('share', file)}>
        <Share className="mr-2 h-4 w-4" />
        <span>Paylaş</span>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuItem 
        onClick={() => onAction('delete', file)}
        className="text-destructive focus:text-destructive"
      >
        <Trash className="mr-2 h-4 w-4" />
        <span>Sil</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

export default FileContextMenu;
