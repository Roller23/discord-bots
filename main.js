require('dotenv').config();

const Discord = require('discord.js');
const fetch = require('node-fetch');
const salvador = new Discord.Client();
const friml = new Discord.Client();
const io = require('socket.io-client');
const https = require('https')

const heroku = 'https://pomodoro-salvadoro.herokuapp.com';
const glitch = 'https://friml-conductor.glitch.me';

process.on("unhandledRejection", error => console.error("Promise rejection:", error));

salvador.on('ready', () => {
  console.log(`Logged in as ${salvador.user.tag}!`);
  salvador.user.setActivity('Teach me anime senpai', {type: 'PLAYING'});
});

friml.on('ready', () => {
  console.log(`Logged in as ${salvador.user.tag}!`);
  salvador.user.setActivity('dead since 1972:tm:', {type: 'PLAYING'});
});

salvador.on('message', async msg => {
  if (msg.content.toLowerCase() === 'gimme image') {
    msg.reply("I'm on it");
    try {
      const id = await (await fetch(`${heroku}/generate`)).text();
      msg.channel.send('', {files: [`${heroku}/generated/${id}/image0000.png`]})
    } catch (e) {
      msg.reply('Ojoj error D:\n' + e)
    }
  }
});

friml.on('message', msg => {
  if (msg.content.toLowerCase() === 'gimme song') {
    const socket = io(glitch);
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
      position = data.position;
      avgTime = data.time;
      msg.reply(`you're ${position} in queue!`);
    });
  
    const data = {genre: 'classical', key: 'C', instrument: 'piano'};
    socket.emit('song', data);
    msg.reply('lemme call my homie Friml real quick');
  }
})

salvador.login(process.env.SALV_TOKEN);
friml.login(process.env.FRIML_TOKEN);

// launch a http server to satisfy DigitalOcean health checks

https.createServer((req, res) => res.end()).listen(8080, '0.0.0.0');