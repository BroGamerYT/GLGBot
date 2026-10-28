/**
 * fontUtils.ts
 * Unicode-Schriftarten und Stil-Transformationen für Discord-Kanäle und Text.
 */

const SMALL_CAPS_MAP: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  ä: "ä", ö: "ö", ü: "ü", ß: "ss",
};

export function toSmallCaps(text: string): string {
  return text
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      return SMALL_CAPS_MAP[lower] || char;
    })
    .join("");
}

export function toBoldSans(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d5ee + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d5d4 + code - 65);
      }
      // 0-9
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1d7ec + code - 48);
      }
      return char;
    })
    .join("");
}

export function toGothic(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d586 + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d56c + code - 65);
      }
      return char;
    })
    .join("");
}

export function toDoubleStruck(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d552 + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        // C, H, N, P, Q, R, Z have special exceptions in unicode, but Math Alphanumeric handles most
        if (char === "C") return "ℂ";
        if (char === "H") return "ℍ";
        if (char === "N") return "ℕ";
        if (char === "P") return "ℙ";
        if (char === "Q") return "ℚ";
        if (char === "R") return "ℝ";
        if (char === "Z") return "ℤ";
        return String.fromCodePoint(0x1d538 + code - 65);
      }
      // 0-9
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1d7d8 + code - 48);
      }
      return char;
    })
    .join("");
}

export function toMonospace(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d688 + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d66e + code - 65);
      }
      // 0-9
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1d7f6 + code - 48);
      }
      return char;
    })
    .join("");
}

export function toBubble(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x24d0 + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x24b6 + code - 65);
      }
      // 1-9
      if (code >= 49 && code <= 57) {
        return String.fromCodePoint(0x2460 + code - 49);
      }
      if (char === "0") return "⓪";
      return char;
    })
    .join("");
}

export function toItalic(text: string): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      // h exception
      if (char === "h") return "ℎ";
      // a-z
      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(0x1d44e + code - 97);
      }
      // A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1d434 + code - 65);
      }
      return char;
    })
    .join("");
}

export interface ChannelStylePreset {
  id: string;
  name: string;
  description: string;
  formatText: (slug: string, icon?: string) => string;
  formatVoice: (slug: string, icon?: string) => string;
  formatCategory: (title: string, icon?: string) => string;
  sampleText: string;
  sampleVoice: string;
}

export const CHANNEL_STYLES: ChannelStylePreset[] = [
  {
    id: "modern",
    name: "Modern mit Emojis",
    description: "Klassisches Discord-Design mit passendem Emoji und Trennpunkt.",
    formatText: (slug, icon = "💬") => `${icon}・${slug.toLowerCase()}`,
    formatVoice: (slug, icon = "🔊") => `${icon}・${slug.toLowerCase()}`,
    formatCategory: (title, icon = "📁") => `${icon}・${title.toUpperCase()}`,
    sampleText: "💬・hauptchat",
    sampleVoice: "🔊・talk-1",
  },
  {
    id: "smallcaps",
    name: "Small Caps (Kleine Großbuchstaben)",
    description: "Trendiges, cleanes Design mit Unicode Small-Caps.",
    formatText: (slug, icon = "💬") => `${icon}・${toSmallCaps(slug)}`,
    formatVoice: (slug, icon = "🔊") => `${icon}・${toSmallCaps(slug)}`,
    formatCategory: (title, icon = "📁") => `${icon}・${toSmallCaps(title)}`,
    sampleText: "💬・ʜᴀᴜᴘᴛᴄʜᴀᴛ",
    sampleVoice: "🔊・ᴛᴀʟᴋ-1",
  },
  {
    id: "boldsans",
    name: "Bold Sans (Fett)",
    description: "Kräftige, moderne Sans-Serif Schrift mit hoher Sichtbarkeit.",
    formatText: (slug, icon = "💬") => `${icon}・${toBoldSans(slug)}`,
    formatVoice: (slug, icon = "🔊") => `${icon}・${toBoldSans(slug)}`,
    formatCategory: (title, icon = "📁") => `${icon}・${toBoldSans(title.toUpperCase())}`,
    sampleText: "💬・𝗵𝗮𝘂𝗽𝘁𝗰𝗵𝗮𝘁",
    sampleVoice: "🔊・𝘁𝗮𝗹𝗸-𝟭",
  },
  {
    id: "aesthetic_caps",
    name: "Aesthetic Small Caps",
    description: "Elegante Trennstriche kombiniert mit Small-Caps.",
    formatText: (slug) => `〢・${toSmallCaps(slug)}`,
    formatVoice: (slug) => `〢・${toSmallCaps(slug)}`,
    formatCategory: (title) => `〢・${toSmallCaps(title)}`,
    sampleText: "〢・ʜᴀᴜᴘᴛᴄʜᴀᴛ",
    sampleVoice: "〢・ᴛᴀʟᴋ-1",
  },
  {
    id: "aesthetic",
    name: "Aesthetic Pipe",
    description: "Elegantes Design mit stilvollen Symbolen.",
    formatText: (slug) => `〢・${slug.toLowerCase()}`,
    formatVoice: (slug) => `〢・${slug.toLowerCase()}`,
    formatCategory: (title) => `〢・${title.toUpperCase()}`,
    sampleText: "〢・hauptchat",
    sampleVoice: "〢・talk-1",
  },
  {
    id: "box_caps",
    name: "Boxed Small Caps",
    description: "Markante japanische Klammern mit Small-Caps.",
    formatText: (slug, icon = "💬") => `「${icon}」${toSmallCaps(slug)}`,
    formatVoice: (slug, icon = "🔊") => `「${icon}」${toSmallCaps(slug)}`,
    formatCategory: (title, icon = "📁") => `「${icon}」${toSmallCaps(title)}`,
    sampleText: "「💬」ʜᴀᴜᴘᴛᴄʜᴀᴛ",
    sampleVoice: "「🔊」ᴛᴀʟᴋ-1",
  },
  {
    id: "box",
    name: "Box & Bold",
    description: "Kräftige Rahmung mit Klammer-Symbolen.",
    formatText: (slug, icon = "💬") => `「${icon}」${slug.toLowerCase()}`,
    formatVoice: (slug, icon = "🔊") => `「${icon}」${slug.toLowerCase()}`,
    formatCategory: (title, icon = "📁") => `「${icon}」${title.toUpperCase()}`,
    sampleText: "「💬」hauptchat",
    sampleVoice: "「🔊」talk-1",
  },
  {
    id: "cyber",
    name: "Cyber & Neon",
    description: "Futuristischer Look mit Rauten-Symbolen und Small-Caps.",
    formatText: (slug) => `◈・${toSmallCaps(slug)}`,
    formatVoice: (slug) => `◈・${toSmallCaps(slug)}`,
    formatCategory: (title) => `◈・${toSmallCaps(title)}`,
    sampleText: "◈・ʜᴀᴜᴘᴛᴄʜᴀᴛ",
    sampleVoice: "◈・ᴛᴀʟᴋ-1",
  },
  {
    id: "gothic",
    name: "Gothic / Fraktur",
    description: "Dunkler, edler Fraktur-Look für Gaming und Clans.",
    formatText: (slug) => `⚔・${toGothic(slug)}`,
    formatVoice: (slug) => `⚔・${toGothic(slug)}`,
    formatCategory: (title) => `⚔・${toGothic(title)}`,
    sampleText: "⚔・𝖍𝖆𝖚𝖕𝖙𝖈𝖍𝖆𝖙",
    sampleVoice: "⚔・𝖙𝖆𝖑𝖐-1",
  },
  {
    id: "clean",
    name: "Clean & Minimalistisch",
    description: "Schlicht, aufgeräumt, ohne zusätzliche Emojis.",
    formatText: (slug) => slug.toLowerCase(),
    formatVoice: (slug) => slug.toLowerCase(),
    formatCategory: (title) => title.toUpperCase(),
    sampleText: "hauptchat",
    sampleVoice: "talk-1",
  },
];
