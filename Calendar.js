const Discord = require('discord.js');
const { readFileSync } = require('node:fs');

class Event {
  constructor(name, desc, subject, role, date) {
    this.name = name;
    this.desc = desc;
    this.subject = subject;
    this.role = role;
    this.date = date;
  }
}

module.exports = {
  slaves: [],
  run(tokens) {
    let db = {events: []};
    const json = readFileSync('./database.json');
    if (json) {
      try {
        db = JSON.parse(json);
      } catch (e) {}
    }
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
        let args = msg.content.substring(1).split(' ');
        const command = args.shift();
        if (command === 'add') {
          msg.reply('fuck off');
          // db.events.push(????)
        } 
      }
    });
  }
}

// !add x "tresc" - dodaj event za x dni
// !add d/m "tresc" - dodaj event x dnia y miesiąca
// !add d/m/r "tresc" - dodaj event x dnia y mc z roku
// !add d/m hh:mm "tresc" - dodaj event x dnia y mc o h:m
// !add d/m/r hh:mm "tresc" - dodaj event d dnia m mc r roku o hh:mm
// po "tresc" przedmiot i opis opcjonalnie

// Nazwa, Opis, Przedmiot, Rola (do pingowania), Data/Czas,