'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, KeyRound, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import Link from 'next/link';

// --- Schemas ---
const requestSchema = z.object({
  identifier: z.string().min(3, "Vui lòng nhập Username hoặc Email."),
});
type RequestFormValues = z.infer<typeof requestSchema>;

const resetSchema = z.object({
  token: z.string().length(6, "Mã xác nhận phải gồm 6 ký tự."),
  newPassword: z.string().min(5, "Mật khẩu tối thiểu 5 ký tự."),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu không khớp.",
  path: ["confirmPassword"]
});
type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');

  // Forms
  const reqForm = useForm<RequestFormValues>({ resolver: zodResolver(requestSchema) });
  const resetForm = useForm<ResetFormValues>({ resolver: zodResolver(resetSchema) });

  const onRequestSubmit = async (data: RequestFormValues) => {
    try {
      setIdentifier(data.identifier);
      const res = await apiClient.post('/auth/forgot-password', {
        identifier: data.identifier
      });
      
      toast.success('Đã nhận yêu cầu', { description: res.data.Message });
      setStep(2);
    } catch (error: any) {
      toast.error('Lỗi hệ thống', { description: 'Không thể kết nối đến máy chủ.' });
    }
  };

  const onResetSubmit = async (data: ResetFormValues) => {
    try {
      const res = await apiClient.post('/auth/reset-password', {
        token: data.token,
        password: data.newPassword
      });
      
      toast.success('Thành công', { description: res.data.Message });
      router.push('/admin/login');
    } catch (error: any) {
      toast.error('Lỗi xác nhận', { 
        description: error.response?.data?.Message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10 mx-4"
      >
        <div className="glass p-10 rounded-[2.5rem] shadow-2xl border-white/10 relative overflow-hidden bg-background/40">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6 relative group overflow-hidden">
               <ShieldCheck size={32} className="text-white z-10" />
               <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Khôi Phục <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Mật Khẩu</span></h1>
            <p className="text-xs text-muted-foreground font-bold mt-2 leading-relaxed">
               {step === 1 ? "Nhập tên đăng nhập hoặc Email để nhận mã khôi phục quyền truy cập." : `Nhập mã xác nhận và mật khẩu mới cho tài khoản ${identifier}.`}
            </p>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form key="step1" onSubmit={reqForm.handleSubmit(onRequestSubmit)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div className="space-y-1">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        {...reqForm.register('identifier')}
                        type="text" placeholder="Username / Email"
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white"
                        disabled={reqForm.formState.isSubmitting}
                      />
                    </div>
                    {reqForm.formState.errors.identifier && <p className="text-red-400 text-xs pl-2 pt-1">{reqForm.formState.errors.identifier.message}</p>}
                  </div>

                  <motion.button type="submit" disabled={reqForm.formState.isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full relative group overflow-hidden rounded-2xl p-[2px] mt-6 block">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-background/50 backdrop-blur-md rounded-[14px] py-4 flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors">
                      {reqForm.formState.isSubmitting ? <Loader2 className="animate-spin text-white" size={20} /> : (
                        <><span className="font-bold text-white tracking-wide">Yêu cầu cấp lại</span><ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </div>
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form key="step2" onSubmit={resetForm.handleSubmit(onResetSubmit)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div className="space-y-1">
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        {...resetForm.register('token')}
                        type="text" placeholder="Mã xác nhận (6 số)" maxLength={6}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white font-mono tracking-widest uppercase"
                        disabled={resetForm.formState.isSubmitting}
                      />
                    </div>
                    {resetForm.formState.errors.token && <p className="text-red-400 text-xs pl-2 pt-1">{resetForm.formState.errors.token.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <input
                      {...resetForm.register('newPassword')}
                      type="password" placeholder="Mật khẩu mới"
                      className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white"
                      disabled={resetForm.formState.isSubmitting}
                    />
                    {resetForm.formState.errors.newPassword && <p className="text-red-400 text-xs pl-2 pt-1">{resetForm.formState.errors.newPassword.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <input
                      {...resetForm.register('confirmPassword')}
                      type="password" placeholder="Xác nhận mật khẩu mới"
                      className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 px-4 outline-none focus:border-primary focus:bg-white/5 transition-all text-sm placeholder:text-muted-foreground/50 text-white"
                      disabled={resetForm.formState.isSubmitting}
                    />
                    {resetForm.formState.errors.confirmPassword && <p className="text-red-400 text-xs pl-2 pt-1">{resetForm.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <motion.button type="submit" disabled={resetForm.formState.isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full relative group overflow-hidden rounded-2xl p-[2px] mt-6 block">
                    <div className="absolute inset-0 bg-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-background/50 backdrop-blur-md rounded-[14px] py-4 flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors">
                      {resetForm.formState.isSubmitting ? <Loader2 className="animate-spin text-white" size={20} /> : (
                        <><span className="font-bold text-white tracking-wide">Đặt lại mật khẩu</span><ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </div>
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <Link href="/admin/login" className="inline-flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft size={14} /> Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
