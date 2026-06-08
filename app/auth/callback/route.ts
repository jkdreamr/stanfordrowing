import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Supabase OAuth with PKCE: the client-side supabase-js picks up the `code`
// from the URL and exchanges it for a session automatically. This route simply
// redirects to the login page so the client can complete the flow.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
