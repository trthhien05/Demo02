const https = require('https');

function testRegister() {
  const data = JSON.stringify({ username: "testadmin", password: "testadmin123", fullName: "Test Admin", role: 0 });
  
  const options = {
    hostname: 'demo02-backend.onrender.com',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, res => {
    console.log(`[Register] Status Code: ${res.statusCode}`);
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

testRegister();
