var {
  SlashCommandBuilder
} = require('discord.js');
var fs = require('fs');
var config = require('../config/config.json');
var Boards = require('../functions/boards.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.createLeaderboardCommand.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
    .setDescription('Create new leaderboard')
    .addSubcommand(subcommand =>
      subcommand
      .setName('all_time')
      .setDescription('Create all-time leaderboard'))
    .addSubcommand(subcommand =>
      subcommand
      .setName('daily')
      .setDescription('Create daily leaderboard'))
    .addSubcommand(subcommand =>
      subcommand
      .setName('total')
      .setDescription('Create total daily board')),

  async execute(client, interaction) {
    let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
    //let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
    if (config.adminIDs.includes(interaction.user.id)) {
      if (!config.database.leaderboard.host) {
        channel.send(`Leaderboard config not filled out.`).catch(console.error);
      } else if (!config.database.golbat.host) {
        channel.send(`Golbat config not filled out.`).catch(console.error);
      } else if (interaction.options.getSubcommand() === 'all_time') {
        Boards.createNewLeaderboard(interaction, 'all_time', 'new');
      } else if (interaction.options.getSubcommand() === 'daily') {
        Boards.createNewLeaderboard(interaction, 'daily', 'new');
      } else if (interaction.options.getSubcommand() === 'total') {
        Boards.createNewLeaderboard(interaction, 'total', 'new');
      }
    } else {
      interaction.reply({
        content: `You do not have required leaderboard perms.`,
        ephemeral: true
      }).catch(console.error);
    }
  },
};