import { Client, ClientOptions, Collection, GatewayIntentBits, Partials } from "discord.js";
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
          GatewayIntentBits.DirectMessages,
        ],
        partials: [
          Partials.Channel,
          Partials.Message,
          Partials.User,
          Partials.Reaction,
        ],
      }
    );
  }
}
