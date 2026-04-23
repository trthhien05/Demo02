'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Mail, Shield, Save, Loader2, Camera, KeyRound, CheckCircle2, History, Award, Calendar, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Schemas ---
const profileSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự."),
  email: z.string().email("Email không hợp lệ."),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu cũ."),
  newPassword: z.string().min(5, "Mật khẩu mới tối thiểu 5 ký tự."),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirmPassword"]
});
type PasswordFormValues = z.infer<typeof passwordSchema>;

const ROLE_MAP: Record<number, { label: string, color: string }> = {
  0: { label: 'Quản Trị Viên', color: 'bg-amber-400 text-black border-amber-500' },
  1: { label: 'Nhân Viên', color: 'bg-blue-500 text-white border-white/5' },
  2: { label: 'Thu Ngân', color: 'bg-emerald-500 text-white border-white/5' },
  3: { label: 'Bếp Trưởng', color: 'bg-orange-500 text-white border-white/5' },
  4: { label: 'Phục Vụ', color: 'bg-violet-500 text-white border-white/5' },
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'activity'>('general');
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/profile');
      setUserData(res.data);
      profileForm.reset({
        fullName: res.data.fullName,
        email: res.data.email,
        phoneNumber: res.data.phoneNumber ?? '',
        dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : '',
        gender: res.data.gender ?? '',
        address: res.data.address ?? '',
        department: res.data.department ?? '',
        bio: res.data.bio ?? '',
        avatarUrl: res.data.avatarUrl ?? '',
      });
    } catch (error) {
      toast.error("Không thể tải thông tin hồ sơ.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivity = async () => {
    setIsLoadingActivity(true);
    try {
      const res = await apiClient.get('/users/my-activity');
      setActivityLogs(res.data);
    } catch (error) {
      toast.error("Không thể tải nhật ký hoạt động.");
    } finally {
      setIsLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activity') {
        fetchActivity();
    }
  }, [activeTab]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const payload = {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null
      };
      await apiClient.put('/users/profile', payload);
      toast.success("Cập nhật thông tin thành công!");
      fetchProfile();
    } catch (error) {
      toast.error("Lỗi cập nhật hồ sơ.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Cloudinary details
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drpm4i6y6';
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        profileForm.setValue('avatarUrl', data.secure_url, { shouldDirty: true });
        onProfileSubmit(profileForm.getValues());
      } else {
        toast.error("Lỗi tải ảnh lên: " + (data.error?.message || 'Unknown error'));
      }
    } catch {
      toast.error("Không thể kết nối đến máy chủ tải ảnh.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await apiClient.post('/users/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword
      });
      toast.success("Đổi mật khẩu thành công!");
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.Message || "Mật khẩu cũ không chính xác.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Area */}
      <div className="relative group p-8 rounded-[2.5rem] overflow-hidden border border-white/5 bg-white/[0.01]">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent opacity-50" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
             Hồ Sơ <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Cá Nhân</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-md font-bold uppercase tracking-[0.15em] opacity-60">Identity & Performance Hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR */}
        <div className="xl:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 rounded-[3rem] border-white/10 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-3xl shadow-2xl">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full" />
            
            <div className="relative group mb-8">
              <div className="w-40 h-40 rounded-[2.5rem] bg-neutral-900 border-2 border-white/10 flex items-center justify-center text-white text-5xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative transition-transform group-hover:scale-[1.02]">
                {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                       <Loader2 className="animate-spin" size={32} />
                    </div>
                )}
                
                {userData?.avatarUrl ? (
                    <img src={userData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-black">
                       {userData?.fullName?.charAt(0) || 'U'}
                    </div>
                )}
                
                <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Camera size={32} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" disabled={isUploadingAvatar} onChange={handleImageUpload} />
                </label>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#050608] rounded-2xl flex items-center justify-center border-2 border-emerald-500">
                 <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">{userData?.fullName || 'Anonymous'}</h2>
            <p className="text-xs text-primary font-black uppercase tracking-widest mb-6">@{userData?.username}</p>
            
            <div className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-10 border shadow-lg",
              ROLE_MAP[userData?.role]?.color || "bg-neutral-800 text-white border-white/5"
            )}>
               {userData?.role === 0 ? <Award size={14} /> : <Shield size={14} />}
               {ROLE_MAP[userData?.role]?.label || 'GUEST'}
            </div>

            <div className="grid grid-cols-2 w-full gap-3 pt-8 border-t border-white/5">
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-center">
                    <div className="text-xl font-black text-white">{activityLogs.length}+</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Sự kiện</div>
                </div>
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-center">
                    <div className="text-xl font-black text-primary">Active</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Trạng thái</div>
                </div>
            </div>
          </motion.div>

          <div className="glass-card p-3 rounded-[2.5rem] flex flex-col gap-2 border-white/5">
            <button 
              onClick={() => setActiveTab('general')}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest",
                activeTab === 'general' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3"><User size={18} /> Thông tin chung</div>
              {activeTab === 'general' && <ChevronRight size={16} />}
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest",
                activeTab === 'security' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3"><Lock size={18} /> Bảo mật</div>
              {activeTab === 'security' && <ChevronRight size={16} />}
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest",
                activeTab === 'activity' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3"><History size={18} /> Hoạt động</div>
              {activeTab === 'activity' && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* MAIN PANEL */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'general' ? (
              <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-10 rounded-[3.5rem] border-white/10 h-full shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                     <User size={20} />
                  </div>
                  THÔNG TIN CƠ BẢN
                </h3>
                
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Họ và Tên</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                              {...profileForm.register('fullName')}
                              className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                              placeholder="Họ tên đầy đủ"
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Địa chỉ Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                              {...profileForm.register('email')}
                              className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                              placeholder="Email liên hệ"
                            />
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Số điện thoại</label>
                        <input
                           {...profileForm.register('phoneNumber')}
                           className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                           placeholder="09xx..."
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Bộ phận</label>
                        <input
                           {...profileForm.register('department')}
                           className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                           placeholder="Phòng ban làm việc"
                        />
                    </div>
                  </div>

                  <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tiểu sử / Mô tả</label>
                        <textarea
                           {...profileForm.register('bio')}
                           className="w-full bg-neutral-950/50 border border-white/5 rounded-[2rem] py-4 px-6 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white min-h-[120px] resize-none font-bold"
                           placeholder="Vài thông tin về bạn..."
                        />
                  </div>

                  <div className="flex justify-end pt-6">
                    <button 
                      type="submit" 
                      disabled={profileForm.formState.isSubmitting}
                      className="px-12 py-5 bg-primary hover:bg-primary/80 rounded-2xl text-white text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                    >
                      {profileForm.formState.isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Cập nhật thông tin
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : activeTab === 'security' ? (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-10 rounded-[3.5rem] border-white/10 h-full relative overflow-hidden backdrop-blur-3xl">
                <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/20">
                     <Lock size={20} />
                  </div>
                  BẢO MẬT TÀI KHOẢN
                </h3>

                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mật khẩu cũ</label>
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        {...passwordForm.register('oldPassword')}
                        type="password"
                        className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mật khẩu mới</label>
                        <input
                            {...passwordForm.register('newPassword')}
                            type="password"
                            className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                            placeholder="Tối thiểu 6 ký tự"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nhập lại mật khẩu</label>
                        <input
                            {...passwordForm.register('confirmPassword')}
                            type="password"
                            className="w-full bg-neutral-950/50 border border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-white/5 transition-all text-sm text-white font-bold"
                            placeholder="Xác nhận"
                        />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button 
                      type="submit" 
                      disabled={passwordForm.formState.isSubmitting}
                      className="px-12 py-5 bg-orange-500 hover:bg-orange-600 rounded-2xl text-white text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                    >
                      {passwordForm.formState.isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                      Đặt lại mật khẩu
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
                <motion.div key="activity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-10 rounded-[3.5rem] border-white/10 h-full relative overflow-hidden backdrop-blur-3xl">
                    <h3 className="text-xl font-black text-white mb-10 flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                         <History size={20} />
                       </div>
                       NHẬT KÝ HOẠT ĐỘNG
                    </h3>

                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {isLoadingActivity ? (
                            <div className="h-40 flex items-center justify-center">
                               <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : activityLogs.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                               <History size={48} />
                               <p className="mt-2 text-xs font-bold uppercase tracking-widest">No logs found</p>
                            </div>
                        ) : (
                            activityLogs.map((log, idx) => (
                                <div key={log.id || idx} className="relative pl-10 group">
                                    <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/5" />
                                    <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-primary/50 group-hover:scale-125 transition-transform" />
                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center justify-between mb-1">
                                           <span className="text-[10px] font-black uppercase tracking-widest text-primary">{log.action}</span>
                                           <span className="text-[10px] font-bold text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-white mb-1">{log.module}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{log.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  'Món chính': 'bg-emerald-500/40',
  'Đồ uống': 'bg-blue-500/40',
  'Tráng miệng': 'bg-purple-500/40',
};
