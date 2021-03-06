const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient;

class Event {
  constructor(name, desc, group, date) {
    this.name = name;
    this.desc = desc;
    this.group = group;
    this.date = date;
    this.notifiedDayBefore = false;
    this.notifiedHourBefore = false;
  }
}

module.exports = {
  weekdaysLookup: [
    ['nd', 'niedziela', 'sun', 'sunday', '日'],
    ['pon', 'pn', 'poniedzialek', 'poniedziałek', 'mon', 'monday', '月'],
    ['wt', 'wtorek', 'tue', 'tuesday', '火'],
    ['sr', 'śr','sroda', 'środa', 'wed', 'wednesday', '水'],
    ['czw', 'czwartek', 'thu', 'thursday', '木'],
    ['pt', 'piatek', 'piątek', 'fri', 'friday', '金'],
    ['sb', 'sobota', 'sat', 'saturday', '土']
  ],
  groupsLookup: {
   "TM2": {name: 'Technologie mobilne gr. 2 (8:00 x1)', role: '<@&815685683595313184>'},
   "TM3": {name: 'Technologie mobilne gr. 3 (10:00 x1 W)', role: '<@&815685713743446030>'},
   "TM4": {name: 'Technologie mobilne gr. 4 (10:00 x1 M)', role: '<@&815685727903416361>'},
   "PG": {name: 'Programowanie gier', role: '<@&815685742138228818>'},
   "ZPS": {name: 'Zaawansowane programowanie sieciowe', role: '<@&815685761592066099>'},
   "SCR": {name: 'Systemy czasu rzeczywistego', role: '<@&815685801022062602>'},
   "ALL": {name: 'Cała grupa', role: '@everyone'},
   "TEST": {name: 'Test', role: '<@&815685834686332960>'},
  },
  slaves: [],
  db: null,
  guildID: '592409592315772938',
  channelID: '815371586769125437',
  guild: null,
  tokens: [],
  connectToDb() {
    const uri = `mongodb+srv://domopedia:${process.env.MONGO_PASSWORD}@bots-cluster.k06nu.mongodb.net/domopedia?retryWrites=true&w=majority`;
    const self = this;
    self.client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
    return new Promise((resolve, reject) => {
      self.client.connect(err => {
        if (err) reject(err);
        self.db = self.client.db('domopedia');
        self.db.collection('events').createIndex({index: 1});
        resolve(self.db);
      });
    })
  },
  getAll(collection) {
    const self = this;
    return new Promise((resolve, reject) => {
      self.db.collection(collection).find({}).sort({date: 1}).toArray((err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    })
  },
  getGuild(slave) {
    const self = this;
    return new Promise(resolve => {
      if (this.guild) {
        resolve(this.guild);
      }
      slave.guilds.fetch(self.guildID).then(guild => {
        resolve(guild);
      });
    });
  },
  setNickname(slave, name) {
    return new Promise(resolve => {
      slave.guilds.fetch(this.guildID).then(guild => {
        guild.me.setNickname(name);
        resolve(slave);
      });
    });
  },
  showCalendar() {
    const self = this;
    this.db.collection('events').find({}).sort({date: 1}).toArray(async (err, res) => {
      if (err) return console.log('err', err);
      let today = new Date();
      today.setHours(today.getHours() + 1);
      let max = new Date();
      max.setHours(max.getHours() + 1);
      max.setDate(today.getDate() + 6);
      let toRemove = res.filter(e => e.date < today);
      toRemove.forEach(ev => {
        const id = ev._id;
        delete ev._id;
        self.db.collection('archivedEvents').insertOne(ev);
        self.db.collection('events').deleteOne({_id: id});
      });
      res = res.filter(e => e.date >= today && e.date <= max);
      let days = [];
      for (const event of res) {
        for (let day = 0; day < 7; day++) {
          if (event.date.getDay() === day) {
            if (days[day] === undefined) {
              days[day] = [];
            }
            days[day].push(event);
            break;
          }
        }
      }
      for (let i = 0; i < 7; i++) {
        if (days[i] === undefined) {
          await self.slaves[i].user.setStatus('invisible');
          await self.setNickname(self.slaves[i], 'Calendar');
          await self.slaves[i].user.setActivity('');
          continue;
        }
        await self.slaves[i].user.setStatus('online');
        let shallowCopy = days[i].slice(0);
        let event = days[i].shift();
        let remainder = days[i].length;
        if (!self.slaves[i].user) {
          await self.loginSlave(self.slaves[i], self.tokens[i]);
        }
        self.setNickname(self.slaves[i], event.name);
        let remainderStr = remainder ? ` [+${remainder}]` : '';
        const minutes = event.date.getMinutes().toString().padStart(2, '0');
        const str = `${event.date.getHours()}:${minutes} (${event.group})${remainderStr}`;
        await self.slaves[i].user.setActivity(str, {type: 'PLAYING'});
        for (const event of shallowCopy) {
          if (event.notifiedDayBefore && event.notifiedHourBefore) continue;
          let minutesPassed = Math.floor((today.getTime() - event.date.getTime()) / 1000 / 60);
          let hoursPassed = Math.floor(minutesPassed / 60);
          const shouldNotify = (hoursPassed === -24 && !event.notifiedDayBefore) || (hoursPassed === -1 && !event.notifiedHourBefore);
          if (!shouldNotify) continue;
          event.notifiedDayBefore = hoursPassed === -24;
          event.notifiedHourBefore = hoursPassed === -1;
          let guild = await self.getGuild(self.slaves[i]);
          let channel = guild.channels.cache.get(self.channelID);
          let role = self.groupsLookup[event.group] ? self.groupsLookup[event.group].role + ' ' : '';
          let when = hoursPassed === -1 ? 'in an hour' : 'tomorrow';
          channel.send(`${role}The following event will happen ${when}`);
          channel.send(self.createEventEmbed(event));
          self.db.collection('events').updateOne({_id: event._id}, {
            $set: {
              notifiedDayBefore: event.notifiedDayBefore,
              notifiedHourBefore: event.notifiedHourBefore
            }
          });
        }
      }
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
              .addField('Group', event.group)
              .addField('Date', event.date.toLocaleString("pl-PL"));
  },
  createListEmbedEl(event, idx) {
    return "["+idx+"] "+event.name+" ("+event.date.toLocaleString("pl-PL")+") ("+event.group+")";
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
  daysToWeekday(str) {
    let correctDay = false;
    let date = new Date();
    for (let weekday = 0; weekday < this.weekdaysLookup.length; ++weekday) {
      if (this.weekdaysLookup[weekday].includes(str)) {
        days = weekday - date.getDay();
        if (days < 0) {
          days += 7;
        }
        correctDay = true;
        break;
      }
    }
    if (!correctDay) {
      return undefined;
    }
    return days;
  },
  loginSlave(slave, token) {
    return new Promise(resolve => {
      slave.login(token);
      slave.on('ready', () => {
        resolve(slave);
      });
    });
  },
  async run(tokens, master) {
    this.tokens = tokens;
    await this.connectToDb();
    const self = this;
    for (const token of tokens) {
      this.slaves.push(new Discord.Client());
      self.loginSlave(this.slaves[this.slaves.length - 1], token).then(loggedSlave => {
        console.log('slave loggged');
        self.setNickname(loggedSlave, 'Calendar')
      });
    }
    master.on('message', async msg => {
      if (msg.content.startsWith('!')) {
        let args = msg.content.substring(1).match(/[^\s"']+|"([^"]*)"/gmi);
        if (args === null) {
          args = [''];
        }
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
            if (isNaN(days)) {
              days = this.daysToWeekday(args[0]);
              if (days === undefined) {
                return msg.reply('you dont know the days of the week or smth');
              }
            }
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
          if (args[1+argOffset] === undefined) {
            return msg.reply('Giv mor data');
          }
          event.name = this.replaceQuotes(args[1+argOffset]);
          event.group = 'None';
          event.desc = '';
          if (typeof args[2+argOffset] === 'string') {
            if (!args[2+argOffset].startsWith("-")) {
              event.desc = this.replaceQuotes(args[2+argOffset]);
              argOffset++;
            }
          }
          if (typeof args[2+argOffset] === 'string') {
            event.group = args[2+argOffset].substring(1).toUpperCase();
          }
          msg.channel.send(this.createEventEmbed(event));
          this.db.collection('events').insertOne(event, (err, result) => {
            if (err) {
              msg.reply('errorek ' + err.toString());
            } else {
              msg.reply('dodaned');
              self.showCalendar();
            }
          });
        } 
        if (command === 'info') {
            let idx = Number(args[0]);
            if (isNaN(idx)) {
              return msg.reply('invalid index mate');
            }
            const self = this;
            self.db.collection('events').find({}).sort({date: 1}).limit(idx + 1).toArray(async (err, res) => {
              if (err) {
                return msg.reply("couldnt find event kurła");
              }
              let event = await self.db.collection('events').findOne({_id: res[res.length - 1]._id});
              if (!event) {
                return msg.reply('Event not founbd kurwa');
              }
              const replyEmbed = this.createEventEmbed(event);
              msg.reply(replyEmbed);
            });
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
                    let year = new Date().getFullYear();
                    date.setFullYear(year, month, day);
                    if (date < new Date()) {
                        date.setFullYear(year + 1);
                    }
                } else {
                    let days = Number(args[0]);
                    if (isNaN(days)) {
                      days = this.daysToWeekday(args[0]);
                      if (days === undefined) {
                        return msg.reply('you dont know the days of the week or smth');
                      }                 
                    }
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
                    const self = this;
                    self.db.collection('events').find({}).sort({date: 1}).limit(index + 1).toArray((err, res) => {
                      if (err) {
                        return msg.reply("couldnt delete that bad boi");
                      }
                      self.db.collection('events').deleteOne({_id: res[res.length - 1]._id}, (err, res) => {
                        if (!err) {
                          self.showCalendar();
                          msg.reply("Deleted that bad boi");
                        }
                      });
                    });
                } else {
                    let days = this.daysToWeekday(args[0]);
                    if (days === undefined) {
                      return msg.reply(`${args[0]} is not a valid index`);
                    } else {
                      const self = this;
                      let date = new Date();
                      date.setDate(date.getDate() + days);
                      self.db.collection('events').find({}).toArray((err, res) => {
                        if (err) {
                          return msg.reply("couldnt delete that bad boi");
                        }
                        for (const event of res) {
                          if (!self.compareDate(event.date, date)) {
                            continue;
                          }
                          self.db.collection('events').deleteOne({_id: event._id}, (err, res) => {
                            if (err) {
                              msg.reply('you are dead. not big soup rice');
                              console.log(err);
                            }
                          });
                        }
                        self.showCalendar();
                        msg.reply("Deleted those bad bois");
                      });
                    }
                }
            }
        }
        if (command === 'clear') {
            msg.reply('Ar ya suyre? (!y/!n)');
            msg.channel.awaitMessages(m => ['!y', '!n'].includes(m.content), { max: 1, time: 15000, errors: ['time'] })
                .then(collected => {
                    if (collected.size === 0) return;
                    if (collected.first().content === '!y') {
                        this.db.collection('events').deleteMany({}, (err, res) => {
                          if (!err) self.showCalendar();
                        });
                        msg.reply("You madman, cleared all events for ya");
                    } else {
                        msg.reply("Chickening out??? Decide you fucker")
                    }
                })
                .catch(collected => msg.reply("Time's out mothafucka"));
        }
        if (command === 'help') {
          let str = '```Here\'s a list of commands:\n';
          str += `!add dd/mm hh:mm "title" "description" -subject\n`;
          str += `!events - show all events\n`;
          str += `!events dd/mm show all events in a given day\n`;
          str += `!info <index> - show info about a certain event\n`;
          str += `!remove <index> - remove a certain event\n`;
          str += `!clear - remove all events\n`;
          str += '!help - idk```';
          msg.channel.send(str);
        }
      }
    });
    const interval = setInterval(() => this.showCalendar(), 1000 * 60);
    setTimeout(() => this.showCalendar(), 1000 * 10);
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

// !addmeme "http://url.jpg" -KCK

// TODO:
// thumbnails
// avatars