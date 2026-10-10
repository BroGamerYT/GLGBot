import { LogIn, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  not_member: "Du bist kein Mitglied des Discord-Servers.",
  no_permission: "Dir fehlen die Rechte. Zugriff haben nur Owner, Admins und Mitglieder mit „Server verwalten“.",
  state: "Die Anmeldung ist abgelaufen oder ungültig. Bitte versuche es erneut.",
  token: "Discord hat die Anmeldung abgelehnt. Bitte versuche es erneut.",
  cancelled: "Die Anmeldung wurde abgebrochen.",
  config: "Das Dashboard ist nicht vollständig eingerichtet (CLIENT_ID, DISCORD_CLIENT_SECRET oder SESSION_SECRET fehlen in der .env).",
  config_error: "Der Bot konnte deine Rechte nicht prüfen (DISCORD_TOKEN / GUILD_ID prüfen).",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error ? ERRORS[searchParams.error] || "Unbekannter Fehler bei der Anmeldung." : null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-discord-dark border border-discord-border rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-tr from-discord-blurple to-indigo-400 flex items-center justify-center font-bold text-white text-lg">
          GLG
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">GLGBot Panel</h1>
          <p className="text-sm text-gray-400 mt-1">Melde dich mit Discord an, um fortzufahren.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-left text-sm bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-2 w-full bg-discord-blurple hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition-all"
        >
          <LogIn className="w-4 h-4" />
          Mit Discord anmelden
        </a>
      </div>
    </div>
  );
}
