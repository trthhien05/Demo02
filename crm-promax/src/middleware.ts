import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nếu truy cập vào /admin nhưng chưa ở trang login
  const isPublicAdminRoute = pathname === '/admin/login' || pathname === '/admin/forgot-password';

  if (pathname.startsWith('/admin') && !isPublicAdminRoute) {
    // Kiểm tra HttpOnly Cookie "refreshToken" do backend gửi về
    const hasRefreshToken = request.cookies.has('refreshToken');

    if (!hasRefreshToken) {
      // Chưa login hoặc hết hạn -> Redirect về trang login
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Nếu đã login mà cố tình vào /admin/login thì đẩy về dashboard
  if (pathname === '/admin/login') {
    const hasRefreshToken = request.cookies.has('refreshToken');
    if (hasRefreshToken) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
