# 🎙️ Quick Start: Audio Explanations

## Step 1: Start Server

Your API key is already in `config.env`:
```env
ELEVENLABS_API_KEY=sk_ce895ab55c8338e807af69dd653bc46552aee35ef7960eb6
```

Start the server:
```bash
node server.js
```

You should see:
```
✅ Groq AI Service initialized successfully
✅ ElevenLabs TTS Service initialized successfully
```

## Step 2: Test Health Check

```bash
curl http://localhost:3000/api/v2/ai/gemini/health
```

Expected response:
```json
{
  "status": "success",
  "data": {
    "aiService": "available",
    "ttsService": "available",
    "message": "AI explanation service is ready",
    "ttsMessage": "Text-to-speech is enabled",
    "model": "llama-3.3-70b-versatile (Groq)",
    "ttsVoice": "Rachel (ElevenLabs)"
  }
}
```

## Step 3: Get Analysis with Audio

```bash
curl -X POST http://localhost:3000/api/v2/ai/analyze-with-explanation \
  -H "Content-Type: application/json" \
  -d '{
    "targetGrade": "GR20MnCr5"
  }'
```

Response includes:
```json
{
  "success": true,
  "data": {
    "explanation": "Your text explanation...",
    "audio": {
      "audio": "base64_encoded_mp3_data...",
      "format": "mp3",
      "encoding": "base64"
    },
    "severity_level": "MODERATE",
    "confidence": 0.89
  }
}
```

## Step 4: Run Test Suite

```bash
node test-tts-integration.js
```

This will:
- ✅ Test all endpoints
- 🔊 Generate audio files
- 💾 Save `test-output-analysis.mp3` and `test-output-whatif.mp3`
- 📊 Show detailed results

## Frontend Integration (One Button)

```javascript
// Single button that shows text AND plays audio
async function analyzeWithAudio() {
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.innerText = 'Analyzing...';

  try {
    const response = await fetch('/api/v2/ai/analyze-with-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetGrade: 'GR20MnCr5',
        currentReading: yourReading
      })
    });

    const data = await response.json();

    // Show text
    document.getElementById('explanation').innerText = data.data.explanation;

    // Auto-play audio
    if (data.data.audio) {
      const audio = base64ToAudio(data.data.audio.audio);
      audio.play();
    }

    btn.innerText = '🔊 Playing...';
    
  } catch (error) {
    console.error('Error:', error);
    btn.innerText = 'Try Again';
  }
}

// Helper function
function base64ToAudio(base64String) {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  return new Audio(url);
}
```

## HTML Example

```html
<div class="analysis-card">
  <h3>AI Analysis</h3>
  
  <!-- Show text -->
  <div id="explanation" class="explanation-text"></div>
  
  <!-- Single button for everything -->
  <button id="analyzeBtn" onclick="analyzeWithAudio()">
    🔊 Get Analysis with Audio
  </button>
</div>

<style>
  .analysis-card {
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 20px;
  }
  
  .explanation-text {
    margin: 15px 0;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  
  button {
    padding: 12px 24px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>
```

## That's it! 

Your AI explanations now come with audio. Just call the same endpoints you were using before - audio is automatically included! 🎉

---

**Pro Tips:**
- 💡 Audio generation takes 1-3 seconds
- 💡 Show loading indicator while generating
- 💡 Audio files are ~200KB for typical explanations
- 💡 If TTS fails, you still get text explanation
