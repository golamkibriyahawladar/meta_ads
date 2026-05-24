const crypto = require('crypto');
const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  connectLambda(event);
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'token_123';
  const APP_SECRET = process.env.APP_SECRET;
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

  // ==========================================
  // GET: Webhook Verification
  // ==========================================
  if (event.httpMethod === 'GET') {
    const queryParams = event.queryStringParameters;
    const mode = queryParams['hub.mode'];
    const token = queryParams['hub.verify_token'];
    const challenge = queryParams['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return { statusCode: 200, body: challenge };
      } else {
        return { statusCode: 403, body: 'Forbidden' };
      }
    }
    return { statusCode: 400, body: 'Bad Request' };
  }

  // ==========================================
  // POST: Webhook Event Receiver
  // ==========================================
  if (event.httpMethod === 'POST') {
    try {
      // Validate Signature
      if (APP_SECRET) {
        const signature = event.headers['x-hub-signature-256'];
        if (signature) {
          const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', APP_SECRET)
            .update(event.body, 'utf-8')
            .digest('hex');

          if (signature !== expectedSignature) {
            console.error('Signature mismatch! Request rejected.');
            return { statusCode: 403, body: 'Invalid signature' };
          }
        }
      }

      const body = JSON.parse(event.body);
      const store = getStore('meta_leads_store');

      if (body.object === 'page') {
        for (const entry of body.entry) {
          if (!entry.changes) continue;

          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadInfo = change.value;
              console.log('New Lead Webhook Received:', JSON.stringify(leadInfo));

              const pageId = leadInfo.page_id;
              const leadgenId = leadInfo.leadgen_id;

              if (pageId && leadgenId) {
                // Fetch the stored Page Access Token from Netlify Blobs
                const pageToken = await store.get(`token_${pageId}`);

                if (pageToken) {
                  try {
                    // Fetch FULL lead details from Graph API
                    const leadUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform&access_token=${pageToken}`;
                    const response = await fetch(leadUrl);
                    const leadData = await response.json();

                    if (leadData.error) {
                      console.error('Graph API Error:', JSON.stringify(leadData.error));
                    } else {
                      console.log('Successfully fetched Full Lead Data:', JSON.stringify(leadData));

                      // Parse fields
                      const fields = {};
                      if (leadData.field_data) {
                        leadData.field_data.forEach(field => {
                          fields[field.name] = field.values[0] || '';
                        });
                      }

                      const parsedLead = {
                        id: leadData.id,
                        created_time: leadData.created_time || new Date().toISOString(),
                        form_id: leadData.form_id || leadInfo.form_id || 'Unknown Form ID',
                        form_name: leadData.form_name || 'Meta Lead Form',
                        ad_name: leadData.ad_name || '-',
                        campaign_name: leadData.campaign_name || '-',
                        platform: leadData.platform || '-',
                        is_organic: leadData.is_organic || false,
                        full_name: fields.full_name || fields.first_name || '-',
                        email: fields.email || '-',
                        phone_number: fields.phone_number || '-',
                        city: fields.city || '-',
                        all_fields: fields
                      };

                      // Store to Netlify Blobs
                      const leadsKey = `leads_${pageId}`;
                      let existingLeads = await store.get(leadsKey, { type: 'json' }) || [];

                      // Prevent duplicate leads
                      if (!existingLeads.some(l => l.id === parsedLead.id)) {
                        existingLeads.unshift(parsedLead);
                        await store.setJSON(leadsKey, existingLeads);
                        console.log(`Saved lead ${parsedLead.id} to Netlify Blobs`);
                      } else {
                        console.log(`Lead ${parsedLead.id} is already in the store.`);
                      }
                    }
                  } catch (fetchError) {
                    console.error('Error fetching lead details:', fetchError.message);
                  }
                } else {
                  console.error(`Page token not found in store for Page ID: ${pageId}. Log in on the dashboard first.`);
                }
              }
            }
          }
        }
        return { statusCode: 200, body: 'EVENT_RECEIVED' };
      }

      return { statusCode: 404, body: 'Not Found' };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
