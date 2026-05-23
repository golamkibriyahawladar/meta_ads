const crypto = require('crypto');

exports.handler = async (event, context) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secret_token_123';
  const APP_SECRET = process.env.APP_SECRET;
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

  // ==========================================
  // GET: Webhook Verification (Meta requires this)
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
  // POST: Webhook Event Receiver (Lead comes in)
  // ==========================================
  if (event.httpMethod === 'POST') {
    try {
      // ---- Step 1: Validate Signature (Security) ----
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

      // ---- Step 2: Process leadgen event ----
      if (body.object === 'page') {
        for (const entry of body.entry) {
          if (!entry.changes) continue;

          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadInfo = change.value;
              console.log('New Lead Webhook Received:', JSON.stringify(leadInfo));

              // ---- Step 3: Fetch FULL lead data from Graph API ----
              if (PAGE_ACCESS_TOKEN && leadInfo.leadgen_id) {
                try {
                  const leadUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadInfo.leadgen_id}?fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform&access_token=${PAGE_ACCESS_TOKEN}`;

                  const response = await fetch(leadUrl);
                  const leadData = await response.json();

                  if (leadData.error) {
                    console.error('Graph API Error:', JSON.stringify(leadData.error));
                  } else {
                    console.log('Full Lead Data:', JSON.stringify(leadData));

                    // TODO: এখানে ডাটাবেসে সেভ করুন (Supabase / MongoDB)
                    // Example: await supabase.from('leads').insert(leadData);
                  }
                } catch (fetchError) {
                  console.error('Error fetching lead details:', fetchError.message);
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
