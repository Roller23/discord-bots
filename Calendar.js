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
  replaceQuotes(str) {
    while (str.includes('"')) {
      str = str.replace('"', '');
    }
    return str;
  },
  createEventEmbed(event) {
    return new Discord.MessageEmbed()
              .setColor('#123456')
              .setTitle(event.name)
              .setURL('https://omfgdogs.com')
              .setDescription(event.desc)
              .setThumbnail('https://media-exp1.licdn.com/dms/image/C4D03AQEg_qDgf_XUow/profile-displayphoto-shrink_200_200/0/1517512903046?e=1616025600&v=beta&t=bAOQwY-9sSOWfxMJtFjQh0-tsRQC-k2sZTFCGPv0qQI')
              .addField('Subject', event.subject)
              .addField('Date', event.date.toLocaleString("pl-PL"));
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
          if (args.length === 0) {
            return msg.reply('What the heck do you want from me zią');
          }
          let event = new Event();
          event.date = new Date();
          let dateInfo = args[0].split('/');
          let timeInfo = ['0','0'];
          
          if (dateInfo.length == 1) {
            let days = Number(dateInfo[0]);
            event.date.setDate(event.date.getDate() + days);
          } 
          else {
              let day = Number(dateInfo[0]);
              let month = Number(dateInfo[1]) - 1;
              let year = event.date.getFullYear();
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

          event.name = this.replaceQuotes(args[1+argOffset]);
          if(args[2+argOffset].startsWith("-")) {
            event.desc = '';
          } else {
            event.desc = this.replaceQuotes(args[2+argOffset]);
            argOffset++;
          }
          event.subject = args[2+argOffset].substring(1);
          msg.channel.send(this.createEventEmbed(event));
          // msg.reply('ar ju siur abot dis?');
          this.db.events.push(event);
          this.saveDb();
          msg.reply('dodaned');
        } 
        if (command === 'info') {
            let event = db.events[Number(args[0])];
            if (!event) {
              return msg.reply('Event not founbd kurwa');
            }
            const replyEmbed = this.createEventEmbed(event);
            msg.reply(replyEmbed);
        }
        if (command === 'events') {
            if (args.length == 1) {
                db.events.forEach(el => {
                    msg.reply(this.createEventEmbed(el));
                });
            }
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

// [1] 16/04
// !info 1
// !events
// !events 2
// !events 16/04