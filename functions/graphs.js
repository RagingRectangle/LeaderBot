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
    var trainerName = '';
    var trainer2Name = '';
    var historyType = '';
    var historyTimespan = '';

    //New message
    if (responseType == 'new') {
      await interaction.deferReply({
        ephemeral: false
      });
      trainerName = interaction.options.getString(config.trainerText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
      historyType = interaction.options.getString(config.historyTypeText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
      historyTimespan = interaction.options.getString(config.timespanText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));

      //Check if comparing
      if (interaction.options.getString(config.compareText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))) {
        trainer2Name = interaction.options.getString(config.compareText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'));
      }
    } //End of new

    //Change message
    else if (responseType == 'change') {
      var interactionIdSplit = interaction.customId.replace('leaderbot~change~', '').split('~');
      trainerName = interactionIdSplit[0];
      historyTimespan = interactionIdSplit[1];
      trainer2Name = interactionIdSplit[2];
      historyType = await interaction.values[0];
    } //End of change
    var trainerHistory = await this.fetchHistory(trainerName, historyType, historyTimespan);
    if (trainerHistory.length < 1 || trainerHistory == 'ERROR') {
      console.log(`Error: No history found for ${trainerName}`);
      return;
    }
    trainerHistory = await _.reverse(trainerHistory);

    //If 2nd trainer
    var trainer2History = '';
    if (trainer2Name) {
      trainer2History = await this.fetchHistory(trainer2Name, historyType, historyTimespan);
      if (trainer2History.length < 1 || trainer2History == 'ERROR') {
        console.log(`Error: No history found for ${trainer2Name}`);
        return;
      }
      trainer2History = await _.reverse(trainer2History);
    }

    //Check if same trainer entered
    if (trainerName == trainer2Name) {
      trainer2Name = '';
    }

    //Single graph
    if (!historyType.includes(',')) {
      this.singleGraph(client, interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History);
    }

    //Multi graph / Single axis
    let singleAxisTypes = ["xl_karps, xs_rats, pikachu_caught", "battles_won, gym_battles_won, trainings_won", "normal_raids_won, legendary_raids_won", "raid_achievements, raids_with_friends", "best_friends, best_buddies", "tiny_pokemon_caught, jumbo_pokemon_caught", "league_great_won, league_ultra_won, league_master_won"]
    if (singleAxisTypes.includes(historyType)) {
      this.multiGraphSingleAxis(interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History);
    }

    //Multi graph / Multi axis
    let multiAxisTypes = ["evolved, mega_evos", "trades, trade_km", "grunts_defeated, giovanni_defeated", "hours_defended, berries_fed", "unique_stops_spun, unique_raid_bosses, unique_mega_evos", "gbl_rank, gbl_rating", "caught_all_types"]
    if (multiAxisTypes.includes(historyType)) {
      this.multiGraphMultiAxis(interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History)
    }
  }, //End of createHistoryGraph()


  singleGraph: async function singleGraph(client, interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History) {
    function getDate(i) {
      return moment(i).format(config.historyAxisFormat);
    }
    var graphDatasets = [];
    var maxPoints = trainerHistory.length;
    if (trainer2Name) {
      maxPoints = Math.min(trainer2History.length, maxPoints);
    }

    //1st trainer
    //Limit points if needed
    if (trainerHistory.length > 250) {
      trainerHistory = await this.limitPoints(trainerHistory, historyType, 250);
    }
    var trainerColor = trainerHistory[0]['team'] == 1 ? '#1318B5' : trainerHistory[0]['team'] == 2 ? '#B51313' : trainerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';
    var labels = _.map(_.map(trainerHistory, 'date'), getDate);
    labels = labels.slice(-1 * maxPoints);
    var historyData = _.map(trainerHistory, historyType);
    historyData = historyData.slice(-1 * maxPoints);
    var graphMin = Math.max((historyData[0] * 0.999), 0);
    var graphMax = historyData[historyData.length - 1] * 1.001;
    var legend = false;
    var graphTitle = `${trainerName} ${config.historyOptions[historyType]}`;
    var trainer1Label = '';
    if (trainer2Name) {
      trainer1Label = trainerName;
    }
    graphDatasets.push({
      label: trainer1Label,
      data: historyData,
      fill: false,
      borderColor: trainerColor,
      pointRadius: 0,
      yAxisID: 'left'
    });

    //If 2nd trainer
    if (trainer2Name) {
      if (trainer2History.length > 250) {
        trainer2History = await this.limitPoints(trainer2History, historyType, 250);
      }
      var trainer2Color = trainer2History[0]['team'] == 1 ? '#1318B5' : trainer2History[0]['team'] == 2 ? '#B51313' : trainer2History[0]['team'] == 3 ? '#D4C618' : '#267505';
      var history2Data = _.map(trainer2History, historyType);
      history2Data = history2Data.slice(-1 * maxPoints);
      var graph2Min = Math.max((history2Data[0] * 0.999), 0);
      graphMin = Math.min(graphMin, graph2Min);
      var graph2Max = history2Data[history2Data.length - 1] * 1.001;
      graphMax = Math.max(graphMax, graph2Max);
      legend = true;
      graphTitle = config.historyOptions[historyType];
      graphDatasets.push({
        label: trainer2Name,
        data: history2Data,
        fill: false,
        borderColor: trainer2Color,
        borderDash: [5],
        pointRadius: 0,
        yAxisID: 'left'
      });
    } //End of 2nd trainer

    var historyChart = new QuickChart();
    historyChart.setConfig({
      type: 'line',
      data: {
        labels: labels,
        datasets: graphDatasets
      },
      options: {
        title: {
          display: true,
          text: graphTitle
        },
        legend: {
          display: legend
        },
        scales: {
          yAxes: [{
            id: "left",
            type: "linear",
            display: true,
            position: "left",
            ticks: {
              suggestedMin: graphMin,
              suggestedMax: graphMax,
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
      embeds: [new EmbedBuilder().setImage(url).setColor(trainer2Name == '' ? '#23272A' : trainerColor.replace('Blue', '#1318B5'))],
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${trainerName}~${historyTimespan}~${trainer2Name}`).setOptions(listOptions))],
      ephemeral: false
    }
    if (responseType == 'new') {
      await interaction.editReply(reply).catch(console.error);
    } else if (responseType == 'change') {
      await interaction.message.edit(reply).catch(console.error);
      await interaction.deleteReply().catch(console.error);
    }
  }, //End of singleGraph()


  multiGraphSingleAxis: async function multiGraphSingleAxis(interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History) {
    //"xl_karps, xs_rats, pikachu_caught", "normal_raids_won, legendary_raids_won", "raid_achievements, raids_with_friends", "best_friends, best_buddies","tiny_pokemon_caught, jumbo_pokemon_caught", "league_great_won, league_ultra_won, league_master_won"
    var trainerColor = trainerHistory[0]['team'] == 1 ? '#1318B5' : trainerHistory[0]['team'] == 2 ? '#B51313' : trainerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';
    var dataArray = [];
    let typeArray = historyType.split(', ');
    var labels = [];
    var minValue = 99999;
    var maxValue = 0;
    var maxPoints = trainerHistory.length;
    if (trainer2Name) {
      maxPoints = Math.min(trainer2History.length, maxPoints);
    }

    function getDate(i) {
      return moment(i).format(config.historyAxisFormat);
    }
    var colorList = ['Green', 'Gold', 'Red', 'Blue'];
    for (var t = 0; t < typeArray.length; t++) {
      let newHistory = await this.limitPoints(trainerHistory, typeArray[t], 250);
      labels = _.map(_.map(newHistory, 'date'), getDate);
      labels = labels.slice(-1 * maxPoints);
      var thisData = _.map(newHistory, typeArray[t]);
      thisData = thisData.slice(-1 * maxPoints);
      minValue = Math.min(thisData[0], minValue);
      maxValue = Math.max(thisData[thisData.length - 1], maxValue);
      var color = colorList.pop();
      dataArray.push({
        label: trainer2Name ? `${config.historyOptions[typeArray[t]]} (${trainerName})` : config.historyOptions[typeArray[t]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'left',
        borderColor: color
      });

      //If 2nd trainer
      if (trainer2Name) {
        let new2History = await this.limitPoints(trainer2History, typeArray[t], 250);
        var this2Data = _.map(new2History, typeArray[t]);
        this2Data = this2Data.slice(-1 * maxPoints);
        minValue = Math.min(this2Data[0], minValue);
        maxValue = Math.max(this2Data[this2Data.length - 1], maxValue);
        dataArray.push({
          label: `${config.historyOptions[typeArray[t]]} (${trainer2Name})`,
          data: this2Data,
          fill: false,
          pointRadius: 0,
          yAxisID: 'left',
          borderColor: color,
          borderDash: [5]
        });
      } //End of 2nd trainer


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
          text: trainer2Name ? `${trainerName} vs ${trainer2Name}` : trainerName
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
      embeds: [new EmbedBuilder().setImage(url).setColor(trainerColor.replace('Blue', '#1318B5'))],
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${trainerName}~${historyTimespan}~${trainer2Name}`).setOptions(listOptions))]
    }
    if (responseType == 'new') {
      await interaction.editReply(reply).catch(console.error);
    } else if (responseType == 'change') {
      await interaction.message.edit(reply).catch(console.error);
      await interaction.deleteReply().catch(console.error);
    }
  }, //End of multiGraphSingleAxis()


  multiGraphMultiAxis: async function multiGraphMultiAxis(interaction, responseType, trainerName, historyType, historyTimespan, trainerHistory, trainer2Name, trainer2History) {
    //"evolved, mega_evos", "trades, trade_km", "grunts_defeated, giovanni_defeated", "hours_defended, berries_fed", "unique_stops_spun, unique_raid_bosses, unique_mega_evos", "gbl_rank, gbl_rating", "caught_all_types"
    var trainerColor = trainerHistory[0]['team'] == 1 ? '#1318B5' : trainerHistory[0]['team'] == 2 ? '#B51313' : trainerHistory[0]['team'] == 3 ? '#D4C618' : '#267505';
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
    var maxPoints = trainerHistory.length;
    if (trainer2Name) {
      maxPoints = Math.min(trainer2History.length, maxPoints);
    }
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
      let newHistory = await this.limitPoints(trainerHistory, leftTypes[l], 250);
      labels = _.map(_.map(newHistory, 'date'), getDate);
      labels = labels.slice(-1 * maxPoints);
      var thisData = _.map(newHistory, leftTypes[l]);
      thisData = thisData.slice(-1 * maxPoints);
      minValueLeft = Math.min(thisData[0], minValueLeft);
      maxValueLeft = Math.max(thisData[thisData.length - 1], maxValueLeft);
      var color = colorList.pop();
      dataArrayLeft.push({
        label: config.historyOptions[leftTypes[l]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'left',
        borderColor: color
      });
      leftList.push(`${colorEmoji.pop()} ${config.historyOptions[leftTypes[l]]}`);

      //If 2nd trainer
      if (trainer2Name) {
        let new2History = await this.limitPoints(trainer2History, leftTypes[l], 250);
        var this2Data = _.map(new2History, leftTypes[l]);
        this2Data = this2Data.slice(-1 * maxPoints);
        minValueLeft = Math.min(this2Data[0], minValueLeft);
        maxValueLeft = Math.max(this2Data[this2Data.length - 1], maxValueLeft);
        dataArrayLeft.push({
          label: config.historyOptions[leftTypes[l]],
          data: this2Data,
          fill: false,
          pointRadius: 0,
          yAxisID: 'left',
          borderColor: color,
          borderDash: [5]
        });
      } //End of 2nd trainer
    } //End of l loop

    //Right data
    for (var r in rightTypes) {
      let newHistory = await this.limitPoints(trainerHistory, rightTypes[r], 250);
      var thisData = _.map(newHistory, rightTypes[r]);
      thisData = thisData.slice(-1 * maxPoints);
      minValueRight = Math.min(thisData[0], minValueRight);
      maxValueRight = Math.max(thisData[thisData.length - 1], maxValueRight);
      var color = colorList.pop();
      dataArrayRight.push({
        label: config.historyOptions[rightTypes[r]],
        data: thisData,
        fill: false,
        pointRadius: 0,
        yAxisID: 'right',
        borderColor: color
      });
      rightList.push(`${colorEmoji.pop()} ${config.historyOptions[rightTypes[r]]}`);

      //If 2nd trainer
      if (trainer2Name) {
        let new2History = await this.limitPoints(trainer2History, rightTypes[r], 250);
        var this2Data = _.map(new2History, rightTypes[r]);
        this2Data = this2Data.slice(-1 * maxPoints);
        minValueRight = Math.min(this2Data[0], minValueRight);
        maxValueRight = Math.max(this2Data[this2Data.length - 1], maxValueRight);
        dataArrayRight.push({
          label: config.historyOptions[rightTypes[r]],
          data: this2Data,
          fill: false,
          pointRadius: 0,
          yAxisID: 'right',
          borderColor: color,
          borderDash: [5]
        });
      } //End of 2nd trainer
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
          text: trainer2Name ? `${trainerName} (${config.solid ? config.solid : 'Solid'}) vs ${trainer2Name} (${config.dotted ? config.dotted : 'Dotted'})` : trainerName
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
      embeds: [new EmbedBuilder().setImage(url).setColor(trainerColor.replace('Blue', '#1318B5')).addFields({
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
      components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setPlaceholder(config.historyTypeDescription).setCustomId(`leaderbot~change~${trainerName}~${historyTimespan}~${trainer2Name}`).setOptions(listOptions))]
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


  limitPoints: async function limitPoints(trainerHistory, historyType, maxPoints) {
    if (trainerHistory.length > maxPoints) {
      var lastPoint = trainerHistory[trainerHistory.length - 1];
      var newHistory = trainerHistory;
      //Remove more if needed
      async function removeEveryOther(trainerHistory, count) {
        var tempHistory = [trainerHistory[0]];
        for (var i = 2; i < trainerHistory.length - 1;) {
          tempHistory.push(trainerHistory[i]);
          i = i + count;
        } //End of i loop
        tempHistory.push(trainerHistory[trainerHistory[trainerHistory.length - 1]]);
        return tempHistory;
      } //End of removeEveryOther()
      for (var t = 0; t < 5; t++) {
        if (trainerHistory.length > (maxPoints * 2)) {
          trainerHistory = await removeEveryOther(trainerHistory, 2);
        }
      } //End of t loop

      //Narrow down the rest if needed
      if (trainerHistory.length > maxPoints) {
        var loseCount = newHistory.length - (maxPoints - 1);
        for (var c = 1; c < loseCount; c++) {
          let randomCut = Math.floor(Math.random() * ((newHistory.length - 2) - 1 + 1)) + 1;
          newHistory.splice(randomCut, 1);
          newHistory = newHistory;
          trainerHistory = newHistory;
        }
      }

      //Add last point
      if (trainerHistory[trainerHistory.length - 1] != lastPoint) {
        if (trainerHistory.length == maxPoints) {
          trainerHistory.pop();
          trainerHistory.push(lastPoint);
        }
      }
    } //End of > maxPoints
    return trainerHistory;
  }, //End of limitPoints()


  fetchHistory: async function fetchHistory(trainerName, historyType, historyTimespan) {
    let connection = mysql.createConnection(config.database.leaderboard);
    return new Promise((resolve, reject) => {
      connection.query(util.queries.trainerHistory.replace('{{name}}', trainerName).replace('{{limit}}', historyTimespan).replace('{{type}}', historyType).replace('{{limit}}', historyTimespan), (error, results) => {
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