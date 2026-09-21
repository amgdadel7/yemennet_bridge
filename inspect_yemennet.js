const fs = require('fs');

const html = fs.readFileSync('yemennet_portal.html', 'utf8');
console.log('HTML size:', html.length);

// Extract scripts
const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log('Number of scripts:', scripts.length);

// Extract form or input fields
const inputs = html.match(/<input[^>]*>/gi) || [];
console.log('Inputs:', inputs);

// Extract src or href
const links = html.match(/(src|href)=["'][^"']+["']/gi) || [];
console.log('Links & scripts:', links);

// Search for API calls or endpoints
const apis = html.match(/['"`]\/[a-zA-Z0-9_\-\/]+['"`]/g) || [];
console.log('Paths sample:', [...new Set(apis)].slice(0, 30));
