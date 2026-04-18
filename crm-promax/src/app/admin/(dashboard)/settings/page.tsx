'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Save, Store, Globe, MapPin, Phone, Mail, Percent, CreditCard, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RestaurantSetting {
  id: number;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  logoUrl: string | null;
  currency: string;
  taxRate: number;
  serviceCharge: number;
  email: string | null;
  website: string | null;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<RestaurantSetting | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: settings, isLoading } = useQuery<RestaurantSetting>({
    queryKey: ['settings'],
    queryFn: async () => {
       const res = await apiClient.get('/settings');
       return res.data;
    }
  });

  // Sync with local state once loaded
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: RestaurantSetting) => apiClient.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Đã cập nhật cài đặt hệ thống thành công!', {
         description: 'Các thay đổi sẽ có hiệu lực ngay lập tức trên toàn hệ thống.'
      });
    },
    onError: () => toast.error('Không thể lưu cài đặt')
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (formData) {
         setFormData({ ...formData, logoUrl: data.secure_url });
      }
    } catch (err) {
      toast.error('Upload ảnh thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const updateField = (field: keyof RestaurantSetting, value: any) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading || !formData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px]">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
         <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mb-2 block">System Configuration</span>
            <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
               Cài Đặt <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Hệ Thống</span>
               <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Settings2 size={24} />
               </div>
            </h1>
         </motion.div>

         <button 
           onClick={() => formData && mutation.mutate(formData)}
           disabled={mutation.isPending}
           className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
         >
           {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save size={18} />}
           Lưu Thay Đổi
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Identity Section */}
         <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-8"
         >
            <section className="glass rounded-[2.5rem] p-8 border-white/5 space-y-8">
               <div className="flex items-center gap-4 mb-2">
                  <Store className="text-primary" size={20} />
                  <h2 className="text-lg font-bold uppercase tracking-widest italic">Thông Tin Thương Hiệu</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Tên Nhà Hàng / Chuỗi</label>
                     <input 
                        value={formData.name} 
                        onChange={e => updateField('name', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-bold focus:border-primary outline-none transition-all italic"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Hotline Nhà Hàng</label>
                     <div className="relative">
                        <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                           value={formData.phoneNumber || ''} 
                           onChange={e => updateField('phoneNumber', e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-primary outline-none"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Email Liên Hệ</label>
                     <div className="relative">
                        <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                           value={formData.email || ''} 
                           onChange={e => updateField('email', e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-primary outline-none"
                        />
                     </div>
                  </div>
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Địa chỉ Trụ sở</label>
                     <div className="relative">
                        <MapPin size={18} className="absolute left-5 top-5 text-muted-foreground" />
                        <textarea 
                           value={formData.address || ''} 
                           onChange={e => updateField('address', e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:border-primary outline-none h-24 resize-none"
                        />
                     </div>
                  </div>
               </div>
            </section>

            <section className="glass rounded-[2.5rem] p-8 border-white/5 space-y-8">
               <div className="flex items-center gap-4 mb-2">
                  <CreditCard className="text-primary" size={20} />
                  <h2 className="text-lg font-bold uppercase tracking-widest italic">Cấu Hình Tài Chính & VAT</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                     <div className="flex items-center justify-center mb-3 text-emerald-400">
                        <Percent size={24} />
                     </div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2 text-center">Thuế VAT (%)</label>
                     <input 
                        type="number"
                        value={formData.taxRate} 
                        onChange={e => updateField('taxRate', parseFloat(e.target.value))}
                        className="w-24 bg-transparent text-3xl font-black text-center outline-none border-b-2 border-primary/20 focus:border-primary transition-all pb-1"
                     />
                  </div >
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                     <div className="flex items-center justify-center mb-3 text-orange-400">
                        <Calculator size={24} />
                     </div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2 text-center">Phí Phục Vụ (%)</label>
                     <input 
                        type="number"
                        value={formData.serviceCharge} 
                        onChange={e => updateField('serviceCharge', parseFloat(e.target.value))}
                        className="w-24 bg-transparent text-3xl font-black text-center outline-none border-b-2 border-primary/20 focus:border-primary transition-all pb-1"
                     />
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                     <div className="flex items-center justify-center mb-3 text-primary">
                        <Globe size={24} />
                     </div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2 text-center">Tiền Tệ</label>
                     <input 
                        value={formData.currency} 
                        onChange={e => updateField('currency', e.target.value)}
                        className="w-24 bg-transparent text-3xl font-black text-center outline-none border-b-2 border-primary/20 focus:border-primary transition-all pb-1 italic"
                     />
                  </div>
               </div>
            </section>
         </motion.div>

         {/* Sidebar / Visuals */}
         <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
         >
            <div className="glass rounded-[2.5rem] p-8 border-white/5 text-center flex flex-col items-center">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">Logo Nhà Hàng</h3>
               <div className="relative group mb-6">
                  <div className="w-48 h-48 rounded-[3rem] bg-white/5 border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 relative">
                     {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                     ) : (
                        <ImageIcon size={60} className="text-white/10" />
                     )}
                     
                     {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                           <Loader2 className="animate-spin text-primary" />
                        </div>
                     )}
                  </div>
                  <label className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
                     Thay đổi Logo
                     <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
               </div>
               <p className="text-[10px] text-muted-foreground leading-relaxed px-4">
                  Logo sẽ được hiển thị trên **Hóa Đơn**, **Trang Đặt Bàn Offline** và **Email** gửi khách hàng. Khuyên dùng định dạng .PNG trong suốt.
               </p>
            </div>

            <div className="glass rounded-[2.5rem] p-8 border-white/5 bg-gradient-to-br from-primary/[0.05] to-transparent">
               <h3 className="text-sm font-bold flex items-center gap-2 mb-4 italic">
                  <Sparkles size={16} className="text-primary" /> Pro Setting Tip
               </h3>
               <p className="text-xs text-muted-foreground leading-relaxed">
                  Thiết lập **Thuế VAT** chính xác giúp báo cáo tài chính của bạn minh bạch hơn. Nếu áp dụng giảm phí dịch vụ cho khách VIP, hãy cấu hình trong module Loyalty thay vì ở trang cài đặt chung này.
               </p>
            </div>
         </motion.div>
      </div>
    </div>
  );
}

function Calculator({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <rect x="4" y="2" width="16" height="20" rx="2" />
       <line x1="8" y1="6" x2="16" y2="6" />
       <line x1="16" y1="14" x2="16" y2="18" />
       <path d="M16 10h.01" />
       <path d="M12 10h.01" />
       <path d="M8 10h.01" />
       <path d="M12 14h.01" />
       <path d="M8 14h.01" />
       <path d="M12 18h.01" />
       <path d="M8 18h.01" />
    </svg>
  );
}
