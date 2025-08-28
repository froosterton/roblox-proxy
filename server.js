const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000; // Use cloud provider's port

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: ['https://www.roblox.com', 'https://create.roblox.com'],
  methods: ['GET', 'POST'],
  credentials: true 
}));
app.use(express.json());

// Rate limit (60 requests/minute)
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Roblox Proxy Server Running', timestamp: new Date().toISOString() });
});

// Proxy endpoint
app.post('/proxy', async (req, res) => {
  try {
    const { robloxUrl, method = 'GET', body } = req.body;
    if (!robloxUrl) throw new Error("Missing Roblox URL");

    // Validate Roblox domain
    const allowedDomains = [
      'roblox.com', 'www.roblox.com', 'apis.roblox.com',
      'users.roblox.com', 'catalog.roblox.com', 'friends.roblox.com',
      'games.roblox.com', 'economy.roblox.com', 'groups.roblox.com',
      'inventory.roblox.com', 'presence.roblox.com', 'thumbnails.roblox.com',
      'accountinformation.roblox.com', 'avatar.roblox.com', 'develop.roblox.com',
      'auth.roblox.com'
    ];
    
    const urlObj = new URL(robloxUrl);
    if (!allowedDomains.includes(urlObj.hostname)) {
      throw new Error("URL not allowed");
    }

    // Step 1: Get CSRF token
    const csrfRes = await fetch('https://auth.roblox.com/v2/logout', { 
      method: 'POST'
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error("CSRF token failed");

    // Step 2: Forward to Roblox
    const headers = { 'x-csrf-token': csrfToken };
    if (method !== 'GET' && body) {
      headers['content-type'] = 'application/json';
    }

    const robloxRes = await fetch(robloxUrl, {
      method,
      headers,
      body: method !== 'GET' && body ? JSON.stringify(body) : undefined
    });

    const contentType = robloxRes.headers.get('content-type');
    const responseText = await robloxRes.text();
    
    res.status(robloxRes.status);
    res.set('content-type', contentType);
    res.send(responseText);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Roblox proxy running on port ${PORT}`);
});