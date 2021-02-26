require('dotenv').config()

const https = require('https')
const Salvador = require('./Salvador.js')
const Friml = require('./Friml.js')
const Calendar = require('./Calendar.js')

process.on("unhandledRejection", error => console.error("Promise rejection:", error));

Salvador.run(process.env.SALV_TOKEN);
Friml.run(process.env.FRIML_TOKEN);

Calendar.run([
  'ODE0ODk5ODUwNzIxNDkzMDMz.YDkkoA.fWKfOwrpF2Q6mKV8SFBP_3C3tSA',
  'ODE0OTAxMzc4ODI4NDY4Mjc2.YDkmDA.L2nid2OZwUVcUcpwqZRb050j7PQ',
  'ODE0OTAxOTAyNjYzODc2NjU4.YDkmiQ.n-w6dbpKefAzuwvgeuLF5aruxWk',
  'ODE0OTAyMjQxMzY1NDU4OTY2.YDkm2g.83xLxxRjDUjMZsNXrthenYEk7k4',
  'ODE0OTAyMzUzMjE5NTUxMjcz.YDkm9Q.rYDPgCAaytdDZz8DF_AJyL063dY'
]);

// launch a http server to satisfy DigitalOcean health checks

https.createServer((req, res) => res.end()).listen(8080, '0.0.0.0');