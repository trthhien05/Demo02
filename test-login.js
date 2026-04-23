const https = require('https');

function testLogin(username, password) {
  const data = JSON.stringify({ username, password });
  
  const options = {
    hostname: 'demo02-backend.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, res => {
    console.log(`[${password}] Status Code: ${res.statusCode}`);
    res.on('data', d => {
      process.stdout.write(d);
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

testLogin('admin', '123456');
setTimeout(() => testLogin('admin', 'admin123'), 1000);
