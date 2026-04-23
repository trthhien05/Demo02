import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Bỏ qua kiểm tra Cookie ở Middleware vì trong môi trường Production (Cross-Domain), 
  // Next.js Server không thể đọc được HttpOnly Cookie được tạo ra từ Backend bên Render.
  // Giao phó toàn bộ bảo mật lại cho Axios Interceptors và Client-side AuthGuard.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
