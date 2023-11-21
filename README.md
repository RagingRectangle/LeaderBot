# Leaderboard Discord Bot

## About
A Discord bot for displaying Pokemon Go leaders.

Join the Discord server for any help and to keep up with updates: https://discord.gg/FVEZSRZR99


## Requirements
 - **New Discord bot with token** (If using an old bot that also uses /slash commands, those will be overridden)
 - [Golbat](https://github.com/UnownHash/Golbat)
 - [Leaderboard](https://github.com/na-ji/leaderboard)
 - Scanner that can provide necessary data


## Install
```
git clone https://github.com/RagingRectangle/LeaderBot.git
cd LeaderBot
cp -r config.example config
npm install
```


## Config Setup
- **serverName:** Custom name for your server.
- **adminIDs:** List of Discord user IDs that can execute all commands.

Database:
  - **leaderboard:** Info pointing towards leaderboard database.
  - **golbat:** Info pointing towards golbat database.

Translations:
- **timezoneOffsetHours:** Only used for the timestamp used in footers.
- **createLeaderboardCommand:** Command name for creating boards (admins only).
- **trainerHistoryCommand:** Command name for users to look at their history.
- **trainerHistoryDescription:** Short description of trainer command.
- **trainerText:** Command name for trainer.
- **trainerDescription:** Short description about selecting trainer.
- **historyTypeText:** Command name for selecting which type of history data.
- **historyTypeDescription:** Short description for type option.
- **timespanText:** Command name for selecting how long to look back.
- **timespanDescription:** Short description for timespan option
- **historyAxisFormat:** How to display axis dates [Format help](https://momentjs.com/docs/#/displaying/format/)
- **footerDateFormat:** How to display date in footers. [Format help](https://momentjs.com/docs/#/displaying/format/)
- **footerTimeFormat:** How to display time in footers. [Format help](https://momentjs.com/docs/#/displaying/format/)
- **allTimeLeaderTitle:** Title for all-time leaderboards.
- **dailyLeaderTitle:** Title for top daily leaderboards.
- **totalLeaderTitle:** Title for daily total boards.
- **week/weeks/month/months/everything:** Basic translations if needed.
- **dailyUserLimit:** Number of trainers to display in daily leaderboards.
- **allTimeUserLimit:** Number of trainers to display in all-time leaderboards.
- **first/second/thirdPlace:** Emojis used next to top trainers.
- **left/rightAxis:** Text for axis names.


HistoryOptions
- How each option will be displayed in graph labels.

historyTypes
- How each type of graph will be displayed to users in the dropdown list.


## Usage
- Using PM2: `pm2 start leaderbot --name LeaderBot`
- Slash commands will be registered globally and work in all channels as well as DMs.
- You can use channel perms to limit the bot access or use the server integration settings to limit the bot to only certain channels.
- The `createLeaderboardCommand` will walk you through how to create one of the types of boards. (Only admins and in servers)
- The `trainerHistoryCommand` will allow anyone with access to the bot to create graphs of trainer stats.

## Notes
- If you need to edit or delete a board you can do so by opening `./config/boards.json`.

## Future Thoughts
- Look into caching user data for a short period to avoid spamming the databse.
- Multi-trainer graphs to compare.