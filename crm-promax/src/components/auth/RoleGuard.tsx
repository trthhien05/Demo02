'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: number[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/profile')).data,
    staleTime: 60000 // Cache profile for 1 minute
  });

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const userRole = profile?.role ?? -1;

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">TRUY CẬP BỊ CHẶN</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Bạn không có đủ quyền hạn để truy cập vào phân vùng này. Vui lòng liên hệ Quản trị viên nếu đây là một sự nhầm lẫn.
        </p>
        <Link 
          href="/admin" 
          className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Quay lại Trang chủ
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
