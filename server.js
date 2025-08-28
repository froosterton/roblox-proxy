// Roblox API Proxy Server - Version 3
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - more permissive for bookmarklets
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP that blocks bookmarklets
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (bookmarklets) or from Roblox domains
    if (!origin || origin.includes('roblox.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now - you can restrict later
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Changed to false for bookmarklets
}));

app.use(express.json());

// Rate limit (100 requests/minute - increased for testing)
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Roblox Proxy Server Running', 
    timestamp: new Date().toISOString(),
    version: '3.0'
  });
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
