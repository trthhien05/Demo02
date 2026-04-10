'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự."),
  password: z.string().min(5, "Mật khẩu phải có ít nhất 5 ký tự."),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false
    }
  });

  useEffect(() => {
    // Load saved username if Remember Me was previously checked
    const savedUsername = localStorage.getItem('promax_remembered_username');
    if (savedUsername) {
      setValue('username', savedUsername);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await apiClient.post('/auth/login', {
        username: data.username,
        password: data.password,
      });

      // Lưu in-memory Access Token
      setAuth(res.data.Token);

      // Xử lý Remember Me (chỉ lưu Username cho lần sau)
      if (data.rememberMe) {
        localStorage.setItem('promax_remembered_username', data.username);
      } else {
        localStorage.removeItem('promax_remembered_username');
      }
      
      toast.success('Đăng nhập thành công!', {
         description: 'Đang chuẩn bị không gian làm việc...',
      });

      router.push('/admin');
    } catch (error: any) {
      toast.error('Đăng nhập thất bại', {
        description: error.response?.data?.Message || 'Vui lòng kiểm tra lại thông tin hoặc thử lại sau.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background Decor VIP */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10 mx-4"
      >
        <div className="glass p-10 rounded-[2.5rem] shadow-2xl border-white/10 relative overflow-hidden bg-background/40">
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6 group cursor-pointer hover:shadow-primary/50 transition-all">
              <UtensilsCrossed size={32} className="text-white group-hover:rotate-12 transition-transform" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">PROMAX <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">RMS</span></h1>
            <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mt-2">Secure Gateway</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                <input
                  {...register('username')}
                  type="text"
                  placeholder="Username"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white"
                  disabled={isSubmitting}
                />
              </div>
              <AnimatePresence>
                {errors.username && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-400 text-xs pl-2 pt-1">{errors.username.message}</motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                <input
                  {...register('password')}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-400 text-xs pl-2 pt-1">{errors.password.message}</motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    className="appearance-none w-4 h-4 rounded border border-white/20 bg-black/20 checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-white opacity-0 pointer-events-none transition-opacity peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0 /* CSS trick to show SVG path usually handled via tailwind peer */ }}>
                     <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {/* Custom Check Icon overlay since default appearance-none removes it */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 [&_~_input:checked+div]:opacity-100">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                       <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-white transition-colors font-medium">Remember me</span>
              </label>
              <Link href="/admin/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">Forgot Password?</Link>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting}
              className="w-full relative group overflow-hidden rounded-2xl p-[2px] mt-6 block"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-background/50 backdrop-blur-md rounded-[14px] py-4 flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors">
                {isSubmitting ? (
                  <Loader2 className="animate-spin text-white" size={20} />
                ) : (
                  <>
                    <span className="font-bold text-white tracking-wide">Authenticate</span>
                    <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </motion.button>
          </form>

          {/* Footer Warning */}
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest mt-8 flex items-center justify-center gap-2">
            <Lock size={10} /> Protected by 256-bit encryption
          </p>
        </div>
      </motion.div>
    </div>
  );
}
