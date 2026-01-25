import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value; // Role cookie uthayein
  const { pathname } = request.nextUrl;

  console.log(`Checking: ${pathname} | Role: ${role} | Token: ${token ? "Yes" : "No"}`);

  // 1. Agar login nahi hai aur kisi portal par jane ki koshish hai
  const protectedPaths = ['/admin', '/citizen', '/vehicle', '/office'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Role-Based Protection (SECURITY)
  // Agar koi Citizen admin page kholne ki koshish kare
  if (pathname.startsWith('/admin') && role !== 'Administrator') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (pathname.startsWith('/citizen') && role !== 'Citizen') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Isi tarah baki roles ke liye bhi...

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/citizen/:path*', '/vehicle/:path*', '/office/:path*'],
};