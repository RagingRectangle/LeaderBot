# Leaderboard Discord Bot

## About
A Discord bot for displaying Pokemon Go leaders.

Join the Discord server for any help and to keep up with updates: https://discord.gg/FVEZSRZR99


## Requirements
 - New Discord bot with token (If using an old bot that also uses /slash commands, those will be overridden)
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
- **slashGuildIDs:** List of guild IDs where commands should be registered.

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

HistoryOptions
- With how the bot is currently written only 25 options will be able to be used at once.
- LeaderBot V2 will handle this.
- Swap whichever options you want between the `historyOptions` and `unusedHistoryOptions` sections.


## Usage
- Using PM2: `pm2 start leaderbot --name LeaderBot`
- Slash commands will be registered in the guilds listed above.
- You can use channel perms to limit the bot access or use the server integration settings to limit the bot to only certain channels.
- The `createLeaderboardCommand` will walk you through how to create one of the types of boards.
- The `trainerHistoryCommand` will allow anyone with access to the bot to create graphs of trainer stats.
- History responses will only be visable to the command user.

## Notes
- If you need to edit or delete a board you can do so by opening `./config/boards.json`.

## V2 Thoughts
- Global commands instead to also be available in DMs.
- Config option to turn hidden repsonses on/off.
- Rework the history commands to allow more than 25 options to pick from.
- Rework the reply and add components to allow users to easily switch between types of history/timespan.
- Combine some into a single option (wins for each league, normal/legendary raids, etc).

## V3 Thoughts
- Look into caching user data for a short period to avoid spamming the databse.
- Multi-trainer graphs to compare.