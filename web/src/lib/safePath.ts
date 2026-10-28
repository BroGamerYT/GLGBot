/**
 * Prüft ein Weiterleitungs-Ziel und lässt nur Pfade auf der eigenen Seite durch.
 *
 * Hintergrund: "//fremde-seite.de" und "/\fremde-seite.de" beginnen zwar mit "/",
 * führen im Browser aber auf eine fremde Domain (protokoll-relative URL). Ohne diese
 * Prüfung ließen sich mit der echten Dashboard-Adresse Phishing-Links bauen.
 *
 * Rückgabe: der bereinigte interne Pfad, oder "" wenn das Ziel nicht sicher ist.
 */
export function safeInternalPath(raw: string | null | undefined): string {
  if (!raw) return "";
  let p = String(raw).trim();
  if (!p || !p.startsWith("/")) return "";
  if (p.startsWith("//") || p.startsWith("/\\")) return "";
  // Steuerzeichen (z. B. Zeilenumbrüche) entfernen
  p = p.replace(/[\u0000-\u001F\u007F]/g, "");
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return "";
  // Gegenprobe: das Ziel muss relativ bleiben
  try {
    const test = new URL(p, "https://intern.invalid");
    if (test.origin !== "https://intern.invalid") return "";
    return test.pathname + test.search + test.hash;
  } catch {
    return "";
  }
}
