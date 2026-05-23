// In-memory array doesn't persist across lambda invocations reliably,
// but for demo purposes, we define it here or return mock data.
// In production, connect to a database like Supabase or MongoDB here.

const mockLeads = [
  { id: '101', form_id: 'F_123', page_id: 'P_456', status: 'New', created_time: Date.now() - 3600000 },
  { id: '102', form_id: 'F_123', page_id: 'P_456', status: 'Contacted', created_time: Date.now() - 86400000 },
  { id: '103', form_id: 'F_999', page_id: 'P_456', status: 'Qualified', created_time: Date.now() - 172800000 }
];

exports.handler = async (event, context) => {
  // Handle only GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ success: true, leads: mockLeads })
  };
};
