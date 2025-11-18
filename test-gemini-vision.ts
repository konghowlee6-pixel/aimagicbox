// Test Gemini Vision API for Magic Wand feature
import 'dotenv/config';
import { generateAnimationPromptFromImage } from './server/gemini';

async function testGeminiVision() {
  console.log('🧪 Testing Gemini Vision API for Magic Wand feature...\n');

  // Test with a public HTTPS image URL (using a test domain from the whitelist)
  const testImageUrl = 'https://h5.arriival.com/test-image.jpg';

  console.log('📸 Test Image URL:', testImageUrl);
  console.log('🔑 GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set (' + process.env.GEMINI_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
  console.log('');

  try {
    console.log('🎬 Generating animation prompt (variation 0)...');
    const prompt1 = await generateAnimationPromptFromImage(testImageUrl, 0);
    console.log('✅ Animation Prompt 1:');
    console.log(prompt1);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('🎬 Generating animation prompt (variation 1)...');
    const prompt2 = await generateAnimationPromptFromImage(testImageUrl, 1);
    console.log('✅ Animation Prompt 2:');
    console.log(prompt2);
    console.log('\n' + '='.repeat(80) + '\n');

    console.log('🎉 All tests passed! Gemini Vision API is working correctly.');
    console.log('✅ Magic Wand feature should now work in the QuickClip Video Generator.');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Only HTTPS URLs are accepted')) {
      console.log('\n💡 Note: For security reasons, only HTTPS URLs are accepted.');
      console.log('   The image must be hosted on an allowed domain.');
    } else if (error.message.includes('not whitelisted')) {
      console.log('\n💡 Note: The image domain is not in the whitelist.');
      console.log('   Allowed domains: objects.replcdn.com, replit.app, replit.dev, h5.arriival.com, manus-asia.computer');
    } else if (error.message.includes('GEMINI_API_KEY')) {
      console.log('\n💡 Note: GEMINI_API_KEY is not set or invalid.');
      console.log('   Please check your .env file.');
    }
    
    process.exit(1);
  }
}

testGeminiVision();
