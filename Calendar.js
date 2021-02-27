const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;

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
  db: null,
  guildID: '592409592315772938',
  connectToDb() {
    const uri = `mongodb+srv://domopedia:${process.env.MONGO_PASSWORD}@bots-cluster.k06nu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
    console.log('pw', process.env.MONGO_PASSWORD);
    const self = this;
    self.client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    return new Promise((resolve, reject) => {
      self.client.connect(err => {
        if (err) reject(err);
        self.db = self.client.db('main-db');
        self.db.collection('events').createIndex({index: 1});
        resolve(self.db);
      });
    })
  },
  getAll(collection) {
    const self = this;
    return new Promise((resolve, reject) => {
      self.db.collection(collection).find({}).toArray((err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  },
  showCalendar() {
    this.slaves.forEach((slave, idx) => {
      if (!slave.user) return;
      slave.guilds.fetch(this.guildID).then(guild => {
        guild.me.setNickname(`day ${idx + 1}`);
      });
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
  async run(tokens) {
    await this.connectToDb();
    for (const token of tokens) {
      const slave = new Discord.Client();
      this.slaves.push(slave);
      slave.on('ready', () => {
        console.log(`Slave added ${slave.user.tag}!`);
        slave.user.setActivity('work in progress', {type: 'PLAYING'});
      })
      slave.login(token);
    }
    const master = this.slaves[0];
    master.on('message', async msg => {
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
          this.db.collection('events').insertOne(event, (err, result) => {
            if (err) {
              msg.reply('errorek ' + err.toString());
            } else {
              msg.reply('dodaned');
            }
          });
          // cant do this anymore
          // this.db.events.sort((ev1, ev2) => {
          //     return ev1.date - ev2.date;
          // });
        } 
        if (command === 'info') {
            let idx = Number(args[0]);
            if (isNaN(idx)) {
              return msg.reply('invalid index mate');
            }
            let event = await this.db.collection('events').findOne({index: idx});
            if (!event) {
              return msg.reply('Event not founbd kurwa');
            }
            const replyEmbed = this.createEventEmbed(event);
            msg.reply(replyEmbed);
        }
        if (command === 'events') {
            if (args.length == 0) {
                msg.reply(this.createListEmbed(await this.getAll('events')));
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
                msg.reply(this.createListEmbed(await this.getAll('events'), date));
            }
        }
        if (command === 'remove') {
            if (args.length != 1) {
                msg.reply("Which event you wanna get rid of, oi");
            } else {
                let index = Number(args[0])
                if (!isNaN(index)) {
                    this.db.collection('events').remove({index: index}, (err, res) => {
                      if (err) {
                        msg.reply("couldnt delete that bad boi");
                      } else {
                        msg.reply("Deleted that bad boi");
                      }
                    })
                } else {
                    msg.reply(`${args[0]} is not a valid index`);
                }
            }
        }
        if (command === 'clear') {
            msg.reply('Ar ya suyre? (!y/!n)');
            msg.channel.awaitMessages(m => ['!y', '!n'].includes(m.content), { max: 1, time: 15000, errors: ['time'] })
                .then(collected => {
                    if (collected.size === 0) return;
                    if (collected.first().content === '!y') {
                        this.db.collection('events').remove({});
                        msg.reply("You madman, cleared all events for ya");
                    } else {
                        msg.reply("Chickening out??? Decide you fucker")
                    }
                })
                .catch(collected => msg.reply("Time's out mothafucka"));
        }
        if (command === 'addmeme') {
            msg.reply("Jesus Christ, I've added this masterpiece, but leave paint alone");
        }
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