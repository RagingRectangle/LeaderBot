var {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
var fs = require('fs');
var _ = require('lodash');
var mysql = require('mysql2');
var moment = require('moment-timezone');
var QuickChart = require('quickchart-js');
var config = require('../config/config.json');
var util = require('../util.json');


module.exports = {
  createHistoryGraph: async function createHistoryGraph(client, interaction) {
    await interaction.deferReply({
      ephemeral: true
    });
    var playerName = interaction.options.getString(config.trainerText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
    var historyType = interaction.options.getString(config.historyTypeText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
    var historyTimespan = interaction.options.getString(config.timespanText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
    var playerHistory = await this.fetchHistory(playerName, historyType, historyTimespan);
    if (playerHistory.length < 1){
      console.log(`Error: No history found for ${playerName}`);
      return;
    }
    playerHistory = _.reverse(playerHistory);

    //Limit points if needed
    //Remove duplicates
    if (playerHistory.length > 250) {
      var newHistory = [playerHistory[0], playerHistory[1]];
      for (var i = 2; i < playerHistory.length - 1; i++) {
        if (playerHistory[i][historyType] == newHistory[newHistory.length - 2][historyType]) {
          newHistory.pop();
          newHistory.push(playerHistory[i]);
        } else {
          newHistory.push(playerHistory[i]);
        }
      } //End of i loop
      newHistory.push(playerHistory[playerHistory.length - 1]);
      playerHistory = newHistory;
    }
    //Remove more if needed
    async function removeEveryOther(playerHistory, count) {
      var newHistory = [playerHistory[0]];
      for (var i = 2; i < playerHistory.length - 1;) {
        newHistory.push(playerHistory[i]);
        i = i + count;
      } //End of i loop
      newHistory.push(playerHistory[playerHistory[playerHistory.length - 1]]);
      return newHistory;
    } //End of removeEveryOther()

    //There's no way PoGo actually lasts this long
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    if (playerHistory.length > 500) {
      playerHistory = await removeEveryOther(playerHistory, 2);
    }
    //Narrow down the rest if needed
    if (playerHistory.length > 250) {
      var loseCount = newHistory.length - 249;
      for (var c = 1; c < loseCount; c++) {
        let randomCut = Math.floor(Math.random() * ((newHistory.length - 2) - 1 + 1)) + 1;
        newHistory.splice(randomCut, 1);
        newHistory = newHistory;
        playerHistory = newHistory;
      }
    }
    if (playerHistory == 'ERROR' || playerHistory.length == 0) {
      return;
    }
    var playerColor = playerHistory[0]['team'] == 1 ? 'blue' : playerHistory[0]['team'] == 2 ? 'red' : playerHistory[0]['team'] == 3 ? 'gold' : 'green';

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
              suggestedMin: historyData[0] * 0.999,
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
    await interaction.editReply({
      content: url,
      ephemeral: true
    }).catch(console.error);
  }, //End of createHistoryGraph()


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