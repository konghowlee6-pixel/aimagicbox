#!/bin/bash

# Test script for Vertex AI API endpoints

API_BASE="http://localhost:5000/api"
HEADERS=(
  -H "Content-Type: application/json"
  -H "x-user-id: test-user-vertex"
  -H "x-user-email: vertex@test.com"
  -H "x-user-name: Vertex Test User"
  -H "x-user-photo: https://example.com/photo.jpg"
)

echo "=== Testing Vertex AI Integration ==="
echo ""

# Test 1: Smart Text Rewriting
echo "1️⃣ Testing Smart Text Rewriting (/api/vertex/rewrite-text)"
curl -s -X POST "$API_BASE/vertex/rewrite-text" \
  "${HEADERS[@]}" \
  -d '{
    "text": "fast shipping", 
    "targetStyle": "professional",
    "context": "e-commerce product feature"
  }'
echo -e "\n"

# Test 2: AI Fusion Background
echo "2️⃣ Testing AI Fusion Background (/api/vertex/fusion)"
curl -s -X POST "$API_BASE/vertex/fusion" \
  "${HEADERS[@]}" \
  -d '{
    "productDescription": "sleek wireless headphones",
    "backgroundTheme": "modern lifestyle setting",
    "mood": "energetic",
    "brandContext": "premium audio brand"
  }'
echo -e "\n"

# Test 3: Contextual Copywriting
echo "3️⃣ Testing Contextual Copywriting (/api/vertex/copywriting)"
curl -s -X POST "$API_BASE/vertex/copywriting" \
  "${HEADERS[@]}" \
  -d '{
    "platform": "Facebook",
    "productName": "SmartWatch Pro",
    "productDescription": "Next-gen fitness tracker with AI coaching",
    "targetAudience": "fitness enthusiasts aged 25-40",
    "tone": "motivational",
    "brandVoice": "energetic and empowering"
  }'
echo -e "\n"

echo "=== All tests completed ==="
