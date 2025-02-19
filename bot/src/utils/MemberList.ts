import * as Discord from 'discord.js';
import { Option, option } from 'ts-option';
import { env, Log } from '@sjbha/app';

const log = Log.make ('utils:member-list');

/**
 * Fetches members from an array of IDs, 
 * and then provides a lookup table for their nicknames
 */
export class MemberList {
  private constructor (
    private members: Discord.Collection<string, Discord.GuildMember>
  ) {}

  get = (discordId: string) : Option<Discord.GuildMember> => 
    option (this.members.get (discordId));

  nickname = (discordId: string, orDefault = 'unknown') : string =>
    option (this.members.get (discordId))
      .map (m => m.displayName)
      .getOrElse (() => {
        log.debug ('Unable to find display name for member', { discordId });
        return orDefault;
      });

  static fetch = async (client: Discord.Client, discordIds: string[]) : Promise<MemberList> => {
    try {
      const guild = await client.guilds.fetch (env.SERVER_ID);
      const members = await guild.members.fetch ({ user: discordIds });
      
      return new MemberList (members);
    }
    catch (e) {
      log.error ('Failed to fetch member list', e);
      return new MemberList (new Discord.Collection ());
    }
  }
}