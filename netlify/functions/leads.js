const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
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

    // ---- Step 1: Fetch all pages managed by this user ----
    const pagesUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token&access_token=${userToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: pagesData.error.message })
      };
    }

    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, pages: [], leads: [], leadsByPage: {} })
      };
    }

    // ---- Step 2: Save Page Tokens & Auto-subscribe pages to Webhooks ----
    await Promise.all(
      pages.map(async (page) => {
        try {
          // Save Page Access Token to Netlify Blobs for the Webhook to use later
          await store.set(`token_${page.id}`, page.access_token);

          // Auto-subscribe the page to our app's webhook
          const subUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}/subscribed_apps`;
          await fetch(subUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscribed_fields: ['leadgen'],
              access_token: page.access_token
            })
          });
          console.log(`Saved token and subscribed Page ID: ${page.id}`);
        } catch (subErr) {
          console.error(`Failed to handle Page ID: ${page.id}`, subErr.message);
        }
      })
    );

    // ---- Step 3: Fetch leads from Netlify Blobs for the active page ----
    const activePageId = targetPageId || pages[0].id;
    const activePage = pages.find(p => p.id === activePageId);

    if (!activePage) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Selected page not found in user accounts.' })
      };
    }

    // Read stored leads from Blobs
    const leads = await store.get(`leads_${activePageId}`, { type: 'json' }) || [];

    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        pages: pages.map(p => ({ id: p.id, name: p.name })), // Exclude tokens to avoid leak to browser
        leads: leads,
        leadsByPage: {
          [activePageId]: leads
        }
      })
    };

  } catch (error) {
    console.error('Error processing leads API:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
