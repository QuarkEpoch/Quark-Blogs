const fs = require('fs');
const https = require('https');

const url = 'https://files.oaiusercontent.com/file-CHv3Zg1W2199qM23vJ5Dq9?se=2026-04-18T05%3A54%3A20Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D45bd28b0-845f-4a0b-9dfd-cd2cae3bfdf2.webp&sig=O7D/n%2BMjD8Y6K3t2hV6yvC2xPzST9C2Ww3Oes/c3nTE%3D';

https.get(url, (res) => {
  const fileStream = fs.createWriteStream('public/author.webp');
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download complete.');
  });
}).on('error', (err) => {
  console.error('Error: ', err.message);
});
