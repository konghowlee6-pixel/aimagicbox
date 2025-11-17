// Simple Node.js test for Vertex AI endpoints
import http from 'http';

const testEndpoint = (method, path, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-user-id': 'test-vertex-user',
        'x-user-email': 'vertex@test.com',
        'x-user-name': 'Vertex Test',
        'x-user-photo': 'https://example.com/photo.jpg'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

console.log('🧪 Testing Vertex AI Integration\n');

// Test 1: Text Rewriting
console.log('1️⃣ Smart Text Rewriting');
testEndpoint('POST', '/api/vertex/rewrite-text', {
  text: 'fast delivery',
  targetStyle: 'professional',
  context: 'e-commerce feature'
}).then(result => {
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  console.log('');
  
  // Test 2: Fusion Background
  console.log('2️⃣ AI Fusion Background');
  return testEndpoint('POST', '/api/vertex/fusion', {
    productDescription: 'wireless earbuds',
    backgroundTheme: 'outdoor adventure',
    mood: 'energetic'
  });
}).then(result => {
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  console.log('');
  
  // Test 3: Contextual Copywriting
  console.log('3️⃣ Contextual Copywriting');
  return testEndpoint('POST', '/api/vertex/copywriting', {
    platform: 'Instagram',
    productName: 'EcoBottle Pro',
    productDescription: 'Sustainable water bottle with smart temperature tracking',
    targetAudience: 'eco-conscious millennials',
    tone: 'friendly'
  });
}).then(result => {
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  console.log('\n✅ All tests completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
