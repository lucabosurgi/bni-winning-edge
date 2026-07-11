import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const provided = decoded.slice(decoded.indexOf(":") + 1);
      if (provided === password) return NextResponse.next();
    } catch {}
  }

  return new NextResponse("Private preview — password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="BNI Winning Edge — private preview", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
