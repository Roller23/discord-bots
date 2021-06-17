const Discord = require('discord.js')
const io = require('socket.io-client')

module.exports = {
  glitch: 'https://friml-conductor.glitch.me',
  client: new Discord.Client(),
  run(TOKEN) {
    let self = this;
    let client = this.client;
    client.on('ready', () => {
      console.log(`Logged in as ${client.user.tag}!`);
      client.user.setActivity('dead since 1972', {type: 'PLAYING'});
    });
    client.on('message', async msg => {
      if (msg.content.toLowerCase() === 'gimme song') {
        const socket = io(self.glitch);
        socket.on('song', data => {
          socket.disconnect();
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            console.log('error', data)
            return msg.channel.send('FriML did an oopsie\n' + e)
          }
          const fileURL = 'https://friml.herokuapp.com/outputs/' + json.name + '.mid';
          msg.reply("here's ya song champ", {files: [fileURL]});
        });
      
        socket.on('queued', data => {
          const position = data.position;
          const avgTime = data.time;
          msg.reply(`you're ${position} in queue!`);
        });
      
        const data = {genre: 'classical', key: 'C', instrument: 'piano'};
        socket.emit('song', data);
        msg.reply('uno momento');
      }
    });
    client.login(TOKEN);
  }
};