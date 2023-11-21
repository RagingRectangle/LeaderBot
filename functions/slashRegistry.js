var {
   Collection
} = require('discord.js');
var fs = require('fs');
var config = require('../config/config.json');

module.exports = {
   registerCommands: async function registerCommands(client) {
      var commands = [];
      var {
         REST
      } = require('@discordjs/rest');
      var {
         Routes
      } = require('discord-api-types/v10');
      client.commands = new Collection();

      //Create
      const createCommand = require(`./createCommand.js`);
      commands.push(createCommand.data.toJSON());
      client.commands.set(createCommand.data.name, createCommand);

      //History
      const historyCommand = require(`./historyCommand.js`);
      commands.push(historyCommand.data.toJSON());
      client.commands.set(historyCommand.data.name, historyCommand);

      const rest = new REST({
         version: '10'
      }).setToken(config.token);
      rest.put(Routes.applicationCommands(client.user.id), {
            body: commands
         })
         .then(() => console.log(`Registered slash commands`))
         .catch(console.error);
   } //End of registerCommands()
}