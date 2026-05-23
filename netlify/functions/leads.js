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

    // ---- Step 2: Auto-subscribe pages to our app (Zero-Configuration Webhook Setup) ----
    // We execute this in parallel for all pages so the client doesn't need to manually configure anything.
    await Promise.all(
      pages.map(async (page) => {
        try {
          const subUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}/subscribed_apps`;
          await fetch(subUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscribed_fields: ['leadgen'],
              access_token: page.access_token
            })
          });
          console.log(`Successfully subscribed Page ID: ${page.id} to Lead Webhooks.`);
        } catch (subErr) {
          console.error(`Failed to subscribe Page ID: ${page.id}`, subErr.message);
        }
      })
    );

    // ---- Step 3: Determine which page's leads to fetch ----
    const activePageId = targetPageId || pages[0].id;
    const activePage = pages.find(p => p.id === activePageId);

    if (!activePage) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Selected page not found in user accounts.' })
      };
    }

    // ---- Step 4: Fetch lead forms for the active page ----
    const formsUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${activePage.id}/leadgen_forms?fields=id,name,status&access_token=${activePage.access_token}`;
    const formsResponse = await fetch(formsUrl);
    const formsData = await formsResponse.json();

    let leads = [];

    if (formsData.data && formsData.data.length > 0) {
      // ---- Step 5: Fetch leads from each form ----
      for (const form of formsData.data) {
        const leadsUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${form.id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform&limit=100&access_token=${activePage.access_token}`;
        const leadsResponse = await fetch(leadsUrl);
        const leadsData = await leadsResponse.json();

        if (leadsData.data && leadsData.data.length > 0) {
          const parsedLeads = leadsData.data.map(lead => {
            const fields = {};
            if (lead.field_data) {
              lead.field_data.forEach(field => {
                fields[field.name] = field.values[0] || '';
              });
            }
            return {
              id: lead.id,
              created_time: lead.created_time,
              form_id: lead.form_id || form.id,
              form_name: form.name || 'Unknown Form',
              ad_name: lead.ad_name || '-',
              campaign_name: lead.campaign_name || '-',
              platform: lead.platform || '-',
              is_organic: lead.is_organic || false,
              full_name: fields.full_name || fields.first_name || '-',
              email: fields.email || '-',
              phone_number: fields.phone_number || '-',
              city: fields.city || '-',
              all_fields: fields
            };
          });
          leads = leads.concat(parsedLeads);
        }
      }
    }

    // Sort leads by newest first
    leads.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));

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
