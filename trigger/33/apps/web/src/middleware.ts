import { NextRequest, NextResponse } from "next/server";

/** Rotas de autenticação / integrações que não exigem sessão. */
const PUBLIC = [
  "/login",
  "/aprovacao",
  "/api/aprovacao",
  "/api/health",
  "/api/auth/login",
  "/api/webhooks/focus",
  "/api/webhooks/inter",
];

/** Extensões servidas de `public/` — identidade visual, favicons, etc. */
const STATIC_ASSET =
  /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|txt|xml|map)$/i;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/brand/") ||
    STATIC_ASSET.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("orcamento_session")?.value;
  if (!token && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!token && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protege páginas e APIs; deixa passar assets estáticos e o otimizador
     * de imagem (necessário para a logo em /brand no login e no header).
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
