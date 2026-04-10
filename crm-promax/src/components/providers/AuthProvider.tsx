'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import apiClient from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setAuth, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Đã có token trong RAM -> Bỏ qua
      if (accessToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      // Mất Token trong RAM (Có thể do F5). Cố gắng dùng RefreshToken cookie bằng cách gọi API refresh.
      try {
        const res = await apiClient.post('/auth/refresh');
        if (isMounted) {
          setAuth(res.data.Token);
          setIsInitializing(false);
        }
      } catch (error) {
        if (isMounted) {
          clearAuth();
          toast.error("Phiên đăng nhập đã hết hạn", { description: "Vui lòng đăng nhập lại." });
          router.push('/admin/login');
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [accessToken, setAuth, clearAuth, router]);

  // Che màn hình lúc đang Refresh tránh flicker giao diện
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase animate-pulse">
           Restoring Session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
