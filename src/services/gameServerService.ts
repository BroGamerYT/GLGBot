import crypto from "crypto";
import dgram from "dgram";
import net from "net";
import { Client } from "discord.js";
import { GuildStore } from "../utils/guildStore";
import { moduleService } from "./moduleService";

/**
 * Game-Server-Status: fragt eigene Server regelmäßig ab.
 *   - minecraft: Minecraft Java "Server List Ping" (Spieler, Version, MOTD)
 *   - source:    Steam/Source A2S_INFO (CS2, CS:GO, Rust, ARK, Garry's Mod, TF2, Valheim …)
 *   - tcp:       nur "erreichbar?" über einen TCP-Port (z. B. TeamSpeak 10011/30033, Webseiten)
 */
export type GameServerType = "minecraft" | "source" | "tcp";

export interface GameServer {
  id: string;
  name: string;
  type: GameServerType;
  host: string;
  port: number;
  /** Adresse, die Spielern angezeigt wird (z. B. Domain statt LAN-IP) */
  displayAddress?: string;
}

export interface GameServerStatus {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  version?: string;
  motd?: string;
  map?: string;
  latency?: number;
  checkedAt: number;
  error?: string;
}

const store = new GuildStore<GameServer[]>("game_servers.json", () => []);
export const MAX_GAME_SERVERS = 10;
export const DEFAULT_PORTS: Record<GameServerType, number> = { minecraft: 25565, source: 27015, tcp: 10011 };

const TIMEOUT = 4000;

/** Technische Fehlermeldungen verständlich machen */
function friendlyError(msg: string): string {
  if (/ECONNREFUSED/.test(msg)) return "Port geschlossen / Server aus";
  if (/ENOTFOUND|EAI_AGAIN/.test(msg)) return "Adresse nicht gefunden";
  if (/EHOSTUNREACH|ENETUNREACH/.test(msg)) return "Server nicht erreichbar";
  if (/ECONNRESET/.test(msg)) return "Verbindung abgebrochen";
  return msg;
}

/* ---------------------------- Minecraft Java ---------------------------- */
function varInt(value: number) {
  const bytes: number[] = [];
  do {
    let b = value & 0x7f;
    value >>>= 7;
    if (value !== 0) b |= 0x80;
    bytes.push(b);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): [number, number] | null {
  let num = 0;
  let shift = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null;
    const b = buf[offset + i];
    num |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return [num, i + 1];
    shift += 7;
  }
  return null;
}

function motdText(desc: any): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  return [desc.text || "", ...(Array.isArray(desc.extra) ? desc.extra.map(motdText) : [])].join("");
}

export function queryMinecraft(host: string, port: number): Promise<Omit<GameServerStatus, "checkedAt">> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port });
    let data = Buffer.alloc(0);
    const done = (r: Omit<GameServerStatus, "checkedAt">) => {
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(TIMEOUT, () => done({ online: false, error: "Zeitüberschreitung" }));
    socket.on("error", (e) => done({ online: false, error: e.message }));
    socket.on("connect", () => {
      const hostBuf = Buffer.from(host, "utf8");
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);
      const handshake = Buffer.concat([varInt(0x00), varInt(767), varInt(hostBuf.length), hostBuf, portBuf, varInt(1)]);
      socket.write(Buffer.concat([varInt(handshake.length), handshake]));
      socket.write(Buffer.from([0x01, 0x00])); // Status-Anfrage
    });
    socket.on("data", (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);
      const len = readVarInt(data, 0);
      if (!len || data.length < len[0] + len[1]) return;
      try {
        let off = len[1];
        const id = readVarInt(data, off)!;
        off += id[1];
        const strLen = readVarInt(data, off)!;
        off += strLen[1];
        const json = JSON.parse(data.subarray(off, off + strLen[0]).toString("utf8"));
        done({
          online: true,
          players: json.players?.online ?? 0,
          maxPlayers: json.players?.max ?? 0,
          version: json.version?.name,
          motd: motdText(json.description).replace(/§./g, "").trim().slice(0, 120),
          latency: Date.now() - start,
        });
      } catch {
        done({ online: true, latency: Date.now() - start, error: "Antwort nicht lesbar" });
      }
    });
  });
}

/* ---------------------------- Source / A2S ---------------------------- */
function readCString(buf: Buffer, off: number): [string, number] {
  const end = buf.indexOf(0, off);
  const e = end === -1 ? buf.length : end;
  return [buf.subarray(off, e).toString("utf8"), e + 1];
}

export function querySource(host: string, port: number): Promise<Omit<GameServerStatus, "checkedAt">> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = dgram.createSocket("udp4");
    const base = Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff, 0x54]), Buffer.from("Source Engine Query\0", "latin1")]);
    let finished = false;
    const done = (r: Omit<GameServerStatus, "checkedAt">) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.close();
      resolve(r);
    };
    const timer = setTimeout(() => done({ online: false, error: "Zeitüberschreitung" }), TIMEOUT);
    socket.on("error", (e) => done({ online: false, error: e.message }));
    socket.on("message", (msg) => {
      const type = msg[4];
      if (type === 0x41) {
        // Challenge -> Anfrage mit Challenge wiederholen
        socket.send(Buffer.concat([base, msg.subarray(5, 9)]), port, host);
        return;
      }
      if (type !== 0x49) return done({ online: true, latency: Date.now() - start, error: "Unbekannte Antwort" });
      try {
        let off = 6; // Header (4) + Typ (1) + Protokoll (1)
        const [name, o1] = readCString(msg, off);
        const [map, o2] = readCString(msg, o1);
        const [, o3] = readCString(msg, o2); // Ordner
        const [game, o4] = readCString(msg, o3);
        off = o4 + 2; // App-ID
        const players = msg[off];
        const maxPlayers = msg[off + 1];
        done({ online: true, players, maxPlayers, map, motd: name.slice(0, 120), version: game, latency: Date.now() - start });
      } catch {
        done({ online: true, latency: Date.now() - start, error: "Antwort nicht lesbar" });
      }
    });
    socket.send(base, port, host);
  });
}

/* ---------------------------- TCP-Port ---------------------------- */
export function queryTcp(host: string, port: number): Promise<Omit<GameServerStatus, "checkedAt">> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port });
    const done = (r: Omit<GameServerStatus, "checkedAt">) => {
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(TIMEOUT, () => done({ online: false, error: "Zeitüberschreitung" }));
    socket.on("error", (e) => done({ online: false, error: e.message }));
    socket.on("connect", () => done({ online: true, latency: Date.now() - start }));
  });
}

class GameServerService {
  private status = new Map<string, GameServerStatus>(); // server-id -> Status
  private interval: NodeJS.Timeout | null = null;

  public list(guildId: string): GameServer[] {
    return store.get(guildId);
  }

  public getStatus(id: string): GameServerStatus | undefined {
    return this.status.get(id);
  }

  public save(guildId: string, input: any): { error: string } | { item: GameServer } {
    const name = String(input?.name || "").trim().slice(0, 60);
    const type: GameServerType = ["minecraft", "source", "tcp"].includes(input?.type) ? input.type : "minecraft";
    const host = String(input?.host || "").trim().toLowerCase();
    const port = Math.floor(Number(input?.port || DEFAULT_PORTS[type]));
    if (!name) return { error: "Bitte einen Namen angeben." };
    if (!/^[a-z0-9.-]{1,253}$/.test(host)) return { error: "Ungültige Adresse (nur Domain oder IP, ohne http:// und ohne Port)." };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: "Ungültiger Port (1–65535)." };
    const list = store.get(guildId);
    const existing = typeof input?.id === "string" ? list.find((s) => s.id === input.id) : undefined;
    if (!existing && list.length >= MAX_GAME_SERVERS) return { error: `Maximal ${MAX_GAME_SERVERS} Server.` };
    const item: GameServer = {
      id: existing?.id || crypto.randomBytes(5).toString("hex"),
      name,
      type,
      host,
      port,
      displayAddress: String(input?.displayAddress || "").trim().slice(0, 100) || undefined,
    };
    store.set(guildId, existing ? list.map((s) => (s.id === existing.id ? item : s)) : [...list, item]);
    this.status.delete(item.id);
    return { item };
  }

  public remove(guildId: string, id: string) {
    const list = store.get(guildId);
    const next = list.filter((s) => s.id !== id);
    if (next.length === list.length) return false;
    store.set(guildId, next);
    this.status.delete(id);
    return true;
  }

  public async check(server: GameServer): Promise<GameServerStatus> {
    const q = server.type === "minecraft" ? queryMinecraft : server.type === "source" ? querySource : queryTcp;
    const r = await q(server.host, server.port).catch((e) => ({ online: false, error: e?.message || String(e) }));
    const status = { ...r, error: r.error ? friendlyError(r.error) : undefined, checkedAt: Date.now() };
    this.status.set(server.id, status);
    return status;
  }

  public async checkGuild(guildId: string) {
    return Promise.all(this.list(guildId).map((s) => this.check(s).then((st) => ({ server: s, status: st }))));
  }

  /** Für den Statistik-Kanal: "online / gesamt" */
  public onlineCount(guildId: string) {
    const list = this.list(guildId);
    return { online: list.filter((s) => this.status.get(s.id)?.online).length, total: list.length };
  }

  public start(client: Client) {
    if (this.interval) return;
    const run = () => {
      for (const guildId of store.guildIds()) {
        if (!client.guilds.cache.has(guildId) || !moduleService.isEnabled(guildId, "gameServers")) continue;
        this.checkGuild(guildId).catch(() => null);
      }
    };
    setTimeout(run, 20_000);
    this.interval = setInterval(run, 2 * 60 * 1000);
  }
}

export const gameServerService = new GameServerService();
