import { NextResponse } from "next/server";

/**
 * Weiterleitung aus Discord direkt in die Store-App.
 * Discord erlaubt in Buttons nur https-Links - diese Seite öffnet dann steam:// bzw. den Epic Launcher.
 * Öffentlich erreichbar (kein Login), baut aber nur Links aus geprüften IDs - keine offene Weiterleitung.
 *
 *   /go/steam/271590           -> steam://store/271590
 *   /go/epic/hogwarts-legacy   -> com.epicgames.launcher://store/p/hogwarts-legacy
 */

const TARGETS: Record<string, { pattern: RegExp; app: (id: string) => string; web: (id: string) => string; name: string }> = {
  steam: {
    pattern: /^\d{1,10}$/,
    app: (id) => `steam://store/${id}`,
    web: (id) => `https://store.steampowered.com/app/${id}/`,
    name: "Steam",
  },
  epic: {
    pattern: /^[a-z0-9-]{1,100}$/,
    app: (id) => `com.epicgames.launcher://store/p/${id}`,
    web: (id) => `https://store.epicgames.com/de/p/${id}`,
    name: "Epic Games Launcher",
  },
};

export function GET(_req: Request, { params }: { params: { store: string; id: string } }) {
  const target = TARGETS[params.store];
  const id = decodeURIComponent(params.id || "").toLowerCase();
  if (!target || !target.pattern.test(id)) {
    return new NextResponse("Ungültiger Link.", { status: 400 });
  }

  const app = target.app(id);
  const web = target.web(id);

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Öffne ${target.name} …</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0c10;color:#e5e7eb;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  .card{background:#161922;border:1px solid #252a37;border-radius:16px;padding:32px;max-width:380px;text-align:center}
  h1{font-size:18px;margin:0 0 8px;color:#fff} p{font-size:14px;color:#9ca3af;margin:0 0 20px}
  a{display:block;padding:11px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-top:10px}
  .app{background:#5865f2;color:#fff} .web{background:#0f1117;border:1px solid #252a37;color:#d1d5db}
</style></head>
<body><div class="card">
  <h1>🎮 Öffne ${target.name} …</h1>
  <p>Falls nichts passiert, ist die App nicht installiert. Dann einfach im Browser öffnen.</p>
  <a class="app" href="${app}">In ${target.name} öffnen</a>
  <a class="web" href="${web}">Im Browser öffnen</a>
</div>
<script>window.location.href = ${JSON.stringify(app)};</script>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
