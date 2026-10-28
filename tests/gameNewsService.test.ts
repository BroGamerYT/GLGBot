import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanNewsPlainText, decodeNewsBytes } from "../src/services/gameNewsService";

test("decodes legacy RSS encodings declared in the response charset", () => {
  const bytes = Buffer.from([0x47, 0x65, 0x72, 0xe4, 0x74, 0x65, 0x20, 0x6b, 0xf6, 0x6e, 0x6e, 0x65, 0x6e]);
  assert.equal(decodeNewsBytes(bytes, "application/rss+xml; charset=ISO-8859-1"), "Geräte können");
});

test("falls back to Windows-1252 when an undeclared RSS response has broken UTF-8", () => {
  const bytes = Buffer.from([0x47, 0x65, 0x72, 0xe4, 0x74, 0x65]);
  assert.equal(decodeNewsBytes(bytes), "Geräte");
});

test("decodes complete HTML entities and removes encoded markup from article summaries", () => {
  assert.equal(
    cleanNewsPlainText("&lt;p&gt;Große Updates &amp; Details: Ger&auml;te &gt; Treiber &lt;a href=&#34;https://example.com&#34;&gt;lesen&lt;/a&gt;&lt;/p&gt;"),
    "Große Updates & Details: Geräte > Treiber lesen"
  );
});