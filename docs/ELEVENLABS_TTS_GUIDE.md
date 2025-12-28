# ElevenLabs Text-to-Speech Integration Guide

## Overview

The MetalliSense AI explanation system now includes **text-to-speech** capabilities powered by ElevenLabs. When you request AI explanations, you receive both:
- 📝 **Text explanation** (cleaned markdown format)
- 🔊 **Audio narration** (MP3 format, base64 encoded)

## Features

✅ **Automatic TTS Generation**: Every AI explanation is automatically converted to speech  
✅ **Professional Voice**: Uses Rachel voice with optimized settings for technical content  
✅ **Multilingual Support**: Powered by ElevenLabs Multilingual V2 model  
✅ **Graceful Fallback**: If TTS fails, you still get the text explanation  
✅ **Base64 Encoding**: Audio is returned as base64 string for easy integration  

## Configuration

### 1. Environment Setup

Add your ElevenLabs API key to `config.env`:

```env
ELEVENLABS_API_KEY=sk_your_api_key_here
```

Get your API key from: https://elevenlabs.io/

### 2. Voice Configuration

The service uses:
- **Voice**: Rachel (ID: `21m00Tcm4TlvDq8ikWAM`)
- **Model**: `eleven_multilingual_v2`
- **Settings**:
  - Stability: 0.5 (balanced clarity)
  - Similarity Boost: 0.75 (natural voice)
  - Style: 0.0 (neutral tone)
  - Speaker Boost: Enabled

You can change the voice ID in `services/geminiService.js` → `textToSpeech()` method.

## API Response Format

### Before TTS Integration

```json
{
  "success": true,
  "data": {
    "explanation": "Analysis text here...",
    "severity_level": "MODERATE",
    "confidence": 0.89,
    "timestamp": "2025-12-27T10:30:00.000Z",
    "model": "llama-3.3-70b-versatile"
  }
}
```

### After TTS Integration

```json
{
  "success": true,
  "data": {
    "explanation": "Analysis text here...",
    "audio": {
      "audio": "//uQx...base64data...==",
      "format": "mp3",
      "encoding": "base64"
    },
    "severity_level": "MODERATE",
    "confidence": 0.89,
    "timestamp": "2025-12-27T10:30:00.000Z",
    "model": "llama-3.3-70b-versatile"
  }
}
```

## Frontend Integration Examples

### 1. React/JavaScript (Auto-play)

```javascript
async function getAnalysisWithAudio() {
  const response = await fetch('/api/v2/ai/analyze-with-explanation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetGrade: 'GR20MnCr5',
      currentReading: { /* your reading data */ }
    })
  });

  const data = await response.json();

  // Display text
  document.getElementById('explanation').innerText = data.data.explanation;

  // Play audio if available
  if (data.data.audio) {
    const audioBlob = base64ToBlob(data.data.audio.audio, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  }
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, contentType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}
```

### 2. React Component with Play Button

```jsx
import React, { useState } from 'react';

function AIExplanation({ analysisData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  const handlePlayAudio = () => {
    if (analysisData.audio) {
      const audioBlob = base64ToBlob(analysisData.audio.audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);
      
      audioElement.onended = () => setIsPlaying(false);
      audioElement.play();
      setIsPlaying(true);
      setAudio(audioElement);
    }
  };

  const handleStopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="explanation-card">
      <h3>AI Analysis</h3>
      <p>{analysisData.explanation}</p>
      
      {analysisData.audio && (
        <button 
          onClick={isPlaying ? handleStopAudio : handlePlayAudio}
          className="audio-button"
        >
          {isPlaying ? '⏸️ Stop Audio' : '▶️ Listen to Explanation'}
        </button>
      )}
    </div>
  );
}
```

### 3. Download Audio Feature

```javascript
function downloadAudio(audioData) {
  const audioBlob = base64ToBlob(audioData.audio, 'audio/mpeg');
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-${Date.now()}.mp3`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## Available Endpoints

All these endpoints now return audio:

### 1. Complete Analysis with Explanation
```
POST /api/v2/ai/analyze-with-explanation
```

### 2. Explain Existing Analysis
```
POST /api/v2/ai/explain
```

### 3. What-If Analysis
```
POST /api/v2/ai/what-if
```

## Testing

Run the test suite:

```bash
# Start your server first
node server.js

# In another terminal, run the test
node test-tts-integration.js
```

This will:
1. Generate two MP3 files (`test-output-analysis.mp3` and `test-output-whatif.mp3`)
2. Test all endpoints with audio generation
3. Verify audio encoding and format

## Voice Selection

### Available Voices (Popular Choices)

You can change voices in `geminiService.js`. Here are some good options:

```javascript
// Current: Rachel (Professional Female)
'21m00Tcm4TlvDq8ikWAM'

// Adam (Deep Male)
'pNInz6obpgDQGcFmaJgB'

// Domi (Confident Female)
'AZnzlk1XvdvUeBnXmlld'

// Bella (Soft Female)
'EXAVITQu4vr4xnSDxMaL'

// Antoni (Well-rounded Male)
'ErXwobaYiN019PkySvjV'
```

To change voice, update this line in `textToSpeech()`:
```javascript
const audioStream = await this.elevenlabs.textToSpeech.convert(
  'YOUR_VOICE_ID_HERE',  // Change this
  { /* ... settings ... */ }
);
```

## Error Handling

The service handles TTS errors gracefully:

```javascript
// If TTS fails, you still get text explanation
{
  "success": true,
  "data": {
    "explanation": "Your text explanation...",
    "audio": null,  // Audio will be null if generation failed
    "severity_level": "MODERATE"
  }
}
```

Check server logs for TTS errors:
```
TTS generation failed: API rate limit exceeded
```

## Performance Considerations

### Audio Generation Time
- **Average**: 1-3 seconds for typical explanations
- **Depends on**: Text length, API response time
- **Tip**: Show loading indicator while generating

### File Sizes
- **Short explanation (100 words)**: ~50-100 KB
- **Medium explanation (300 words)**: ~150-300 KB
- **Long explanation (500 words)**: ~250-500 KB

### Optimization Tips

1. **Client-side caching**:
   ```javascript
   const audioCache = new Map();
   
   function getCachedAudio(explanationId) {
     return audioCache.get(explanationId);
   }
   ```

2. **Lazy loading**: Only generate audio when user clicks play button
   - Add a parameter: `generateAudio: boolean` to API requests
   - Implement in backend to conditionally call TTS

3. **Streaming**: For long explanations, consider splitting into chunks

## Troubleshooting

### No Audio Generated

Check:
1. ✅ `ELEVENLABS_API_KEY` is set in `config.env`
2. ✅ Server logs show: `"ElevenLabs TTS Service initialized successfully"`
3. ✅ API key is valid (test at elevenlabs.io)
4. ✅ You haven't exceeded rate limits

### Audio Not Playing in Browser

```javascript
// Check if audio data exists
if (!data.data.audio) {
  console.error('No audio data received');
}

// Verify base64 format
console.log('Audio encoding:', data.data.audio.encoding);
console.log('Audio format:', data.data.audio.format);
```

### Rate Limiting

Free tier limits:
- **10,000 characters/month**
- **~5,000 words/month**

Solution: Implement client-side toggle for audio generation.

## Production Deployment

### 1. Environment Variables

```env
# Production config.env
ELEVENLABS_API_KEY=sk_production_key_here
```

### 2. CORS Setup

Ensure audio can be played from your frontend domain:

```javascript
// app.js
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 3. CDN Considerations

For high-traffic scenarios, consider:
- Caching audio files in CDN (S3 + CloudFront)
- Generate audio once, store, and reuse for identical explanations

## Support

- **ElevenLabs Docs**: https://elevenlabs.io/docs
- **Voice Library**: https://elevenlabs.io/voice-library
- **API Status**: https://status.elevenlabs.io

## Example Use Cases

### 1. Accessibility
Operators with visual impairments can listen to explanations

### 2. Hands-Free Operation
Operators working with equipment can hear analysis without looking at screen

### 3. Training
New operators can learn by listening to expert explanations

### 4. Multi-tasking
Listen to analysis while preparing next operation

---

**Ready to use!** Your AI explanations now speak to your operators. 🎙️✨
