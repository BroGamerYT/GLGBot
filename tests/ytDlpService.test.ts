import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isYouTubeChannelUrl,
  isYouTubeUrl,
  channelBaseUrl,
  extractVideoId,
} from "../src/utils/ytDlpService";

/**
 * Hintergrund: Ein Kanal-Link wurde wie ein Video behandelt. yt-dlp ist dann den
 * kompletten Kanal durchgegangen und lief in den Timeout
 * ("Timeout beim Laden des YouTube-Videos").
 */

test("Kanal-Links werden als Kanal erkannt", () => {
  const kanaele = [
    "https://www.youtube.com/channel/UCJPp8C9j1vIUWA4dSksfZ0g", // der Fall aus dem Log
    "https://www.youtube.com/channel/UCJPp8C9j1vIUWA4dSksfZ0g/videos",
    "https://www.youtube.com/@LofiGirl",
    "https://www.youtube.com/@LofiGirl/streams",
    "https://www.youtube.com/c/SomeCreator",
    "https://www.youtube.com/user/AlterKanal",
    "https://m.youtube.com/@Handy",
  ];
  for (const u of kanaele) {
    assert.equal(isYouTubeChannelUrl(u), true, `nicht als Kanal erkannt: ${u}`);
  }
});

test("Video-Links werden NICHT als Kanal behandelt", () => {
  const videos = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube.com/live/abcdefghijk", // /live/<id> ist ein konkretes Video
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/playlist?list=PLabc",
  ];
  for (const u of videos) {
    assert.equal(isYouTubeChannelUrl(u), false, `faelschlich als Kanal erkannt: ${u}`);
  }
});

test("Kanal-Reiter /live zählt als Kanal (landet auf dem laufenden Stream)", () => {
  // "/@name/live" ist ein Reiter des Kanals, kein fester Video-Link. Über den
  // Kanal-Weg wird erst der laufende Stream versucht und sonst das neueste Video -
  // das ist nachsichtiger, als direkt mit einem Fehler abzubrechen.
  assert.equal(isYouTubeChannelUrl("https://www.youtube.com/@LofiGirl/live"), true);
  assert.equal(channelBaseUrl("https://www.youtube.com/@LofiGirl/live"), "https://www.youtube.com/@LofiGirl");
});

test("Fremde Adressen bleiben unberührt", () => {
  for (const u of ["https://stream.laut.fm/rockantenne", "https://evil.com/youtube.com/channel/x", "kein-link"]) {
    assert.equal(isYouTubeChannelUrl(u), false, `faelschlich als Kanal erkannt: ${u}`);
  }
  assert.equal(isYouTubeUrl("https://evil.com/youtube.com/channel/x"), false);
});

test("Kanal-Basisadresse wird sauber abgeleitet", () => {
  const erwartet = "https://www.youtube.com/channel/UCJPp8C9j1vIUWA4dSksfZ0g";
  assert.equal(channelBaseUrl(erwartet), erwartet);
  assert.equal(channelBaseUrl(`${erwartet}/videos`), erwartet);
  assert.equal(channelBaseUrl(`${erwartet}/streams`), erwartet);
  assert.equal(channelBaseUrl(`${erwartet}/`), erwartet);
  assert.equal(channelBaseUrl("https://www.youtube.com/@LofiGirl/featured"), "https://www.youtube.com/@LofiGirl");
});

test("Video-ID-Erkennung bleibt unverändert", () => {
  assert.equal(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("https://www.youtube.com/channel/UCJPp8C9j1vIUWA4dSksfZ0g"), null);
});
