// debug_chat_api.js
// Simple Node.js script to test your chat endpoint

import fetch from 'node-fetch';

const CHAT_API_URL = 'https://jarvis2-0-djg1.onrender.com/api/chat'; // Change to your deployed endpoint if needed

const payload = {
  message: 'hii',
  session_id: 'sess_ny42k99mw_1755193050234',
  shop_domain: 'aman-chatbot-test.myshopify.com'
};

async function testChatApi() {
  try {
    console.log('Sending payload:', payload);
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testChatApi();
