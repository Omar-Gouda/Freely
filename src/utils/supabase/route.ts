import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export function createRouteHandlerClient(request: NextRequest) {
  const authResponse = NextResponse.next();

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => authResponse.cookies.set(name, value, options));
      }
    }
  });

  function applyCookies(response: NextResponse) {
    authResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    return response;
  }

  function json(body: unknown, init?: ResponseInit) {
    return applyCookies(NextResponse.json(body, init));
  }

  function redirect(url: string | URL, status?: number) {
    return applyCookies(NextResponse.redirect(url, status));
  }

  return { supabase, json, redirect };
}