const Discord = require('discord.js')
const fetch = require('node-fetch')

module.exports = {
  heroku: 'https://pomodoro-salvadoro.herokuapp.com',
  client: new Discord.Client(),
  lastHermesPing: 0,
  hermesWakeEndpoint: 'https://raingo.herokuapp.com/api/wake',
  run(TOKEN) {
    let self = this;
    let client = this.client;
    client.on('ready', () => {
      console.log(`Logged in as ${client.user.tag}!`);
      client.user.setActivity('Teach me anime senpai', {type: 'PLAYING'});
    });
    client.on('message', async msg => {
      const now = Date.now();
      const wakeDiff = now - this.lastHermesPing;
      const diffHours = wakeDiff / 1000 / 60 / 60;
      if (diffHours >= 0) {
        this.lastHermesPing = now;
        await fetch(this.hermesWakeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({msg: msg.content, user: msg.author.username})
        })
      }
      if (msg.content.toLowerCase() === 'gimme image') {
        msg.reply("I'm on it");
        try {
          const id = await (await fetch(`${self.heroku}/generate`)).text();
          msg.channel.send('', {files: [`${self.heroku}/generated/${id}/image0000.png`]})
        } catch (e) {
          msg.reply('Ojoj error D:\n' + e)
        }
      }
    });
    client.login(TOKEN);
  }
};