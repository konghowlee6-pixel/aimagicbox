
/**
 * Test script for Seedance 1.0 Pro Fast video resolution validation
 * Tests the three required scenarios:
 * 1. 640×640 (1:1) at 5s
 * 2. 1920×1088 (16:9) at 8s
 * 3. 1088×1920 (9:16) at 10s
 */

import { generateQuickClipVideo } from './services/runwareService';

async function testVideoResolutions() {
  console.log('🧪 Testing Seedance 1.0 Pro Fast Video Resolutions\n');

  const testImageURL = 'https://example.com/test-image.jpg'; // Replace with actual test image
  const testPrompt = 'Smooth camera zoom out with gentle fade transition';

  const testCases = [
    { width: 640, height: 640, duration: 5, description: '1:1 square at 5s' },
    { width: 1920, height: 1088, duration: 8, description: '16:9 landscape at 8s' },
    { width: 1088, height: 1920, duration: 10, description: '9:16 portrait at 10s' },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📹 Testing ${testCase.description}...`);
      console.log(`   Resolution: ${testCase.width}×${testCase.height}`);
      console.log(`   Duration: ${testCase.duration}s`);

      const result = await generateQuickClipVideo(
        testImageURL,
        testCase.duration,
        testPrompt,
        testCase.width,
        testCase.height
      );

      console.log(`   ✅ SUCCESS - Task UUID: ${result.taskUUID}`);
    } catch (error: any) {
      console.error(`   ❌ FAILED - ${error.message}`);
    }
  }

  console.log('\n✨ Test complete!');
}

// Run tests if executed directly
if (require.main === module) {
  testVideoResolutions().catch(console.error);
}

export { testVideoResolutions };
