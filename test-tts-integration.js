/**
 * Test ElevenLabs TTS Integration with Gemini Explanations
 * 
 * This test demonstrates how the AI explanations now include both text and audio.
 */

require('dotenv').config({ path: './config.env' });
const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testTTSIntegration() {
  console.log('🎙️ Testing ElevenLabs TTS Integration...\n');

  try {
    // Test 1: Analyze with Explanation + Audio
    console.log('📊 Test 1: Complete Analysis with Audio');
    console.log('=========================================\n');

    const analysisResponse = await axios.post(
      `${BASE_URL}/api/v2/ai/analyze-with-explanation`,
      {
        targetGrade: 'GR20MnCr5',
        // Optional: provide current reading
        currentReading: {
          C: 0.20,
          Si: 0.35,
          Mn: 1.18,
          Cr: 1.15,
          P: 0.025,
          S: 0.022,
        },
      }
    );

    if (analysisResponse.data.success) {
      console.log('✅ Analysis successful!');
      console.log('\n📝 Text Explanation:');
      console.log(analysisResponse.data.data.explanation.substring(0, 200) + '...\n');
      
      if (analysisResponse.data.data.audio) {
        console.log('🔊 Audio generated successfully!');
        console.log(`   Format: ${analysisResponse.data.data.audio.format}`);
        console.log(`   Encoding: ${analysisResponse.data.data.audio.encoding}`);
        console.log(`   Audio size: ${analysisResponse.data.data.audio.audio.length} bytes (base64)\n`);
        
        // Save audio to file for testing
        const audioBuffer = Buffer.from(analysisResponse.data.data.audio.audio, 'base64');
        fs.writeFileSync('test-output-analysis.mp3', audioBuffer);
        console.log('💾 Audio saved to: test-output-analysis.mp3\n');
      } else {
        console.log('⚠️  No audio generated (TTS might be disabled)\n');
      }
    }

    // Test 2: What-If Analysis + Audio
    console.log('\n🔮 Test 2: What-If Analysis with Audio');
    console.log('=========================================\n');

    const whatIfResponse = await axios.post(
      `${BASE_URL}/api/v2/ai/what-if`,
      {
        targetGrade: 'GR20MnCr5',
        currentReading: {
          C: 0.20,
          Si: 0.35,
          Mn: 1.18,
          Cr: 1.15,
          P: 0.025,
          S: 0.022,
        },
        question: 'What if I increase Manganese by 0.05%?',
      }
    );

    if (whatIfResponse.data.success) {
      console.log('✅ What-if analysis successful!');
      console.log('\n📝 Question:', whatIfResponse.data.data.question);
      console.log('\n📝 Analysis:');
      console.log(whatIfResponse.data.data.analysis.substring(0, 200) + '...\n');
      
      if (whatIfResponse.data.data.audio) {
        console.log('🔊 Audio generated successfully!');
        console.log(`   Audio size: ${whatIfResponse.data.data.audio.audio.length} bytes (base64)\n`);
        
        // Save audio to file
        const audioBuffer = Buffer.from(whatIfResponse.data.data.audio.audio, 'base64');
        fs.writeFileSync('test-output-whatif.mp3', audioBuffer);
        console.log('💾 Audio saved to: test-output-whatif.mp3\n');
      }
    }

    // Test 3: Health Check
    console.log('\n🏥 Test 3: Service Health Check');
    console.log('=========================================\n');

    const healthResponse = await axios.get(`${BASE_URL}/api/v2/ai/gemini/health`);
    console.log('Service Status:', healthResponse.data);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testTTSIntegration();
