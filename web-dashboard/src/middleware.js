import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;

  console.log(`Checking: ${pathname} | Role: ${role} | Token: ${token ? "Yes" : "No"}`);

  const protectedPaths = ['/admin', '/citizen', '/vehicle', '/office'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // 1. Not logged in → redirect to home
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Role based access
  if (pathname.startsWith('/admin') && role !== 'Administrator') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/citizen') && role !== 'Citizen') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/vehicle') && role !== 'Vehicle Staff') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/office') && role !== 'Office Staff') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/citizen/:path*', '/vehicle/:path*', '/office/:path*'],
};
