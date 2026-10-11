"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check, Server } from "lucide-react";

interface GuildItem {
  id: string;
  name: string;
  icon: string | null;
  main: boolean;
}

/** Server-Auswahl im Dashboard (Multi-Guild). Bei nur einem Server: nur Anzeige des Namens. */
export default function GuildSwitcher({ fallbackName }: { fallbackName: string }) {
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/guild")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        setGuilds(j.guilds || []);
        setActive(j.active || null);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = guilds.find((g) => g.id === active);
  const name = current?.name || fallbackName;

  async function select(id: string) {
    if (id === active) return setOpen(false);
    setBusy(true);
    const res = await fetch("/api/guild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId: id }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.reload();
    } else {
      setBusy(false);
      setOpen(false);
    }
  }

  if (guilds.length <= 1) {
    return <p className="text-xs text-gray-400 truncate">{name}</p>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        title="Server wechseln"
        className="mt-0.5 flex items-center gap-1 max-w-full text-xs text-gray-300 hover:text-white bg-discord-card border border-discord-border hover:border-gray-500 rounded-md px-1.5 py-0.5 transition-colors disabled:opacity-50"
      >
        <span className="truncate">{name}</span>
        <ChevronsUpDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-discord-border bg-discord-dark shadow-2xl p-1.5">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Server wechseln</p>
          {guilds.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => select(g.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                g.id === active ? "bg-discord-blurple/15 text-white" : "text-gray-300 hover:bg-discord-card hover:text-white"
              }`}
            >
              {g.icon ? (
                <img src={g.icon} alt="" className="w-6 h-6 rounded-md shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-md bg-discord-card flex items-center justify-center shrink-0">
                  <Server className="w-3.5 h-3.5 text-gray-400" />
                </span>
              )}
              <span className="flex-1 truncate">{g.name}</span>
              {g.main && <span className="text-[9px] text-amber-400">Haupt</span>}
              {g.id === active && <Check className="w-3.5 h-3.5 text-discord-green shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
