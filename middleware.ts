import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_IP = '210.217.92.1'

export function middleware(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : null

  if (ip !== ALLOWED_IP) {
    return new NextResponse('Access Denied', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
