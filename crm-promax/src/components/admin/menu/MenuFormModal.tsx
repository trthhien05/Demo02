import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { uploadToCloudinary } from '@/lib/cloudinary';

const itemSchema = z.object({
  name: z.string().min(2, "Tên món ăn quá ngắn"),
  price: z.number().min(0, "Giá cả không hợp lệ"),
  description: z.string().optional(),
  categoryId: z.number().min(1, "Vui lòng chọn danh mục"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean()
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface MenuCategory {
  id: number;
  name: string;
}

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: MenuCategory[];
  onSubmitItem: (data: ItemFormValues & { id?: number }) => Promise<void>;
  editItem?: (ItemFormValues & { id: number }) | null;
}

export default function MenuFormModal({ isOpen, onClose, categories, onSubmitItem, editItem }: MenuFormModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      price: 0,
      description: '',
      categoryId: categories?.[0]?.id || 1,
      imageUrl: '',
      isAvailable: true
    }
  });

  const previewImage = watch('imageUrl');

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        reset({
          name: editItem.name,
          price: editItem.price,
          description: editItem.description || '',
          categoryId: editItem.categoryId,
          imageUrl: editItem.imageUrl || '',
          isAvailable: editItem.isAvailable
        });
      } else {
        reset({
          name: '',
          price: 0,
          description: '',
          categoryId: categories?.[0]?.id || 1,
          imageUrl: '',
          isAvailable: true
        });
      }
    }
  }, [isOpen, editItem, reset, categories]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setValue('imageUrl', url, { shouldValidate: true });
      toast.success("Tải ảnh lên Cloudinary thành công!");
    } catch (err: any) {
      toast.error(err.message || "Không thể tải ảnh lên Cloudinary.");
    } finally {
      setIsUploading(false);
    }
  };

  const submitWrapper = async (data: ItemFormValues) => {
    try {
      setIsSubmitting(true);
      if (editItem) {
        await onSubmitItem({ ...data, id: editItem.id });
      } else {
        await onSubmitItem(data);
      }
      toast.success(editItem ? "Cập nhật thành công!" : "Đã thêm món mới thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu món ăn");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0f1115] border border-white/10 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
            <div>
              <h2 className="text-xl font-bold">{editItem ? 'Chỉnh sửa Món ăn' : 'Thêm Món ăn Mới'}</h2>
              <p className="text-xs text-muted-foreground mt-1">Cập nhật vào cơ sở dữ liệu thực đơn trung tâm</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(submitWrapper)} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Cột trái: Hình ảnh */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Hình ảnh Món Ăn
                </label>
                <div className="relative group w-full aspect-square bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center transition-all hover:border-emerald-500/50">
                  {previewImage ? (
                    <img 
                      src={previewImage.startsWith('http') || previewImage.startsWith('data:') 
                        ? previewImage 
                        : previewImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop';
                      }}
                    />
                  ) : (
                     <div className="flex flex-col items-center text-muted-foreground gap-2">
                        <ImageIcon size={40} className="opacity-50" />
                        <span className="text-xs">Chưa có ảnh</span>
                     </div>
                  )}
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="animate-spin text-emerald-400 w-8 h-8" />
                    </div>
                  )}

                  <label className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-sm transition-all cursor-pointer">
                    <Upload size={24} className="text-white mb-2" />
                    <span className="text-xs font-bold text-white">Tải Ảnh Lên</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* Cột phải: Thông tin */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Tên Món Ăn</label>
                  <input {...register('name')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-colors" placeholder="VD: Bò Wagyu A5" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Mức Giá (VND)</label>
                  <input type="number" {...register('price', { valueAsNumber: true })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-colors font-mono" placeholder="0.00" />
                  {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Danh Mục</label>
                  <select {...register('categoryId', { valueAsNumber: true })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-colors appearance-none">
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0f1115]">{c.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="text-red-400 text-xs mt-1">{errors.categoryId.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Trạng thái Bán</label>
                  <label className="flex items-center gap-3 bg-black/40 border border-white/10 p-3 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                     <input type="checkbox" {...register('isAvailable')} className="w-4 h-4 accent-emerald-500" />
                     <span className="text-sm font-medium">Sẵn sàng gọi món</span>
                  </label>
                </div>
              </div>
              
              {/* Mô tả (Full width) */}
              <div className="md:col-span-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Mô tả (Nguyên liệu, Chế biến)</label>
                 <textarea {...register('description')} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-colors resize-none" placeholder="Nhập tóm tắt mô tả về món ăn..." />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-4">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={isSubmitting || isUploading} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-colors flex items-center justify-center min-w-[120px]">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (editItem ? 'Cập Nhật Món' : 'Lưu Món Mới')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
