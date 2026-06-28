// ================================================
//   AURORA BOT - Ready Event
// ================================================

const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n✨ Aurora Bot is online as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} server(s)\n`);

    // Rotating status messages
    const statuses = [
      { text: '/help | Aurora Bot', type: ActivityType.Watching },
      { text: 'your server 🛡️', type: ActivityType.Watching },
      { text: 'music 🎵', type: ActivityType.Listening },
      { text: 'giveaways 🎉', type: ActivityType.Playing },
    ];

    let i = 0;
    client.user.setPresence({
      activities: [{ name: statuses[0].text, type: statuses[0].type }],
      status: 'online',
    });

    setInterval(() => {
      i = (i + 1) % statuses.length;
      client.user.setActivity(statuses[i].text, { type: statuses[i].type });
    }, 15000);
  },
};
