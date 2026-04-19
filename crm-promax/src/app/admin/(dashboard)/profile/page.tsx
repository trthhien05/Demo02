'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Mail, Shield, Save, Loader2, Camera, KeyRound, CheckCircle2, History, Award, Calendar, ExternalLink } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

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
        fullName: res.data.FullName,
        email: res.data.Email,
        phoneNumber: res.data.PhoneNumber ?? '',
        dateOfBirth: res.data.DateOfBirth ? res.data.DateOfBirth.split('T')[0] : '',
        gender: res.data.Gender ?? '',
        address: res.data.Address ?? '',
        department: res.data.Department ?? '',
        bio: res.data.Bio ?? '',
        avatarUrl: res.data.AvatarUrl ?? '',
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
    
    // Yêu cầu: Bạn cần thay "TENDIENTHOAICUABAN" bằng Cloud Name của bạn 
    // và "UPLOAD_PRESET" bằng Preset Name trong phần Settings -> Upload của Cloudinary.
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'docs_upload_preset';
    
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
        toast.error("Lỗi tải ảnh lên Cloudinary: " + (data.error?.message || 'Unknown error'));
      }
    } catch {
      toast.error("Không thể kết nối đến máy chủ Cloudinary.");
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
      toast.success("Đối mật khẩu thành công!");
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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          Hồ Sơ <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Cá Nhân</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Quản lý thông tin tài khoản và thiết lập bảo mật của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 rounded-[2rem] flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-primary/20 ring-4 ring-white/10 overflow-hidden relative">
                {isUploadingAvatar ? (
                    <Loader2 className="animate-spin" size={32} />
                ) : userData?.AvatarUrl ? (
                    <img src={userData.AvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    userData?.FullName?.charAt(0) || 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2.5 bg-background/80 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-primary transition-colors shadow-lg shadow-black/40 cursor-pointer">
                <Camera size={16} />
                <input type="file" accept="image/*" className="hidden" disabled={isUploadingAvatar} onChange={handleImageUpload} />
              </label>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{userData?.FullName}</h2>
            
            {/* Branded Role Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border ${
                userData?.Role === 'Admin' 
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' 
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
               {userData?.Role === 'Admin' ? <Award size={12} /> : <Shield size={12} />}
               {userData?.Role}
            </div>

            <p className="text-xs text-muted-foreground mb-6">@{userData?.Username}</p>
            
            <div className="w-full space-y-2 pt-6 border-t border-white/5">
                {userData?.PhoneNumber && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-muted-foreground">Điện thoại</span>
                      <span className="text-white font-bold">{userData.PhoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-muted-foreground">Phòng ban</span>
                    <span className="text-white font-bold">{userData?.Department || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-muted-foreground">Thành viên từ</span>
                    <span className="text-white font-bold">{userData?.CreatedAt ? new Date(userData.CreatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <span className="text-muted-foreground">Tình trạng</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Hoạt động</span>
                </div>
            </div>
          </motion.div>

          <div className="glass-card p-4 rounded-3xl flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'general' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <User size={18} /> Thông tin chung
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'security' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <Lock size={18} /> Bảo mật & Mật khẩu
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'activity' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <History size={18} /> Nhật ký hoạt động
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'general' ? (
              <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 rounded-[2rem] h-full">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 underline decoration-primary underline-offset-8">
                  <User size={20} className="text-primary" /> Thông tin cá nhân
                </h3>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Họ và Tên</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                            {...profileForm.register('fullName')}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                            placeholder="Nhập họ tên đầy đủ"
                            />
                        </div>
                        {profileForm.formState.errors.fullName && <p className="text-red-400 text-xs ml-1">{profileForm.formState.errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Địa chỉ Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                            {...profileForm.register('email')}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                            placeholder="Địa chỉ Email"
                            />
                        </div>
                        {profileForm.formState.errors.email && <p className="text-red-400 text-xs ml-1">{profileForm.formState.errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Số điện thoại</label>
                        <input
                           {...profileForm.register('phoneNumber')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                           placeholder="Nhập số điện thoại"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Giới tính</label>
                        <select
                           {...profileForm.register('gender')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white appearance-none"
                        >
                            <option value="" className="bg-neutral-900">Chưa xác định</option>
                            <option value="Nam" className="bg-neutral-900">Nam</option>
                            <option value="Nữ" className="bg-neutral-900">Nữ</option>
                            <option value="Khác" className="bg-neutral-900">Khác</option>
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Chức vụ / Phòng ban</label>
                        <input
                           {...profileForm.register('department')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                           placeholder="Ví dụ: Quản lý chi nhánh"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Ngày sinh</label>
                        <input
                           type="date"
                           {...profileForm.register('dateOfBirth')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white [&::-webkit-calendar-picker-indicator]:invert"
                        />
                    </div>
                  </div>

                  <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Địa chỉ thường trú</label>
                        <input
                           {...profileForm.register('address')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                           placeholder="Nhập địa chỉ của bạn"
                        />
                  </div>

                  <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Tiểu sử / Ghi chú</label>
                        <textarea
                           {...profileForm.register('bio')}
                           className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white min-h-[100px] resize-y"
                           placeholder="Vài nét về công việc và bản thân..."
                        />
                  </div>

                  <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold text-muted-foreground ml-1 opacity-50">Tên đăng nhập (Không thể đổi)</label>
                    <input
                      value={userData?.Username}
                      disabled
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 outline-none text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={profileForm.formState.isSubmitting}
                      className="px-8 py-3 bg-primary hover:bg-primary/80 rounded-2xl text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {profileForm.formState.isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : activeTab === 'security' ? (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 rounded-[2rem] h-full">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 underline decoration-primary underline-offset-8">
                  <Lock size={20} className="text-primary" /> Thiết lập bảo mật
                </h3>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground ml-1">Mật khẩu cũ</label>
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        {...passwordForm.register('oldPassword')}
                        type="password"
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                    {passwordForm.formState.errors.oldPassword && <p className="text-red-400 text-xs ml-1">{passwordForm.formState.errors.oldPassword.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Mật khẩu mới</label>
                        <input
                            {...passwordForm.register('newPassword')}
                            type="password"
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                            placeholder="Mật khẩu mới"
                        />
                        {passwordForm.formState.errors.newPassword && <p className="text-red-400 text-xs ml-1">{passwordForm.formState.errors.newPassword.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground ml-1">Xác nhận mật khẩu</label>
                        <input
                            {...passwordForm.register('confirmPassword')}
                            type="password"
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm text-white"
                            placeholder="Nhập lại mật khẩu mới"
                        />
                        {passwordForm.formState.errors.confirmPassword && <p className="text-red-400 text-xs ml-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-bold tracking-wider">
                      Lưu ý: Sau khi đổi mật khẩu thành công, bạn vẫn có thể tiếp tục phiên làm việc hiện tại. Hãy đảm bảo mật khẩu mới đủ mạnh (có chữ hoa, chữ thường và số).
                    </p>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={passwordForm.formState.isSubmitting}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {passwordForm.formState.isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
                <motion.div key="activity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 rounded-[2rem] h-full">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 underline decoration-primary underline-offset-8">
                            <History size={20} className="text-primary" /> Nhật ký hoạt động cá nhân
                        </h3>
                        <button onClick={fetchActivity} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                            <Loader2 className={isLoadingActivity ? 'animate-spin' : ''} size={18} />
                        </button>
                    </div>

                    {isLoadingActivity ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-primary" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Đang truy xuất nhật ký...</p>
                        </div>
                    ) : activityLogs.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground opacity-30">
                            <History size={48} />
                            <p className="text-sm font-bold">Chưa có hoạt động nào được ghi lại.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                            {activityLogs.map((log) => (
                                <div key={log.Id} className="relative pl-12 group">
                                    <div className="absolute left-0 top-1 w-[36px] h-[36px] rounded-full bg-black/40 border border-white/10 flex items-center justify-center z-10 group-hover:border-primary/50 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="glass-card p-4 rounded-2xl group-hover:bg-white/5 transition-all">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{log.Module}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">{new Date(log.CreatedAt).toLocaleString()}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                            {log.Action} 
                                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{log.Description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <p className="text-[10px] text-muted-foreground text-center uppercase font-bold tracking-widest italic leading-relaxed">
                            Nhật ký hiển thị 10 hành động gần nhất của bạn để đảm bảo tính minh bạch và bảo mật tài khoản.
                        </p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
