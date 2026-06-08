import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Skip middleware for favicon requests
  if (request.nextUrl.pathname === '/favicon.png') {
    return NextResponse.next();
  }

  const session = request.cookies.get("local_auth_session");
  const authRole = request.cookies.get("auth_role");
  const deviceConnected = request.cookies.get("device_connected");
  
  // Define public paths that don't require authentication
  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-in') || 
                     request.nextUrl.pathname.startsWith('/sign-up') ||
                     request.nextUrl.pathname.startsWith('/forgot-password');
                     
  const isConnectPage = request.nextUrl.pathname.startsWith('/connect-device');
                     
  // Always allow API routes so Raspberry Pi can sync attendance without web cookies
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Enforce connect device flow
  if (!deviceConnected && !isConnectPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/connect-device", request.url));
  }

  // If no session and trying to access a protected route
  if (!session && !isAuthPage && !isConnectPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // If already logged in and trying to access the login page
  if (session && isAuthPage) {
     return NextResponse.redirect(new URL("/", request.url));
  }

  // Prevent admin from accessing the attendance page (/addSubject)
  if (session && authRole?.value === "admin" && request.nextUrl.pathname.startsWith('/addSubject')) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Prevent non-admins (teachers) from accessing admin-only pages
  if (session && authRole?.value !== "admin" && request.nextUrl.pathname.startsWith('/enroll')) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
