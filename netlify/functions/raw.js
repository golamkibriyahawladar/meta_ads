const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  connectLambda(event);
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const queryParams = event.queryStringParameters || {};
  const userToken = queryParams.user_token;
  const targetPageId = queryParams.page_id;

  if (!userToken) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'User access token is required' })
    };
  }

  try {
    const store = getStore('meta_leads_store');
    // Validate token similar to leads.js (optional fetch pages) could reuse but just need raw payloads key
    const rawKey = `raw_${targetPageId}`;
    const rawData = await store.get(rawKey, { type: 'json' }) || [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, raw: rawData })
    };
  } catch (error) {
    console.error('Error processing raw payload API:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
