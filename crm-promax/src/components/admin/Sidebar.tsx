'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  UtensilsCrossed, 
  ChefHat,
  Settings, 
  LogOut,
  ChevronLeft,
  Package,
  CalendarDays,
  Tag,
  Loader2,
  ShieldCheck,
  Settings2,
  BarChart3,
  History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  { name: 'Tổng Quan', icon: LayoutDashboard, href: '/admin', roles: [0, 1, 2, 3, 4] },
  { name: 'Đơn Hàng', icon: ShoppingCart, href: '/admin/orders', roles: [0, 1, 2, 3, 4] },
  { name: 'Nhà Bếp', icon: ChefHat, href: '/admin/kitchen', roles: [0, 3] },
  { name: 'Phân Tích', icon: BarChart3, href: '/admin/reports', roles: [0] },
  { name: 'Nhật Ký', icon: History, href: '/admin/logs', roles: [0] },
  { name: 'Đặt Bàn', icon: CalendarDays, href: '/admin/reservations', roles: [0, 2, 4] },
  { name: 'Thực Đơn', icon: UtensilsCrossed, href: '/admin/menu', roles: [0, 3] },
  { name: 'Kho Hàng', icon: Package, href: '/admin/inventory', roles: [0, 3] },
  { name: 'Khách Hàng', icon: Users, href: '/admin/customers', roles: [0, 2] },
  { name: 'Khuyến Mãi', icon: Tag, href: '/admin/promotions', roles: [0] },
  { name: 'Nhân Sự', icon: ShieldCheck, href: '/admin/staff', roles: [0, 3] },
  { name: 'Cài Đặt', icon: Settings2, href: '/admin/settings', roles: [0] },
  { name: 'Tài Khoản', icon: Settings, href: '/admin/profile', roles: [0, 1, 2, 3, 4] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/profile')).data
  });

  const userRole = profile?.role ?? -1;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    } finally {
      clearAuth();
      toast.success('Đã đăng xuất thành công', { description: 'Hẹn gặp lại!' });
      setIsLoggingOut(false);
      router.push('/admin/login');
    }
  };

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "fixed left-0 top-0 h-screen transition-all duration-500 z-50",
        "bg-background/40 backdrop-blur-2xl border-r border-white/10",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full p-4">
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-10 px-2">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <UtensilsCrossed className="text-white" size={20} />
              </div>
              <span className="font-bold text-xl tracking-tighter title-gradient">PROMAX RMS</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground"
          >
            <ChevronLeft className={cn("transition-transform duration-500", isCollapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} prefetch={false}>
                <div className={cn(
                  "sidebar-item group relative",
                  isActive && "active"
                )}>
                  <item.icon className={cn(
                    "min-w-[20px] transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} size={20} />
                  
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="font-medium"
                    >
                      {item.name}
                    </motion.span>
                  )}

                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-[-16px] w-1 h-8 bg-primary rounded-r-full shadow-[4px_0_15px_rgba(139,92,246,0.5)]"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <div 
             onClick={handleLogout}
             className="sidebar-item text-red-400 hover:bg-red-500/10 cursor-pointer group transition-colors"
          >
             {isLoggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
             {!isCollapsed && <span className="font-medium">{isLoggingOut ? "Đang đăng xuất..." : "Đăng Xuất"}</span>}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
