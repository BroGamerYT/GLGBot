"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LogIn, ShieldAlert, KeyRound, Sparkles, ArrowRight, Loader2, Info } from "lucide-react";

const ERRORS: Record<string, string> = {
  not_member: "Du bist kein Mitglied des Discord-Servers.",
  no_permission: "Dir fehlen die Rechte für den Admin-Bereich.",
  state: "Die Anmeldung ist abgelaufen oder ungültig. Bitte versuche es erneut.",
  token: "Discord hat die Anmeldung abgelehnt. Bitte versuche es erneut.",
  cancelled: "Die Anmeldung wurde abgebrochen.",
  config: "Das Dashboard ist nicht vollständig eingerichtet.",
  config_error: "Der Bot konnte deine Rechte nicht prüfen (DISCORD_TOKEN / GUILD_ID prüfen).",
  revoked: "Du wurdest abgemeldet, weil deine Berechtigungen geändert wurden.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlError = searchParams.get("error");
  const codeParam = searchParams.get("code") || "";

  const [code, setCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(urlError ? ERRORS[urlError] || "Unbekannter Fehler." : "");

  const handleCodeLogin = async (inputCode?: string) => {
    const targetCode = (inputCode || code).trim();
    if (!targetCode) {
      setErrorMsg("Bitte gib deinen Login-Code ein.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/code-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Login fehlgeschlagen.");
        setLoading(false);
        return;
      }

      // Erfolgreich eingeloggt
      router.push(data.redirectUrl || "/economy");
      router.refresh();
    } catch {
      setErrorMsg("Netzwerkfehler beim Anmelden. Bitte erneut versuchen.");
      setLoading(false);
    }
  };

  // Automatischer Login, wenn der Code direkt über die URL übergeben wurde (z. B. Klick aus Discord)
  useEffect(() => {
    if (codeParam) {
      handleCodeLogin(codeParam);
    }
  }, [codeParam]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-discord-dark border border-discord-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-discord-blurple to-indigo-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-discord-blurple/25">
            GLG
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">GLGBot Panel & Shop</h1>
          <p className="text-sm text-gray-400">
            Melde dich an, um im Shop einzukaufen oder den Server zu verwalten.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 text-left text-sm bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3.5 animate-fadeIn">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Schneller Code-Login */}
        <div className="bg-discord-card border border-discord-border rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <KeyRound className="w-4 h-4 text-discord-blurple" />
            <span>Schnell-Login mit Code</span>
            <span className="text-[10px] uppercase font-bold bg-discord-blurple/20 text-discord-blurple px-1.5 py-0.5 rounded ml-auto">
              Empfohlen
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Tippe in Discord <code className="bg-discord-dark px-1.5 py-0.5 rounded text-gray-200">/web-login</code> oder <code className="bg-discord-dark px-1.5 py-0.5 rounded text-gray-200">/shop code</code> ein, um deinen persönlichen 30-Minuten Code zu erhalten.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCodeLogin();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="z. B. GLG-K7P2WD"
              disabled={loading}
              className="flex-1 bg-discord-dark border border-discord-border focus:border-discord-blurple text-white font-mono text-center tracking-wider text-base rounded-lg px-3 py-2 outline-none uppercase transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all text-sm shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Einloggen</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-discord-border w-full" />
          <span className="bg-discord-dark px-3 text-xs text-gray-400 font-medium uppercase tracking-wider absolute">
            oder
          </span>
        </div>

        {/* 2. Regulärer Discord OAuth2 Login */}
        <div className="space-y-3">
          <a
            href="/api/auth/login"
            className="flex items-center justify-center gap-2.5 w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 rounded-xl transition-all shadow-md shadow-[#5865F2]/20"
          >
            <LogIn className="w-4 h-4" />
            <span>Mit Discord-Konto verbinden</span>
          </a>
          <p className="text-[11px] text-center text-gray-500">
            Funktioniert für alle Server-Mitglieder (Shop) und Admins (Verwaltung).
          </p>
        </div>
      </div>
    </div>
  );
}
