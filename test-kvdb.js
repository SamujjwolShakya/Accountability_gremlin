const https = require('https');
https.request({ hostname: 'kvdb.io', method: 'POST' }, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
}).end();
