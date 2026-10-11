/**
 * PM2-Konfiguration (Docker oder direkt auf dem Server):
 *   pm2 start ecosystem.config.js   bzw. im Container: pm2-runtime ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: "discord-bot",
      script: "dist/index.js",
      cwd: __dirname,
      max_memory_restart: "600M",
      restart_delay: 5000,
    },
    {
      name: "discord-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname + "/web",
      max_memory_restart: "600M",
      restart_delay: 5000,
    },
  ],
};
