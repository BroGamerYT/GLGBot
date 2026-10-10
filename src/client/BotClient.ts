import { Client, ClientOptions, Collection, GatewayIntentBits } from "discord.js";
import { Command } from "../types";

export class BotClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();

  constructor(options?: ClientOptions) {
    super(
      options ?? {
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildPresences,
        ],
      }
    );
  }
}
