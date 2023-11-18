var {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
var fs = require('fs');
var mysql = require('mysql2');
var moment = require('moment-timezone');
var schedule = require('node-schedule');
var config = require('../config/config.json');
var util = require('../util.json');


module.exports = {
  createNewLeaderboard: async function createNewLeaderboard(interaction, type) {
    var leaderEmbed = new EmbedBuilder().setTitle(`Creating New Leaderboard:`).addFields({
      name: 'Leaderboard Type:',
      value: type
    });
    var leaderOptions = [];
    //Pokemon Options
    leaderOptions.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Pokemon Options').setCustomId(`leaderboard~addOption~addPokemon`).addOptions(util.options.pokemonOptions)));
    //Pokestop Options
    leaderOptions.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Pokestop Options').setCustomId(`leaderboard~addOption~addPokestop`).addOptions(util.options.pokestopOptions)));
    //Gym/Raid Options
    leaderOptions.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Gym/Raid Options').setCustomId(`leaderboard~addOption~addGymRaid`).addOptions(util.options.gymRaidOptions)));
    //Battle Options
    leaderOptions.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Battle Options').setCustomId(`leaderboard~addOption~addBattle`).addOptions(util.options.battleOptions)));
    //Other Options
    var leaderOptionList = util.options.otherOptions;
    if (type == 'total') {
      leaderOptionList.pop();
      leaderOptionList = leaderOptionList.concat(util.options.otherTotalOptions);
    }
    leaderOptions.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Other Options').setCustomId(`leaderboard~addOption~addOther`).addOptions(leaderOptionList)));
    await interaction.reply({
      content: `- Select options in the order you want them to appear.\n- Select 'Finish Leaderboard' in Other Options menu when done.`,
      embeds: [leaderEmbed],
      components: leaderOptions,
      ephemeral: true
    }).catch(console.error);
  }, //End of createNewLeaderboard()


  //Add option
  addBoardOption: async function addBoardOption(interaction, newOption) {
    let oldEmbed = interaction.message.embeds[0];
    var newEmbed = new EmbedBuilder().setTitle(oldEmbed.title).addFields(oldEmbed['fields'][0]);
    if (oldEmbed.fields.length == 1) {
      newEmbed.addFields({
        name: `Leaderboard Options:`,
        value: newOption
      });
    } else {
      let newOptionList = oldEmbed.fields[1]['value'].split('\n');
      if (!newOptionList.includes(newOption)) {
        newOptionList.push(newOption);
      }
      newEmbed.addFields({
        name: `Leaderboard Options:`,
        value: newOptionList.join('\n')
      });
    }
    await interaction.update({
      embeds: [newEmbed],
      components: interaction.message.components,
      ephemeral: true
    }).catch(console.error);
  }, //End of addBoardOption()


  //Update Interval
  addUpdateInterval: async function addUpdateInterval(interaction) {
    if (interaction.message.embeds[0]['fields'].length == 1) {
      return;
    }
    await interaction.update({
      content: ``,
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder('Select Update Interval').setCustomId(`leaderboard~addInterval`).addOptions(util.options.updateIntervals))],
      ephemeral: true
    }).catch(console.error);
  }, //End of addUpdateInterval()


  //Verify
  verifyLeaderboard: async function verifyLeaderboard(interaction) {
    let oldEmbed = interaction.message.embeds[0];
    var newEmbed = new EmbedBuilder().setTitle(oldEmbed.title).addFields(oldEmbed['fields']);
    newEmbed.addFields({
      name: `Update Interval:`,
      value: `${interaction.values[0]} Minutes`
    });
    await interaction.update({
      content: ``,
      embeds: [newEmbed],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Start').setCustomId(`leaderboard~start`).setStyle(ButtonStyle.Success), new ButtonBuilder().setLabel('Cancel').setCustomId(`leaderboard~cancel`).setStyle(ButtonStyle.Danger))],
      ephemeral: true
    }).catch(console.error);
  }, //End of verifyLeaderboard()


  //Start
  startLeaderboard: async function startLeaderboard(client, interaction) {
    var boardList = JSON.parse(fs.readFileSync('./config/boards.json'));
    let boardType = interaction.message.embeds[0]['fields'][0]['value'];
    //All-Time
    var boardTitle = config.allTimeLeaderTitle;
    //Daily
    if (boardType == 'daily') {
      boardTitle = config.dailyLeaderTitle;
    }
    //Daily
    else if (boardType == 'total') {
      boardTitle = config.totalLeaderTitle;
    }
    let intervalMinutes = interaction.message.embeds[0]['fields'][2]['value'].replace(' Minutes', '');
    var boardData = {};
    boardData.type = boardType;
    boardData.channelID = interaction.message.channel.id;
    boardData.title = boardTitle;
    boardData.options = interaction.message.embeds[0]['fields'][1]['value'].split('\n');
    boardData.updateInterval = `*/${intervalMinutes} * * * *`;

    await interaction.update({
      content: `Board will be created soon, dismiss this anytime or it will automatically delete later.`,
      embeds: [],
      components: [],
      ephemeral: true
    }).catch(console.error);

    await interaction.message.channel.send({
        embeds: [new EmbedBuilder().setTitle(boardTitle).setDescription(`Leaderboard will be created soon...`)]
      }).catch(console.error)
      .then(msg => {
        try {
          boardList[msg.id] = boardData;
          fs.writeFileSync('./config/boards.json', JSON.stringify(boardList));
          //Start cron job
          try {
            const boardJob = schedule.scheduleJob(msg.id, boardData.updateInterval, function () {
              module.exports.runLeaderboardCron(client, msg.id);
            });
          } catch (err) {
            console.log(err);
          }
          //Run first time
          module.exports.runLeaderboardCron(client, msg.id);
        } catch (err) {
          console.log(err)
        }
      });
  }, //End of startLeaderboard()


  //Cancel
  cancelLeaderboard: async function cancelLeaderboard(interaction) {
    await interaction.update({
      content: `Leaderboard cancelled, dismiss this anytime or it will automatically delete later.`,
      embeds: [],
      components: [],
      ephemeral: true
    }).catch(console.error);
  }, //End of cancelLeaderboard()


  runLeaderboardCron: async function runLeaderboardCron(client, messageID) {
    runQuery = (query) => {
      let connection = mysql.createConnection(config.database.golbat);
      return new Promise((resolve, reject) => {
        connection.query(query, (error, results) => {
          if (error) {
            connection.end();
            return reject(error);
          } else {
            connection.end();
            return resolve(results);
          }
        });
      });
    }; //End of runQuery

    let boardList = JSON.parse(fs.readFileSync('./config/boards.json'));
    var boardData;
    if (!boardList[messageID]) {
      console.log(`Leaderboard message ${messageID} not found in boards.json config.`);
      return;
    } else {
      boardData = boardList[messageID];
    }
    let boardChannel = await client.channels.cache.get(boardData.channelID);
    var boardMessage;
    try {
      boardMessage = await boardChannel.messages.fetch(messageID);
    } catch (err) {
      console.log(`Leaderboard message ${messageID} not found.`);
      return;
    }
    let footerFormat = `${config.footerDateFormat}, ${config.footerTimeFormat}`;
    let footerText = `${moment().add(config.timezoneOffsetHours, 'hours').format(footerFormat)}`;
    var leaderArray = [];

    for (var i in boardData.options) {
      //All-Time
      if (boardData.type == 'all_time') {
        let query = util.queries.allTimeLeaders.replaceAll('{{option}}', boardData.options[i]).replace('{{limit}}', config.allTimeUserLimit);
        leaderArray.push({
          option: config.historyOptions[boardData.options[i]],
          results: await runQuery(query)
        });
      }
      //Daily
      else if (boardData.type == 'daily') {
        let query = util.queries.dailyLeaders.replaceAll('{{option}}', boardData.options[i]).replace('{{golbatDB}}', config.database.golbat.database).replace('{{leaderboardDB}}', config.database.leaderboard.database).replace('{{limit}}', config.dailyUserLimit);
        leaderArray.push({
          option: config.historyOptions[boardData.options[i]],
          results: await runQuery(query)
        });
      }
      //Total
      else if (boardData.type == 'total') {
        var query;
        //Special player count queries
        if (boardData.options[i] == 'playersIncluded' || boardData.options[i] == 'newPlayersToday') {
          query = util.queries[boardData.options[i]].replaceAll('{{option}}', boardData.options[i]).replace('{{golbatDB}}', config.database.golbat.database).replace('{{leaderboardDB}}', config.database.leaderboard.database);
        }
        //Normal queries
        else {
          query = util.queries.totalDaily.replaceAll('{{option}}', boardData.options[i]).replace('{{golbatDB}}', config.database.golbat.database).replace('{{leaderboardDB}}', config.database.leaderboard.database);
        }
        leaderArray.push({
          option: config.historyOptions[boardData.options[i]],
          results: await runQuery(query)
        });
      }
    } //End of i loop

    var leaderEmbed = new EmbedBuilder().setTitle(boardData.title).setFooter({
      text: footerText
    });
    for (var a in leaderArray) {
      //Leader ranks
      if (boardData.type == 'all_time' || boardData.type == 'daily') {
        var leaderList = [];
        for (r = 0; r < leaderArray[a]['results'].length; r++) {
          leaderList.push(`${r + 1}: **${leaderArray[a]['results'][r]['name']}** (${Number(leaderArray[a]['results'][r]['value']).toLocaleString()})`);
        } //End of a loop
        leaderEmbed.addFields({
          name: leaderArray[a]['option'],
          value: leaderList.join('\n').replace('1:', config.firstPlace).replace('2:', config.secondPlace).replace('3:', config.thirdPlace),
          inline: false
        });
      }
      //Totals
      else if (boardData.type == 'total') {
        leaderEmbed.addFields({
          name: leaderArray[a]['option'],
          value: Number(leaderArray[a]['results'][0]['value']).toLocaleString(),
          inline: false
        });
      }
    } //End of a loop

    await boardMessage.edit({
      content: ``,
      embeds: [leaderEmbed]
    }).catch(console.error);
  } //End of runLeaderboardCron()
} //End of exports