var {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
var fs = require('fs');
var _ = require('lodash');
var mysql = require('mysql2');
var moment = require('moment-timezone');
var QuickChart = require('quickchart-js');
var config = require('../config/config.json');
var util = require('../util.json');


module.exports = {
  createHistoryGraph: async function createHistoryGraph(client, interaction, responseType) {
    var playerName = '';
    var historyType = '';
    var historyTimespan = '';

    //New message
    if (responseType == 'new') {
      await interaction.deferReply({
        ephemeral: false
      });
      playerName = interaction.options.getString(config.trainerText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
      historyType = interaction.options.getString(config.historyTypeText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
      historyTimespan = interaction.options.getString(config.timespanText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
    } //End of new

    //Change message
    else if (responseType == 'change') {
      var interactionIdSplit = interaction.customId.replace('leaderbot~change~', '').split('~');
      playerName = interactionIdSplit[0];
      historyTimespan = interactionIdSplit[1];
      historyType = await interaction.values[0];
    } //End of change

    var playerHistory = await this.fetchHistory(playerName, historyType, historyTimespan);
    if (playerHistory.length < 1 || playerHistory == 'ERROR') {
      console.log(`Error: No history found for ${playerName}`);
      return;
    }
    playerHistory = await _.reverse(playerHistory);

    //Single graph
    if (!historyType.includes(',')) {
      this.singleGraph(client, interaction, responseType, playerName, historyType, historyTimespan, playerHistory);
    }

    //Multi graph / Single axis
    let singleAxisTypes = ["xl_karps, xs_rats, pikachu_caught", "battles_won, gym_battles_won, trainings_won", "normal_raids_won, legendary_raids_won", "raid_achievements, raids_with_friends", "best_friends, best_buddies", "tiny_pokemon_caught, jumbo_pokemon_caught", "league_great_won, league_ultra_won, league_master_won"]
    if (singleAxisTypes.includes(historyType)) {
      this.multiGraphSingleAxis(interaction, responseType, playerName, historyType, historyTimespan, playerHistory);
    }

    //Multi graph / Multi axis
    let multiAxisTypes = ["evolved, mega_evos", "trades, trade_km", "grunts_defeated, giovanni_defeated", "hours_defended, berries_fed", "unique_stops_spun, unique_raid_bosses, unique_mega_evos", "gbl_rank, gbl_rating", "caught_all_types"]
    if (multiAxisTypes.includes(historyType)) {
      this.multiGraphMultiAxis(interaction, responseType, playerName, historyType, historyTimespan, playerHistory)
    }
  }, //End of createHistoryGraph()


  singleGraph: async function singleGraph(client, interaction, responseType, playerName, historyType, historyTimespan, playerHistory) {
    //Limit points if needed
    if (playerHistory.length > 250) {
      playerHistory = await this.limitPoints(playerHistory, historyType, 250);
    }
    var playerColor = playerHistory[0]['team'] == 1 ? '#1318B5' : playerHistory[0]['team'] == 2 ? '#B51313' : playerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';

    function getDate(i) {
      return moment(i).format(config.historyAxisFormat);
    }
    var labels = _.map(_.map(playerHistory, 'date'), getDate);
    var historyData = _.map(playerHistory, historyType);
    var historyChart = new QuickChart();
    historyChart.setConfig({
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: ``,
          data: historyData,
          fill: false,
          borderColor: playerColor,
          pointRadius: 0,
          yAxisID: 'left'
        }]
      },
      options: {
        title: {
          display: true,
          text: `${playerName} ${config.historyOptions[historyType]}`
        },
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            id: "left",
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              suggestedMin: Math.max((historyData[0] * 0.999), 0),
              suggestedMax: historyData[historyData.length - 1] * 1.001,
              fontColor: 'black',
              callback: (val) => {
                return val.toLocaleString();
              }
            }
          }],
        }
      }
    }); //End of setConfig()
    let url = await historyChart.getShortUrl();
    var listOptions = [];
    for (const [key, value] of Object.entries(config.historyTypes)) {
      if (value != '') {
        listOptions.push({
          label: value,
          value: util.historyTypes[key]
        });
      }
    }
    let reply = {
      embeds: [new EmbedBuilder().setImage(url).setColor(playerColor.replace('Blue','#1318B5'))],
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${playerName}~${historyTimespan}`).setOptions(listOptions))],
      ephemeral: false
    }
    if (responseType == 'new') {
      await interaction.editReply(reply).catch(console.error);
    } else if (responseType == 'change') {
      await interaction.message.edit(reply).catch(console.error);
      await interaction.deleteReply().catch(console.error);
    }
  }, //End of singleGraph()


  multiGraphSingleAxis: async function multiGraphSingleAxis(interaction, responseType, playerName, historyType, historyTimespan, playerHistory) {
    //"xl_karps, xs_rats, pikachu_caught", "normal_raids_won, legendary_raids_won", "raid_achievements, raids_with_friends", "best_friends, best_buddies","tiny_pokemon_caught, jumbo_pokemon_caught", "league_great_won, league_ultra_won, league_master_won"
    var playerColor = playerHistory[0]['team'] == 1 ? '#1318B5' : playerHistory[0]['team'] == 2 ? '#B51313' : playerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';
    //Limit points if needed
    var maxPointsPer = 125;
    if (historyType == "league_great_won, league_ultra_won, league_master_won" || historyType == "xl_karps, xs_rats, pikachu_caught") {
      maxPointsPer = 83;
    }
    var dataArray = [];
    let typeArray = historyType.split(', ');
    var labels = [];
    var minValue = 99999;
    var maxValue = 0;

    function getDate(i) {
      return moment(i).format(config.historyAxisFormat);
    }
    var colorList = ['Green', 'Gold', 'Red', 'Blue'];
    for (var t = 0; t < typeArray.length; t++) {
      let newHistory = await this.limitPoints(playerHistory, typeArray[t], maxPointsPer);
      labels = _.map(_.map(newHistory, 'date'), getDate);
      var thisData = _.map(newHistory, typeArray[t]);
      minValue = Math.min(thisData[0], minValue);
      maxValue = Math.max(thisData[thisData.length - 1], maxValue);
      dataArray.push({
        label: config.historyOptions[typeArray[t]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'left',
        borderColor: colorList.pop(),
      });
    } //End of t loop

    var historyChart = new QuickChart();
    historyChart.setConfig({
      type: 'line',
      data: {
        labels: labels,
        datasets: dataArray
      },
      options: {
        title: {
          display: true,
          text: `${playerName}`
        },
        legend: {
          display: true
        },
        scales: {
          yAxes: [{
            id: "left",
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              suggestedMin: Math.max((minValue * 0.999), 0),
              suggestedMax: maxValue * 1.001,
              fontColor: 'black',
              callback: (val) => {
                return val.toLocaleString();
              }
            }
          }],
        }
      }
    }); //End of setConfig()
    let url = await historyChart.getShortUrl();
    var listOptions = [];
    for (const [key, value] of Object.entries(config.historyTypes)) {
      if (value != '') {
        listOptions.push({
          label: value,
          value: util.historyTypes[key]
        });
      }
    }
    let reply = {
      embeds: [new EmbedBuilder().setImage(url).setColor(playerColor.replace('Blue','#1318B5'))],
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${playerName}~${historyTimespan}`).setOptions(listOptions))]
    }
    if (responseType == 'new') {
      await interaction.editReply(reply).catch(console.error);
    } else if (responseType == 'change') {
      await interaction.message.edit(reply).catch(console.error);
      await interaction.deleteReply().catch(console.error);
    }
  }, //End of multiGraphSingleAxis()


  multiGraphMultiAxis: async function multiGraphMultiAxis(interaction, responseType, playerName, historyType, historyTimespan, playerHistory) {
    //"evolved, mega_evos", "trades, trade_km", "grunts_defeated, giovanni_defeated", "hours_defended, berries_fed", "unique_stops_spun, unique_raid_bosses, unique_mega_evos", "gbl_rank, gbl_rating", "caught_all_types"
    var playerColor = playerHistory[0]['team'] == 1 ? '#1318B5' : playerHistory[0]['team'] == 2 ? '#B51313' : playerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';
    var optionsLeft = ["evolved", "trades", "grunts_defeated", "hours_defended", "unique_stops_spun", "gbl_rank"];
    var optionsRight = ["mega_evos", "trade_km", "giovanni_defeated", "berries_fed", "unique_raid_bosses", "unique_mega_evos", "gbl_rating"];
    var typeArray = historyType.split(', ');
    var leftTypes = [];
    var rightTypes = [];
    for (var t in typeArray) {
      if (optionsLeft.includes(typeArray[t])) {
        leftTypes.push(typeArray[t]);
      } else if (optionsRight.includes(typeArray[t])) {
        rightTypes.push(typeArray[t]);
      }
    }
    let maxPointsPer = Math.floor(250 / typeArray.length);
    var dataArrayLeft = [];
    var dataArrayRight = [];
    var labels = [];
    var minValueLeft = 99999;
    var minValueRight = 99999;
    var maxValueLeft = 0;
    var maxValueRight = 0;
    var leftList = [];
    var rightList = [];

    function getDate(i) {
      return moment(i).format(config.historyAxisFormat);
    }
    var colorList = ['Green', 'Gold', 'Red', 'Blue'];
    var colorEmoji = ['🟩', '🟨', '🟥', '🟦'];
    //Left data
    for (var l in leftTypes) {
      let newHistory = await this.limitPoints(playerHistory, leftTypes[l], maxPointsPer);
      labels = _.map(_.map(newHistory, 'date'), getDate);
      var thisData = _.map(newHistory, leftTypes[l]);
      minValueLeft = Math.min(thisData[0], minValueLeft);
      maxValueLeft = Math.max(thisData[thisData.length - 1], maxValueLeft);
      dataArrayLeft.push({
        label: config.historyOptions[leftTypes[l]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'left',
        borderColor: colorList.pop()
      });
      leftList.push(`${colorEmoji.pop()} ${config.historyOptions[leftTypes[l]]}`);
    } //End of l loop

    //Right data
    for (var r in rightTypes) {
      let newHistory = await this.limitPoints(playerHistory, rightTypes[r], maxPointsPer);
      labels = _.map(_.map(newHistory, 'date'), getDate);
      var thisData = _.map(newHistory, rightTypes[r]);
      minValueRight = Math.min(thisData[0], minValueRight);
      maxValueRight = Math.max(thisData[thisData.length - 1], maxValueRight);
      dataArrayRight.push({
        label: config.historyOptions[rightTypes[r]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'right',
        borderColor: colorList.pop()
      });
      rightList.push(`${colorEmoji.pop()} ${config.historyOptions[rightTypes[r]]}`);
    } //End of r loop

    let allDataArray = dataArrayLeft.concat(dataArrayRight);
    var historyChart = new QuickChart();
    historyChart.setConfig({
      type: 'line',
      data: {
        labels: labels,
        datasets: allDataArray
      },
      options: {
        title: {
          display: true,
          text: `${playerName}`
        },
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            id: "left",
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              suggestedMin: Math.max((minValueLeft * 0.999), 0),
              suggestedMax: maxValueLeft * 1.001,
              fontColor: 'black',
              callback: (val) => {
                return val.toLocaleString();
              }
            }
          }, {
            id: "right",
            type: "linear",
            display: true,
            position: "right",
            ticks: {
              suggestedMin: Math.max((maxValueRight * 0.999), 0),
              suggestedMax: maxValueRight * 1.001,
              fontColor: 'black',
              callback: (val) => {
                return val.toLocaleString();
              }
            }
          }],
        }
      }
    }); //End of setConfig()

    let url = await historyChart.getShortUrl();
    var listOptions = [];
    for (const [key, value] of Object.entries(config.historyTypes)) {
      if (value != '') {
        listOptions.push({
          label: value,
          value: util.historyTypes[key]
        });
      }
    }
    let reply = {
      content: '',
      embeds: [new EmbedBuilder().setImage(url).setColor(playerColor.replace('Blue','#1318B5')).addFields({
        name: `${config.leftAxis}:`,
        value: leftList.join('\n'),
        inline: true
      }, {
        name: `‎`,
        value: `‎`,
        inline: true
      }, {
        name: `${config.rightAxis}:`,
        value: rightList.join('\n'),
        inline: true
      })],
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${playerName}~${historyTimespan}`).setOptions(listOptions))]
    }

    try {
      if (responseType == 'new') {
        await interaction.editReply(reply).catch(console.error);
      } else if (responseType == 'change') {
        await interaction.message.edit(reply).catch(console.error);
        await interaction.deleteReply().catch(console.error);
      }
    } catch (err) {
      console.log(err);
    }
  }, //End of multiGraphMultiAxis()


  limitPoints: async function limitPoints(playerHistory, historyType, maxPoints) {
    if (playerHistory.length > maxPoints) {
      var lastPoint = playerHistory[playerHistory.length - 1];
      var newHistory = playerHistory;
      //Remove more if needed
      async function removeEveryOther(playerHistory, count) {
        var tempHistory = [playerHistory[0]];
        for (var i = 2; i < playerHistory.length - 1;) {
          tempHistory.push(playerHistory[i]);
          i = i + count;
        } //End of i loop
        tempHistory.push(playerHistory[playerHistory[playerHistory.length - 1]]);
        return tempHistory;
      } //End of removeEveryOther()
      for (var t = 0; t < 5; t++) {
        if (playerHistory.length > (maxPoints * 2)) {
          playerHistory = await removeEveryOther(playerHistory, 2);
        }
      } //End of t loop

      //Narrow down the rest if needed
      if (playerHistory.length > maxPoints) {
        var loseCount = newHistory.length - (maxPoints - 1);
        for (var c = 1; c < loseCount; c++) {
          let randomCut = Math.floor(Math.random() * ((newHistory.length - 2) - 1 + 1)) + 1;
          newHistory.splice(randomCut, 1);
          newHistory = newHistory;
          playerHistory = newHistory;
        }
      }

      //Add last point
      if (playerHistory[playerHistory.length - 1] != lastPoint) {
        if (playerHistory.length == maxPoints) {
          playerHistory.pop();
          playerHistory.push(lastPoint);
        }
      }
    } //End of > maxPoints
    return playerHistory;
  }, //End of limitPoints()


  fetchHistory: async function fetchHistory(playerName, historyType, historyTimespan) {
    let connection = mysql.createConnection(config.database.leaderboard);
    return new Promise((resolve, reject) => {
      connection.query(util.queries.playerHistory.replace('{{name}}', playerName).replace('{{limit}}', historyTimespan).replace('{{type}}', historyType).replace('{{limit}}', historyTimespan), (error, results) => {
        if (error) {
          connection.end();
          console.log(error)
          return resolve(`ERROR`);
        }
        connection.end();
        return resolve(results);
      });
    });
  }, //End of fetchHistory()


  updateTrainerList: async function updateTrainerList() {
    let connection = mysql.createConnection(config.database.leaderboard);
    return new Promise((resolve, reject) => {
      connection.query(util.queries.nameList, (error, results) => {
        if (error) {
          connection.end();
          console.log(error)
          return resolve(`ERROR`);
        }
        connection.end();
        let nameList = _.map(results, 'name')
        return resolve(nameList);
      });
    });
  } //End of updateTrainerList()
} //End of exports