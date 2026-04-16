'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import apiClient from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, _hasHydrated, setAuth, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Chỉ bắt đầu kiểm tra nếu Zustand đã Hydrated xong
    if (!_hasHydrated) return;

    let isMounted = true;

    const initializeAuth = async () => {
      // Đã có token trong RAM & LocalStorage -> Bỏ qua
      if (accessToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      // Mất Token trong RAM. Cố gắng dùng RefreshToken cookie bằng cách gọi API refresh.
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
  }, [_hasHydrated, accessToken, setAuth, clearAuth, router]);

  // Che màn hình lúc đang Refresh hoặc đang đợi Hydration
  if (!_hasHydrated || isInitializing) {
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
