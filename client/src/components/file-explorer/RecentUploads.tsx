import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSystemItem } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import FileCard from './FileCard';

interface RecentUploadsProps {
  limit?: number;
}

const RecentUploads: React.FC<RecentUploadsProps> = ({ limit = 4 }) => {
  const { data: recentFiles, isLoading, error } = useQuery<FileSystemItem[]>({
    queryKey: [`/api/files/recent?limit=${limit}`],
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-7 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(limit).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !recentFiles || recentFiles.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-foreground mb-3">Recent Uploads</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recentFiles.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
};

export default RecentUploads;
