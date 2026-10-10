const path = require("path");

// .env aus dem Bot-Hauptordner laden (DISCORD_TOKEN, CLIENT_ID, GUILD_ID, SESSION_SECRET, …)
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Branding aus der .env (siehe .env.example) - wird beim Build eingebunden
  env: {
    NEXT_PUBLIC_COMMUNITY_NAME: process.env.COMMUNITY_NAME || "",
    NEXT_PUBLIC_BOT_NAME: process.env.BOT_NAME || "",
    NEXT_PUBLIC_DASHBOARD_URL: process.env.DASHBOARD_URL || "",
  },
  images: {
    domains: ["cdn.discordapp.com"],
  },
};

module.exports = nextConfig;
