require('dotenv').config()

const https = require('https')
const Salvador = require('./Salvador.js')
const Friml = require('./Friml.js')
const Calendar = require('./Calendar.js')

process.on("unhandledRejection", error => console.error("Promise rejection:", error));

Salvador.run(process.env.SALV_TOKEN);
Friml.run(process.env.FRIML_TOKEN);

Calendar.run([
  process.env.MONDAY_TOKEN,
  process.env.TUESDAY_TOKEN,
  process.env.WEDNESDAY_TOKEN,
  process.env.THURSDAY_TOKEN,
  process.env.FRIDAY_TOKEN,
  process.env.SATURDAY_TOKEN,
  process.env.SUNDAY_TOKEN
]);

// launch a http server to satisfy DigitalOcean health checks

https.createServer((req, res) => res.end()).listen(8080, '0.0.0.0');