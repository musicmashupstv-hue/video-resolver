// netlify/functions/resolve.js
exports.handler = async (event, context) => {
  const shareUrl = event.queryStringParameters.url;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (!shareUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing url parameter' }),
    };
  }

  // ----- Google Drive -----
  const driveMatch = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: directUrl, success: true }),
    };
  }

  // ----- Starchive (scrape) -----
  if (shareUrl.includes('starchive.io')) {
    try {
      const response = await fetch(shareUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await response.text();
      let videoUrl = null;
      const videoTag = html.match(/<video[^>]*src=["']([^"']+)["']/i);
      if (videoTag) videoUrl = videoTag[1];
      else {
        const sourceTag = html.match(/<video[^>]*>[\s\S]*?<source[^>]*src=["']([^"']+)["']/i);
        if (sourceTag) videoUrl = sourceTag[1];
      }
      if (videoUrl) {
        if (!videoUrl.startsWith('http')) {
          const base = new URL(shareUrl);
          videoUrl = new URL(videoUrl, base.origin).href;
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ url: videoUrl, success: true }),
        };
      }
    } catch (err) {
      console.error('Starchive scrape error:', err.message);
    }
  }

  // ----- Direct video file -----
  if (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(shareUrl)) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: shareUrl, success: true }),
    };
  }

  // ----- Fallback -----
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: shareUrl, success: false, fallback: true }),
  };
};
