const {
  Client,
  GatewayIntentBits,
  Partials,
  InteractionType
} = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.DirectMessages],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
const fs = require('fs');
var schedule = require('node-schedule');
const config = require('./config/config.json');
const util = require('./util.json');
const SlashRegistry = require('./functions/slashRegistry.js');
const Boards = require('./functions/boards.js');
const Graphs = require('./functions/graphs.js');
var trainerList = [];

//Option check
if (Object.keys(config.historyOptions).length > 25) {
  console.log('ERROR: config.historyOptions can only contain a max of 25 options!');
  process.exit();
}

//Board check
if (!fs.existsSync('./config/boards.json')) {
  fs.writeFileSync('./config/boards.json', '{}');
}

//Client startup
client.on('ready', async () => {
  console.log("LeaderBot Logged In");
  SlashRegistry.registerCommands(client);
  trainerList = await Graphs.updateTrainerList();

  //Create board crons
  let boardConfig = require('./config/boards.json');
  for (const [msgID, boardData] of Object.entries(boardConfig)) {
    try {
      const boardJob = schedule.scheduleJob(msgID, boardData.updateInterval, function () {
        Boards.runLeaderboardCron(client, msgID);
      });
    } catch (err) {
      console.log(err);
    }
  } //End of board loop

  //Create name fetch cron
  for (const [msgID, boardData] of Object.entries(boardConfig)) {
    try {
      const boardJob = schedule.scheduleJob('nameFetcher', '59 0 * * *', async function () {
        trainerList = await Graphs.updateTrainerList() == 'ERROR' ? trainerList : Graphs.updateTrainerList();
      });
    } catch (err) {
      console.log(err);
    }
  } //End of board loop
}); //End of ready()


//Buttons and Lists
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.MessageComponent) {
    return;
  }
  if (interaction.message.guildId === null) {
    return;
  }
  if (interaction.message.author.id != client.user.id) {
    return;
  }
  let user = interaction.member;

  //Add Options
  if (interaction.customId.startsWith('leaderboard~addOption~')) {
    let newOption = interaction.values[0];
    if (newOption == 'finishLeaderboard') {
      Boards.addUpdateInterval(interaction);
    } else {
      Boards.addBoardOption(interaction, newOption);
    }
  } //End of options

  //Verify Board
  else if (interaction.customId == 'leaderboard~addInterval') {
    Boards.verifyLeaderboard(interaction);
  } //End of verify

  //Start Board
  else if (interaction.customId == 'leaderboard~start') {
    Boards.startLeaderboard(client, interaction);
  } //End of start

  //Cancel Board
  else if (interaction.customId == 'leaderboard~cancel') {
    Boards.cancelLeaderboard(client, interaction);
  } //End of start
}); //End of buttons/lists


//Slash commands
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    return;
  }
  let user = interaction.user;
  if (user.bot == true) {
    return;
  }
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return;
  }
  try {
    let slashReturn = await command.execute(client, interaction);
    try {
      if (slashReturn === 'delete') {
        await interaction.deleteReply().catch(console.error);
      }
    } catch (err) {}
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'There was an error while executing this command!',
      ephemeral: true
    }).catch(console.error);
  }
}); //End of slash commands


//AutoComplete
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;
  //Check if 'trainer'
  if (interaction.options._hoistedOptions[0]['name'] != config.trainerText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_')) return;
  let focusedValue = interaction.options.getFocused().toLowerCase();
  let filteredList = Object.values(trainerList).filter(choice => choice.toLowerCase().includes(focusedValue)).slice(0, 25);
  await interaction.respond(
    filteredList.map(choice => ({
      name: choice,
      value: choice
    }))
  ).catch(console.error);
}); //End of AutoComplete

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.login(config.token);