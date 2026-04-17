const https = require('https');

https.get('https://api.counterapi.dev/v1/quarkblogs/home/up', (res) => {
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
