import { NextResponse } from "next/server";

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// One consistent JSON error shape for every API route.
export function fail(
  message: string,
  status: number,
  extra: { fieldErrors?: Record<string, string>; retryAfter?: number } = {}
) {
  return NextResponse.json(
    { error: message, fieldErrors: extra.fieldErrors },
    {
      status,
      headers: extra.retryAfter
        ? { "Retry-After": String(extra.retryAfter) }
        : undefined,
    }
  );
}
