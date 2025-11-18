// Test DeepSeek API integration
import 'dotenv/config';
import { generateAdCopy, generateHeadlines, generateText } from "./server/deepseek";

async function testDeepSeek() {
  console.log("🧪 Testing DeepSeek API integration...\n");

  try {
    // Test 1: Generate Ad Copy
    console.log("1️⃣ Testing generateAdCopy...");
    const adCopy = await generateAdCopy({
      platform: "Facebook",
      productName: "Smart Watch Pro",
      productDescription: "A premium smartwatch with health tracking, GPS, and 7-day battery life",
      targetAudience: "Fitness enthusiasts aged 25-40",
      tone: "energetic",
    });
    console.log("✅ Ad Copy Generated:");
    console.log(adCopy);
    console.log("\n" + "=".repeat(80) + "\n");

    // Test 2: Generate Headlines
    console.log("2️⃣ Testing generateHeadlines...");
    const headlines = await generateHeadlines({
      productName: "Smart Watch Pro",
      productDescription: "A premium smartwatch with health tracking",
      tone: "energetic",
      count: 3,
    });
    console.log("✅ Headlines Generated:");
    headlines.forEach((h, i) => console.log(`   ${i + 1}. ${h}`));
    console.log("\n" + "=".repeat(80) + "\n");

    // Test 3: Generate Generic Text
    console.log("3️⃣ Testing generateText...");
    const text = await generateText("Write a short tagline for a premium smartwatch brand");
    console.log("✅ Text Generated:");
    console.log(text);
    console.log("\n" + "=".repeat(80) + "\n");

    console.log("🎉 All tests passed! DeepSeek API is working correctly.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testDeepSeek();
