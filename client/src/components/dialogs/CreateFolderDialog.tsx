import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderPlus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileSystemItem, FileType } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: number | null;
}

const folderSchema = z.object({
  name: z.string().min(1, "Klasör adı gereklidir").max(255, "Klasör adı çok uzun"),
});

type FolderFormValues = z.infer<typeof folderSchema>;

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ isOpen, onClose, currentFolderId }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FolderFormValues>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: '',
    },
  });

  const createFolderMutation = useMutation<FileSystemItem, Error, FolderFormValues>({
    mutationFn: async (values) => {
      // JSON içinde doğrudan path ve userId belirtilmemeli, sunucu tarafında hesaplanacak
      const response = await apiRequest('POST', '/api/folders', {
        name: values.name,
        parentId: currentFolderId,
        isDirectory: true,
        type: FileType.FOLDER,
        size: 0,
        isFavorite: false,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Klasör oluşturulamadı');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: [`/api/files?parentId=${currentFolderId}`] });
      }
      toast({
        title: 'Başarılı',
        description: 'Klasör başarıyla oluşturuldu',
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: `Klasör oluşturulamadı: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FolderFormValues) => {
    createFolderMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Klasör Oluştur</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klasör Adı</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Klasör adını girin" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} type="button">
                İptal
              </Button>
              <Button 
                type="submit"
                disabled={createFolderMutation.isPending}
                className="flex items-center"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                {createFolderMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
