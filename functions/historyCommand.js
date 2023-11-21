var {
  SlashCommandBuilder
} = require('discord.js');
var fs = require('fs');
var config = require('../config/config.json');
var util = require('../util.json');
var Graphs = require('../functions/graphs.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(config.trainerHistoryCommand.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
    .setDescription(config.trainerHistoryDescription)
    .addStringOption(option =>
      option.setName(config.trainerText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
      .setDescription(config.trainerDescription)
      .setRequired(true)
      .setAutocomplete(true))
    .addStringOption(option => {
      option.setName(config.historyTypeText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
        .setDescription(config.historyTypeDescription)
        .setRequired(true)
      for (const [key, value] of Object.entries(config.historyTypes)) {
        if (value != '') {
          option.addChoices({
            name: value,
            value: util.historyTypes[key]
          });
        }
      } //End of option loop
      return option;
    })
    .addStringOption(option =>
      option.setName(config.timespanText.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
      .setDescription(config.timespanDescription)
      .setRequired(true)
      .addChoices({
        name: `1 ${config.week}`,
        value: '7'
      }, {
        name: `2 ${config.weeks}`,
        value: '14'
      }, {
        name: `1 ${config.month}`,
        value: '30'
      }, {
        name: `3 ${config.months}`,
        value: '91'
      }, {
        name: `6 ${config.months}`,
        value: '182'
      }, {
        name: `1 ${config.year}`,
        value: '365'
      }, {
        name: config.everything,
        value: '9999'
      })),

  async execute(client, interaction) {
    Graphs.createHistoryGraph(client, interaction, 'new');
  },
};