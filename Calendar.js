const Discord = require('discord.js');
const { readFileSync } = require('fs');
const { writeFileSync } = require('fs');

class Event {
  constructor(name, desc, subject, date) {
    this.name = name;
    this.desc = desc;
    this.subject = subject;
    this.date = date;
  }
}

module.exports = {
  slaves: [],
  dbPath: './database.json',
  db: {events: []},
  saveDb() {
    writeFileSync(this.dbPath, JSON.stringify(this.db), {encoding: 'utf-8'});
  },
  loadDb() {
    const json = readFileSync(this.dbPath, {encoding: 'utf-8'});
    if (json) {
      try {
        this.db = JSON.parse(json);
      } catch (e) {}
    }
  },
  run(tokens) {
    this.loadDb();
    for (const token of tokens) {
      const slave = new Discord.Client();
      this.slaves.push(slave);
      slave.on('ready', () => {
        console.log(`Slave added ${slave.user.tag}!`);
        slave.user.setActivity('being a slave', {type: 'PLAYING'});
      })
      slave.login(token);
    }
    const master = this.slaves[0];
    master.on('message', msg => {
      if (msg.content.startsWith('!')) {
        let args = msg.content.substring(1).match(/[^\s"']+|"([^"]*)"/gmi);
        const command = args.shift();
        if (command === 'add') {
          msg.reply('Slave riot. F*ck off, peasant. Do not waste my time.');
          if (args.length === 0) {
            return msg.reply('What the heck do you want from me zią');
          }
          let event = new Event();
          event.date = new Date();
          let year = event.date.getFullYear();
          let dateInfo = args[0].split('/');
          let timeInfo = ['0','0'];
          
          // !add x "tresc" - dodaj event za x dni
          if (dateInfo.length == 1) {
            let days = dateInfo[0];
            event.date.setDate(event.date.getDate() + days);
          } 
          // !add d/m "tresc" - dodaj event x dnia y miesiąca
          else {
              let day = dateInfo[0];
              let month = dateInfo[1];
              event.date.setFullYear(year, month, day);
          }

          let argOffset = 0;
          if(!args[1].startsWith('"')) {
            timeInfo = args[1].split(':');
            if(timeInfo.length != 2) {
              return msg.reply("Wrong arguments given, mate (or lass, idk).");
            }
            argOffset++;
            event.date.setHours(timeInfo[0]);
            event.date.setMinutes(timeInfo[1]);
          }

          event.name = args[1+argOffset];
          if(args[2+argOffset].startsWith("-")) {
            event.desc = '';
            argOffset++;
          } else {
            event.desc = args[2+argOffset];
          }
          event.subject = args[2+argOffset];
          msg.reply('test - ' + JSON.stringify(event));
        } 
      }
    });
  }
}

// !add x "tresc" - dodaj event za x dni
// !add d/m "tresc" - dodaj event x dnia y miesiąca
// !add d/m hh:mm "tresc" - dodaj event x dnia y mc o h:m
// po "tresc" przedmiot i opis opcjonalnie

// Nazwa, Opis, przedmiot, Data/Czas,
// !add x nazwa opis -przedmiot

// !add d/m nazwa opis -przedmiot
// !add d/m hh:mm nazwa opis -przedmiot