const path = require("path");

// .env aus dem Bot-Hauptordner laden (DISCORD_TOKEN, CLIENT_ID, GUILD_ID, SESSION_SECRET, …)
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["cdn.discordapp.com"],
  },
};

module.exports = nextConfig;
