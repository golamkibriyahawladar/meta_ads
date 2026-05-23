exports.handler = async (event, context) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secret_token_123';

  // GET Request: Webhook Verification
  if (event.httpMethod === 'GET') {
    const queryParams = event.queryStringParameters;
    let mode = queryParams['hub.mode'];
    let token = queryParams['hub.verify_token'];
    let challenge = queryParams['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return {
          statusCode: 200,
          body: challenge
        };
      } else {
        return { statusCode: 403, body: 'Forbidden' };
      }
    }
    return { statusCode: 400, body: 'Bad Request' };
  }

  // POST Request: Webhook Event Receiver
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);

      // Check if it's a page event
      if (body.object === 'page') {
        for (const entry of body.entry) {
          const webhookEvent = entry.changes[0];

          // Check if it's a leadgen event
          if (webhookEvent.field === 'leadgen') {
            const leadInfo = webhookEvent.value;
            console.log('New Lead Webhook Received:', leadInfo);
            
            // Here you would typically save to a database.
            // Since this is a serverless function, local memory won't persist.
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
