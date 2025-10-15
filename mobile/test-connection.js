// Simple test script to verify API connection
const axios = require('axios');

const BASE_URL = 'http://192.168.100.162:3000/api';

async function testConnection() {
  try {
    console.log('🔗 Testing connection to:', BASE_URL);
    
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check successful:', healthResponse.data);
    
    // Test API endpoint
    const apiResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('✅ API endpoint accessible');
    
  } catch (error) {
    console.error('❌ Connection test failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
  }
}

testConnection();
