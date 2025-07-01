const express = require('express');
const fetch = require('node-fetch');
const { URL } = require('url');
const { Transform } = require('stream');

const app = express();
const PORT = 3000;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

function rewriteHTML(baseUrl) {
  return new Transform({
    decodeStrings: false,
    transform(chunk, encoding, callback) {
      let html = chunk.toString();
      html = html.replace(/(src|href)=["']([^"']+)["']/g, (match, attr, url) => {
        if (url.startsWith('http') || url.startsWith('//')) {
          return `${attr}="/proxy?url=${encodeURIComponent(url)}"`;
        }
        try {
          const absolute = new URL(url, baseUrl).href;
          return `${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
        } catch {
          return match;
        }
      });
      callback(null, html);
    }
  });
}

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const response = await fetch(targetUrl);

    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      response.body
        .pipe(rewriteHTML(targetUrl))
        .pipe(res);
    } else {
      response.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching resource: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Streaming CORS proxy running at http://localhost:${PORT}`);
});