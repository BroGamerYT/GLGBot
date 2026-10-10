import fs from "fs";
import path from "path";
import { TextChannel, Message, Guild, AttachmentBuilder, User } from "discord.js";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSCRIPTS_DIR = path.join(DATA_DIR, "transcripts");

if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export interface TranscriptMetadata {
  channelName: string;
  channelId: string;
  guildName: string;
  guildId: string;
  guildIcon?: string | null;
  creatorTag: string;
  creatorId: string;
  closedByTag?: string;
  closedById?: string;
  createdAt: string;
  closedAt: string;
}

export interface FormattedMessage {
  id: string;
  authorId: string;
  authorTag: string;
  authorAvatar: string;
  isBot: boolean;
  time: string;
  timestamp: number;
  content: string;
  embeds: Array<{
    title?: string;
    url?: string;
    description?: string;
    color?: string;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: string;
    author?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
  }>;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    isImage: boolean;
  }>;
}

export class TranscriptService {
  /**
   * Lädt alle Nachrichten aus einem TextChannel (auch über 100 hinaus mittels Pagination)
   */
  public async fetchAllMessages(channel: TextChannel, maxMessages = 500): Promise<Message[]> {
    const allMessages: Message[] = [];
    let lastId: string | undefined;

    while (allMessages.length < maxMessages) {
      const options: { limit: number; before?: string } = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options).catch(() => null);
      if (!batch || batch.size === 0) break;

      allMessages.push(...batch.values());
      lastId = batch.last()?.id;

      if (batch.size < 100) break;
    }

    // Chronologisch sortieren (älteste zuerst)
    return allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  }

  /**
   * Ersetzt rohe Discord-Mentions (<@id>, <#id>, <@&id>) durch lesbare Namen
   */
  public resolveMentions(text: string, guild?: Guild | null, messages: Message[] = []): string {
    if (!text) return "";

    // 1. User Mentions: <@12345> oder <@!12345>
    text = text.replace(/<@!?(\d+)>/g, (match, id) => {
      if (guild) {
        const mem = guild.members.cache.get(id);
        if (mem) return `@${mem.displayName || mem.user.username}`;
      }
      const foundMsg = messages.find((m) => m.author.id === id);
      if (foundMsg) return `@${foundMsg.author.username}`;
      return match;
    });

    // 2. Channel Mentions: <#12345>
    text = text.replace(/<#(\d+)>/g, (match, id) => {
      if (guild) {
        const ch = guild.channels.cache.get(id);
        if (ch) return `#${ch.name}`;
      }
      return match;
    });

    // 3. Role Mentions: <@&12345>
    text = text.replace(/<@&(\d+)>/g, (match, id) => {
      if (guild) {
        const role = guild.roles.cache.get(id);
        if (role) return `@${role.name}`;
      }
      return match;
    });

    return text;
  }

  /**
   * Bereitet Nachrichten strukturiert auf
   */
  public formatMessages(messages: Message[], guild?: Guild | null): FormattedMessage[] {
    return messages.map((m) => {
      const author = m.author;
      const avatarUrl = author.displayAvatarURL({ size: 64, extension: "png" });

      const resolvedContent = this.resolveMentions(m.content, guild, messages);

      const embeds = m.embeds.map((emb) => {
        let hexColor = "#5865f2";
        if (emb.color) {
          hexColor = `#${emb.color.toString(16).padStart(6, "0")}`;
        }
        return {
          title: emb.title || undefined,
          url: emb.url || undefined,
          description: emb.description ? this.resolveMentions(emb.description, guild, messages) : undefined,
          color: hexColor,
          fields: emb.fields.map((f) => ({
            name: f.name,
            value: this.resolveMentions(f.value, guild, messages),
            inline: f.inline,
          })),
          footer: emb.footer?.text || undefined,
          author: emb.author?.name || undefined,
          thumbnailUrl: emb.thumbnail?.url || undefined,
          imageUrl: emb.image?.url || undefined,
        };
      });

      const attachments = m.attachments.map((att) => {
        const isImage = (att.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(att.name || "")) ?? false;
        return {
          name: att.name || "Datei",
          url: att.url,
          size: att.size,
          isImage,
        };
      });

      const date = new Date(m.createdTimestamp);
      const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      return {
        id: m.id,
        authorId: author.id,
        authorTag: author.tag || author.username,
        authorAvatar: avatarUrl,
        isBot: author.bot,
        time: timeStr,
        timestamp: m.createdTimestamp,
        content: resolvedContent,
        embeds,
        attachments,
      };
    });
  }

  /**
   * Generiert ein sauberes, vollständiges Text-Transkript (.txt)
   */
  public generateTextTranscript(meta: TranscriptMetadata, formattedMessages: FormattedMessage[]): string {
    const border = "=".repeat(70);
    const subBorder = "-".repeat(70);

    let txt = `${border}\n`;
    txt += `GERMANY LANGAME - TICKET TRANSKRIPT\n`;
    txt += `${border}\n`;
    txt += `Ticket-Kanal:     #${meta.channelName}\n`;
    txt += `Server:           ${meta.guildName} (${meta.guildId})\n`;
    txt += `Ticket-Ersteller: ${meta.creatorTag} (${meta.creatorId})\n`;
    if (meta.closedByTag) {
      txt += `Geschlossen von:  ${meta.closedByTag} (${meta.closedById || "N/A"})\n`;
    }
    txt += `Erstellt am:      ${meta.createdAt}\n`;
    txt += `Geschlossen am:   ${meta.closedAt}\n`;
    txt += `Nachrichten:      ${formattedMessages.length}\n`;
    txt += `${border}\n\n`;

    for (const msg of formattedMessages) {
      const botBadge = msg.isBot ? " [BOT]" : "";
      txt += `[${msg.time}] ${msg.authorTag} (${msg.authorId})${botBadge}:\n`;

      if (msg.content) {
        // Zeilen eingerückt
        const lines = msg.content.split("\n");
        for (const l of lines) {
          txt += `  ${l}\n`;
        }
      }

      // Embeds
      if (msg.embeds.length > 0) {
        for (const emb of msg.embeds) {
          txt += `  ┌── [EMBED] ${emb.title ? emb.title : "(Ohne Titel)"}\n`;
          if (emb.author) {
            txt += `  │ Autor: ${emb.author}\n`;
          }
          if (emb.description) {
            for (const dl of emb.description.split("\n")) {
              txt += `  │ ${dl}\n`;
            }
          }
          if (emb.fields.length > 0) {
            txt += `  │ Felder:\n`;
            for (const f of emb.fields) {
              txt += `  │   • ${f.name}: ${f.value.replace(/\n/g, " ")}\n`;
            }
          }
          if (emb.footer) {
            txt += `  │ Footer: ${emb.footer}\n`;
          }
          txt += `  └──\n`;
        }
      }

      // Anhänge
      if (msg.attachments.length > 0) {
        txt += `  [Anhänge]:\n`;
        for (const att of msg.attachments) {
          txt += `    • ${att.name} (${att.url})\n`;
        }
      }

      // Falls weder Text, noch Embeds, noch Anhänge vorhanden sind
      if (!msg.content && msg.embeds.length === 0 && msg.attachments.length === 0) {
        txt += `  (Kein Textinhalt / Interaktionsmeldung)\n`;
      }

      txt += `\n`;
    }

    txt += `${subBorder}\n`;
    txt += `ENDE DES TRANSKRIPTS - GermanyLanGame Support-System\n`;
    txt += `${border}\n`;

    return txt;
  }

  /**
   * Generiert ein modernes, interaktives HTML-Transkript im Discord Dark Theme
   */
  public generateHtmlTranscript(meta: TranscriptMetadata, formattedMessages: FormattedMessage[]): string {
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const renderMarkdown = (text: string): string => {
      let escaped = escapeHtml(text);
      // Code blocks ```code```
      escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="codeblock"><code>$1</code></pre>');
      // Inline code `code`
      escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
      // Bold **bold**
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      // Italic *italic*
      escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      // Mentions @User
      escaped = escaped.replace(/(@[a-zA-Z0-9_\-.]+)/g, '<span class="mention">$1</span>');
      // Channels #channel
      escaped = escaped.replace(/(#[a-zA-Z0-9_\-]+)/g, '<span class="channel-mention">$1</span>');
      // Line breaks
      escaped = escaped.replace(/\n/g, "<br>");
      return escaped;
    };

    const messagesHtml = formattedMessages
      .map((m) => {
        const botBadge = m.isBot ? '<span class="bot-badge">BOT</span>' : "";

        let contentBlock = "";
        if (m.content) {
          contentBlock = `<div class="message-content">${renderMarkdown(m.content)}</div>`;
        }

        let embedsBlock = "";
        if (m.embeds.length > 0) {
          embedsBlock = m.embeds
            .map((emb) => {
              const borderColor = emb.color || "#5865f2";
              const authorHtml = emb.author ? `<div class="embed-author">${escapeHtml(emb.author)}</div>` : "";
              const titleHtml = emb.title
                ? emb.url
                  ? `<div class="embed-title"><a href="${escapeHtml(emb.url)}" target="_blank">${escapeHtml(emb.title)}</a></div>`
                  : `<div class="embed-title">${escapeHtml(emb.title)}</div>`
                : "";
              const descHtml = emb.description ? `<div class="embed-desc">${renderMarkdown(emb.description)}</div>` : "";

              const fieldsHtml =
                emb.fields.length > 0
                  ? `<div class="embed-fields">${emb.fields
                      .map(
                        (f) =>
                          `<div class="embed-field ${f.inline ? "inline" : ""}">
                            <div class="field-name">${escapeHtml(f.name)}</div>
                            <div class="field-value">${renderMarkdown(f.value)}</div>
                          </div>`
                      )
                      .join("")}</div>`
                  : "";

              const footerHtml = emb.footer ? `<div class="embed-footer">${escapeHtml(emb.footer)}</div>` : "";

              const thumbHtml = emb.thumbnailUrl
                ? `<img src="${escapeHtml(emb.thumbnailUrl)}" class="embed-thumbnail" alt="" />`
                : "";

              const imageHtml = emb.imageUrl
                ? `<div class="embed-image-wrapper"><img src="${escapeHtml(emb.imageUrl)}" class="embed-image" alt="" /></div>`
                : "";

              return `
                <div class="embed" style="border-left-color: ${borderColor}">
                  <div class="embed-inner">
                    <div class="embed-content-wrap">
                      ${authorHtml}
                      ${titleHtml}
                      ${descHtml}
                      ${fieldsHtml}
                      ${imageHtml}
                      ${footerHtml}
                    </div>
                    ${thumbHtml}
                  </div>
                </div>
              `;
            })
            .join("");
        }

        let attachmentsBlock = "";
        if (m.attachments.length > 0) {
          attachmentsBlock = `
            <div class="attachments">
              ${m.attachments
                .map((att) => {
                  if (att.isImage) {
                    return `
                      <div class="attachment-image">
                        <a href="${escapeHtml(att.url)}" target="_blank">
                          <img src="${escapeHtml(att.url)}" alt="${escapeHtml(att.name)}" loading="lazy" />
                        </a>
                      </div>
                    `;
                  }
                  return `
                    <div class="attachment-file">
                      <span class="file-icon">📎</span>
                      <a href="${escapeHtml(att.url)}" target="_blank" class="file-name">${escapeHtml(att.name)}</a>
                      <span class="file-size">(${(att.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `;
        }

        if (!m.content && m.embeds.length === 0 && m.attachments.length === 0) {
          contentBlock = `<div class="message-content text-muted"><em>(Kein Textinhalt / Interaktions-Ereignis)</em></div>`;
        }

        return `
          <div class="message-row" id="msg-${m.id}">
            <img class="avatar" src="${escapeHtml(m.authorAvatar)}" alt="${escapeHtml(m.authorTag)}" />
            <div class="message-body">
              <div class="message-header">
                <span class="author-name">${escapeHtml(m.authorTag)}</span>
                ${botBadge}
                <span class="timestamp">${m.time}</span>
              </div>
              ${contentBlock}
              ${embedsBlock}
              ${attachmentsBlock}
            </div>
          </div>
        `;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transkript #${escapeHtml(meta.channelName)} | GermanyLanGame</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #313338;
      color: #dbdee1;
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.375rem;
      padding-bottom: 40px;
    }
    .header-bar {
      background-color: #1e1f22;
      border-bottom: 1px solid #2b2d31;
      padding: 20px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .guild-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #5865f2, #4752c4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
    }
    .ticket-title {
      color: #f2f3f5;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ticket-subtitle {
      color: #949ba4;
      font-size: 13px;
    }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12px;
    }
    .badge {
      background-color: #2b2d31;
      border: 1px solid #383a40;
      padding: 6px 10px;
      border-radius: 8px;
      color: #dbdee1;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge strong { color: #f2f3f5; }
    .chat-container {
      max-width: 1000px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-col;
      gap: 16px;
    }
    .message-row {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      border-radius: 8px;
      transition: background 0.1s ease;
    }
    .message-row:hover {
      background-color: #2e3035;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      background-color: #5865f2;
    }
    .message-body {
      flex: 1;
      min-width: 0;
    }
    .message-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    .author-name {
      color: #f2f3f5;
      font-weight: 600;
      font-size: 15px;
    }
    .bot-badge {
      background-color: #5865f2;
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .timestamp {
      color: #949ba4;
      font-size: 12px;
    }
    .message-content {
      color: #dbdee1;
      word-break: break-word;
      line-height: 1.4;
    }
    .text-muted { color: #80848e; }
    .mention, .channel-mention {
      background: rgba(88, 101, 242, 0.2);
      color: #c9cdfb;
      padding: 0 4px;
      border-radius: 3px;
      font-weight: 500;
    }
    .mention:hover {
      background: #5865f2;
      color: white;
    }
    .inline-code {
      background: #1e1f22;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 85%;
    }
    .codeblock {
      background: #1e1f22;
      padding: 10px;
      border-radius: 6px;
      margin-top: 6px;
      font-family: monospace;
      font-size: 13px;
      overflow-x: auto;
    }
    /* Embeds */
    .embed {
      background-color: #2b2d31;
      border-left: 4px solid #5865f2;
      border-radius: 4px;
      padding: 12px 16px;
      margin-top: 8px;
      max-width: 520px;
    }
    .embed-inner {
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }
    .embed-content-wrap {
      flex: 1;
      min-width: 0;
    }
    .embed-author {
      font-size: 12px;
      font-weight: 600;
      color: #f2f3f5;
      margin-bottom: 4px;
    }
    .embed-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .embed-title a {
      color: #00a8fc;
      text-decoration: none;
    }
    .embed-title a:hover {
      text-decoration: underline;
    }
    .embed-desc {
      font-size: 13px;
      color: #dbdee1;
      margin-bottom: 8px;
      line-height: 1.35;
    }
    .embed-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      margin-top: 6px;
    }
    .embed-field.inline {
      grid-column: span 1;
    }
    .field-name {
      font-size: 12px;
      font-weight: 700;
      color: #b5bac1;
      margin-bottom: 2px;
    }
    .field-value {
      font-size: 13px;
      color: #dbdee1;
    }
    .embed-thumbnail {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .embed-image-wrapper {
      margin-top: 10px;
    }
    .embed-image {
      max-width: 100%;
      max-height: 280px;
      border-radius: 6px;
    }
    .embed-footer {
      font-size: 11px;
      color: #949ba4;
      margin-top: 8px;
    }
    /* Attachments */
    .attachments {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .attachment-image img {
      max-width: 100%;
      max-height: 350px;
      border-radius: 8px;
      border: 1px solid #232428;
    }
    .attachment-file {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #2b2d31;
      border: 1px solid #383a40;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
    }
    .file-name {
      color: #00a8fc;
      text-decoration: none;
      font-weight: 500;
    }
    .file-name:hover {
      text-decoration: underline;
    }
    .file-size {
      color: #949ba4;
      font-size: 11px;
    }
    .footer-bar {
      text-align: center;
      color: #80848e;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #2b2d31;
    }
  </style>
</head>
<body>
  <header class="header-bar">
    <div class="header-left">
      <div class="guild-icon">GLG</div>
      <div>
        <h1 class="ticket-title">#${escapeHtml(meta.channelName)}</h1>
        <p class="ticket-subtitle">${escapeHtml(meta.guildName)} • Ticket-Support</p>
      </div>
    </div>
    <div class="header-meta">
      <div class="badge">Ersteller: <strong>${escapeHtml(meta.creatorTag)}</strong></div>
      ${meta.closedByTag ? `<div class="badge">Geschlossen von: <strong>${escapeHtml(meta.closedByTag)}</strong></div>` : ""}
      <div class="badge">Erstellt: <strong>${escapeHtml(meta.createdAt)}</strong></div>
      <div class="badge">Geschlossen: <strong>${escapeHtml(meta.closedAt)}</strong></div>
      <div class="badge">Nachrichten: <strong>${formattedMessages.length}</strong></div>
    </div>
  </header>

  <main class="chat-container">
    ${messagesHtml}
  </main>

  <footer class="footer-bar">
    Generiert von GermanyLanGame Bot • ${escapeHtml(meta.closedAt)}
  </footer>
</body>
</html>`;
  }

  /**
   * Speichert Text- und HTML-Transkript auf der Festplatte
   */
  public saveTranscripts(channelId: string, text: string, html: string): { textFile: string; htmlFile: string } {
    const textFile = path.join(TRANSCRIPTS_DIR, `${channelId}.txt`);
    const htmlFile = path.join(TRANSCRIPTS_DIR, `${channelId}.html`);

    fs.writeFileSync(textFile, text, "utf-8");
    fs.writeFileSync(htmlFile, html, "utf-8");

    return { textFile, htmlFile };
  }

  /**
   * Liest ein Transkript (Text oder HTML)
   */
  public getTranscript(channelId: string, format: "text" | "html" = "text"): string | null {
    const ext = format === "html" ? ".html" : ".txt";
    const filePath = path.join(TRANSCRIPTS_DIR, `${channelId}${ext}`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    return null;
  }
}

export const transcriptService = new TranscriptService();
