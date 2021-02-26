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
  showCalendar() {
    this.slaves.forEach((slave, idx) => {
      if (!slave.user) return;
      slave.guilds.fetch('592409592315772938').then(guild => {
        guild.me.setNickname(`slave ${idx + 1}`);
      });
    });
  },
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
    const self = this;
    self.db.events.forEach((ev, idx) => {
      self.db.events[idx].date = new Date(ev.date);
    });
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
              .setThumbnail('https://cdn.discordapp.com/attachments/718121700163715164/814954240534380584/unknown.png')
              .addField('Subject', event.subject)
              .addField('Date', event.date.toLocaleString("pl-PL"));
  },
  createListEmbedEl(event, idx) {
    return "["+idx+"] "+event.name+" ("+event.date.toLocaleString("pl-PL")+") ("+event.subject+")";
  },
  compareDate(eventDate, date) {
    return eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate();
  },
  createListEmbed(events, date) {
    if (events.length == 0) {
        return "No events planned.";
    }
    let str = ''
    if(date === undefined) {
      events.forEach((el, idx) => {
        str+=this.createListEmbedEl(el, idx)+'\n';
      });
    }
    else {
      events.filter(event => this.compareDate(event.date, date)).forEach((el, idx) => {
        str+=this.createListEmbedEl(el, idx)+'\n';
      });
    }
    return new Discord.MessageEmbed().setDescription(str);
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
          event.date.setHours(23);
          event.date.setMinutes(59);
          event.date.setSeconds(59);
          let year = event.date.getFullYear();
          let dateInfo = args[0].split('/');
          let timeInfo = ['0','0'];
          
          if (dateInfo.length == 1) {
            let days = Number(dateInfo[0]);
            event.date.setDate(event.date.getDate() + days);
          } 
          else {
              let day = Number(dateInfo[0]);
              let month = Number(dateInfo[1]) - 1;
              event.date.setFullYear(year, month, day);
              if (event.date < new Date()) {
                event.date.setFullYear(year + 1);
            }
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
            event.date.setSeconds(0);
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
          this.db.events.sort((ev1, ev2) => {
              return ev1.date - ev2.date;
          });
          this.saveDb();
          msg.reply('dodaned');
        } 
        if (command === 'info') {
            let event = this.db.events[Number(args[0])];
            if (!event) {
              return msg.reply('Event not founbd kurwa');
            }
            const replyEmbed = this.createEventEmbed(event);
            msg.reply(replyEmbed);
        }
        if (command === 'events') {
            if (args.length == 0) {
                msg.reply(this.createListEmbed(this.db.events));
            } else {
                let date = new Date();
                if (args[0].includes("/")) {
                    let dateInfo = args[0].split("/");
                    let day = dateInfo[0];
                    let month = dateInfo[1] - 1;
                    date.setFullYear(year, month, day);
                    if (date < new Date()) {
                        date.setFullYear(year + 1);
                    }
                } else {
                    let days = Number(args[0]);
                    date.setDate(date.getDate() + days);
                }
                msg.reply(this.createListEmbed(this.db.events, date));
            }
        }
        if (command === 'remove') {
            if (args.length != 1) {
                msg.reply("Which event you wanna get rid of, oi");
            } else {
                let index = Number(args[0])
                if (!isNaN(index) && index > -1) {
                    this.db.events.splice(index, 1);
                }
                this.saveDb();
                msg.reply("Deleted that bad boi");
            }
        }
        if (command === 'clear') {
            msg.reply('Ar ya suyre? (!y/!n)');
            // this.clearRequested = true;
            msg.channel.awaitMessages(m => ['!y', '!n'].includes(m.content), { max: 1, time: 15000, errors: ['time'] })
                .then(collected => {
                    if (collected.size === 0) return;
                    console.log(Object.values(collected));
                    if (Object.values(collected)[0].content !== '!y') {
                        msg.reply("Chickening out??? Decide you fucker")
                    } else {
                        this.db.events = [];
                        this.saveDb();
                        msg.reply("You madman, cleared all events for ya");
                    }
                })
                .catch(collected => msg.reply("Time's out mothafucka"));
        }
        if (command === 'addmeme') {
            msg.reply("Jesus Christ, I've added this masterpiece, but leave paint alone");
        }
        // if (command === '!y') {

        // }
        // if (command === '!n') {

        // }
      }
    });
    const interval = setInterval(() => this.showCalendar(), 1000 * 60);
    setTimeout(() => this.showCalendar(), 1000 * 5);
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

// [id] d/m/y
// !info 1
// !events
// !events 2
// !events 16/04

// !remove 1
// !clear

// !addmeme KCK "http://url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - url.jpg"

// TODO:
// - notifications
// - changing nicknames
// - memsy
// - baza subjectsów
// - 