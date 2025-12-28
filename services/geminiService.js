const Groq = require('groq-sdk');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

class GeminiExplanationService {
  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY; // Using same env var for Groq API key
    this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!this.apiKey) {
      console.error('GOOGLE_GEMINI_API_KEY (Groq API Key) not found in environment variables');
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey: this.apiKey });
      console.log('Groq AI Service initialized successfully');
    }

    // Initialize ElevenLabs client
    if (!this.elevenlabsApiKey) {
      console.warn('ELEVENLABS_API_KEY not found - TTS will be disabled');
      this.elevenlabs = null;
    } else {
      this.elevenlabs = new ElevenLabsClient({ apiKey: this.elevenlabsApiKey });
      console.log('ElevenLabs TTS Service initialized successfully');
    }
    
    // Safety thresholds
    this.SAFETY_LIMITS = {
      MAX_ADDITION_PERCENT: 5, // Max 5% addition per element
      HIGH_RISK_THRESHOLD: 0.7, // Anomaly score threshold
    };
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.groq !== null;
  }

  /**
   * Check if TTS is available
   */
  isTTSAvailable() {
    return this.elevenlabs !== null;
  }

  /**
   * Clean markdown formatting from AI response
   */
  cleanMarkdownFormatting(text) {
    if (!text) return text;
    
    // Remove ### headings but keep the text
    text = text.replace(/^###\s+/gm, '');
    
    // Remove * bullet points but keep the text
    text = text.replace(/^\*\s+/gm, '');
    
    // Remove ** bold markers but keep the text
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    return text;
  }

  /**
   * Convert text to speech using ElevenLabs
   * @param {string} text - Text to convert to speech
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async textToSpeech(text) {
    if (!this.isTTSAvailable()) {
      throw new Error('ElevenLabs TTS service is not available');
    }

    try {
      // Use Rachel voice with Turbo v2 model (faster, more efficient for free tier)
      const audioStream = await this.elevenlabs.textToSpeech.convert('21m00Tcm4TlvDq8ikWAM', {
        text: text,
        model_id: 'eleven_turbo_v2', // Faster, cheaper model - better for free tier
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      });

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error);
      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  /**
   * Format grade specification for prompt
   */
  formatGradeSpec(gradeSpec) {
    if (!gradeSpec || !gradeSpec.composition_ranges) {
      return 'No specification available';
    }

    const ranges = gradeSpec.composition_ranges;
    const formatted = [];

    Object.keys(ranges).forEach((element) => {
      if (ranges[element] && ranges[element].length === 2) {
        formatted.push(
          `${element}: ${ranges[element][0]}% - ${ranges[element][1]}%`,
        );
      }
    });

    return formatted.join(', ');
  }

  /**
   * Calculate deviation details
   */
  calculateDeviations(composition, gradeSpec) {
    if (!gradeSpec || !gradeSpec.composition_ranges) {
      return { outOfSpec: [], deviations: {} };
    }

    const outOfSpec = [];
    const deviations = {};

    Object.keys(composition).forEach((element) => {
      const value = composition[element];
      const range = gradeSpec.composition_ranges[element];

      if (range && range.length === 2) {
        const [min, max] = range;
        let deviation = 0;

        if (value < min) {
          deviation = ((min - value) / min) * 100;
          outOfSpec.push({
            element,
            value,
            min,
            max,
            status: 'below',
            deviation: deviation.toFixed(2),
          });
        } else if (value > max) {
          deviation = ((value - max) / max) * 100;
          outOfSpec.push({
            element,
            value,
            min,
            max,
            status: 'above',
            deviation: deviation.toFixed(2),
          });
        }

        deviations[element] = {
          current: value,
          min,
          max,
          deviation: deviation.toFixed(2),
          status:
            value < min ? 'below' : value > max ? 'above' : 'within_spec',
        };
      }
    });

    return { outOfSpec, deviations };
  }

  /**
   * Build comprehensive explanation prompt
   */
  buildExplanationPrompt(analysisData) {
    const {
      composition,
      targetGrade,
      gradeSpec,
      anomalyResult,
      alloyResult,
      batchContext,
    } = analysisData;

    const { outOfSpec, deviations } = this.calculateDeviations(
      composition,
      gradeSpec,
    );

    // Build the detailed prompt
    const prompt = `You are an expert metallurgical AI assistant for MetalliSense foundry quality control system. Analyze the following situation and provide a comprehensive explanation for the foundry operator.

**CURRENT SITUATION:**
- Batch ID: ${batchContext?.batch_id || 'N/A'}
- Target Grade: ${targetGrade}
- Current Composition: Fe=${composition.Fe}%, C=${composition.C}%, Si=${composition.Si}%, Mn=${composition.Mn}%, P=${composition.P}%, S=${composition.S}%
- Furnace Temperature: ${batchContext?.furnace_temp || 'N/A'}°C
- Melt Time: ${batchContext?.melt_time_minutes || 'N/A'} minutes

**ML ANALYSIS:**
- Anomaly Detected: ${anomalyResult.is_anomaly ? 'YES' : 'NO'}
- Severity: ${anomalyResult.severity || 'UNKNOWN'}
- Anomaly Score: ${anomalyResult.anomaly_score || 'N/A'} (Confidence: ${anomalyResult.confidence ? (anomalyResult.confidence * 100).toFixed(1) : 'N/A'}%)
- Recommended Additions: ${JSON.stringify(alloyResult.recommended_additions || {})}
- Correction Confidence: ${alloyResult.confidence ? (alloyResult.confidence * 100).toFixed(1) : 'N/A'}%

**TARGET SPECIFICATION:**
${this.formatGradeSpec(gradeSpec)}

**ELEMENTS OUT OF SPECIFICATION:**
${outOfSpec.length > 0 ? outOfSpec.map((item) => `- ${item.element}: ${item.value}% (${item.status} limit: ${item.status === 'below' ? item.min : item.max}%, deviation: ${item.deviation}%)`).join('\n') : 'All elements within specification'}

**INSTRUCTIONS:**
Provide a structured response with the following sections:

1. **Deviation Analysis** (2-3 sentences)
   - Identify which elements are out of specification and by how much
   - Explain why this composition is flagged as ${anomalyResult.severity || 'unknown'} severity
   - Describe what metallurgical properties are affected (tensile strength, ductility, machinability, etc.)

2. **Root Cause Explanation** (2-3 sentences)
   - What likely caused these deviations? (e.g., insufficient inoculant, contaminated scrap, measurement drift)
   - Is this more likely a sensor issue or a genuine melt chemistry problem?

3. **Alloy Correction Justification** (3-4 sentences)
   - Explain why the ML model recommends these specific additions
   - What metallurgical goals do these additions achieve?
   - How will each element adjustment affect the final properties?

4. **Risk Assessment** (2-3 sentences)
   - What happens if the operator skips this correction?
   - Estimate rejection probability
   - List 2-3 potential quality defects

5. **Operator Action Plan** (Numbered steps)
   - Provide specific steps with approximate kg amounts (assume 1000kg melt)
   - Include re-measurement timing
   - Specify verification checkpoints
   - Indicate when to proceed to casting vs. additional correction

6. **Confidence & Limitations**
   - Explain what the confidence level means
   - Note any uncertainties
   - Indicate when to seek additional expert review

**TONE:** Professional but conversational. Use precise metallurgical terms when necessary but explain them briefly.

**SAFETY CONSTRAINTS:**
- Flag if any recommended addition exceeds ${this.SAFETY_LIMITS.MAX_ADDITION_PERCENT}%
- Always suggest re-testing after corrections
- Use probabilistic language ("likely", "estimated")
- Never guarantee outcomes

**FORMAT:** Use clear markdown formatting with headings, bullet points, and bold text for emphasis. Keep total response under 500 words.`;

    return prompt;
  }

  /**
   * Build what-if analysis prompt
   */
  buildWhatIfPrompt(analysisData, userQuestion) {
    const { composition, targetGrade, alloyResult } = analysisData;

    const prompt = `You are a metallurgical expert assisting with a foundry quality control decision.

**CURRENT CONTEXT:**
- Target Grade: ${targetGrade}
- Current Composition: Fe=${composition.Fe}%, C=${composition.C}%, Si=${composition.Si}%, Mn=${composition.Mn}%, P=${composition.P}%, S=${composition.S}%
- ML Recommendation: ${JSON.stringify(alloyResult.recommended_additions || {})}
- Confidence: ${alloyResult.confidence ? (alloyResult.confidence * 100).toFixed(1) : 'N/A'}%

**OPERATOR'S QUESTION:**
"${userQuestion}"

**PROVIDE:**

1. **Predicted Outcome** (2-3 sentences)
   What will likely happen with this alternative action?

2. **Quality Risk** (1 sentence with percentage)
   How much does rejection probability increase/decrease?

3. **Metallurgical Impact** (2-3 sentences)
   Specific property changes (tensile strength, hardness, machinability, etc.)

4. **Recommendation** (2 sentences)
   Should the operator proceed with this alternative? Why or why not?

**Keep response concise (150-200 words) and include risk percentages where possible.**`;

    return prompt;
  }

  /**
   * Build normal reading prompt (no anomaly)
   */
  buildNormalReadingPrompt(analysisData) {
    const { composition, targetGrade, gradeSpec, anomalyResult } =
      analysisData;

    const { deviations } = this.calculateDeviations(composition, gradeSpec);

    // Find elements near boundaries
    const nearBoundary = [];
    Object.keys(deviations).forEach((element) => {
      const dev = deviations[element];
      if (dev.status === 'within_spec') {
        const rangeSize = dev.max - dev.min;
        const distanceToMin = dev.current - dev.min;
        const distanceToMax = dev.max - dev.current;

        if (distanceToMin < rangeSize * 0.2 || distanceToMax < rangeSize * 0.2) {
          nearBoundary.push({
            element,
            value: dev.current,
            closeTo: distanceToMin < distanceToMax ? 'lower' : 'upper',
          });
        }
      }
    });

    const prompt = `You are a metallurgical quality control assistant. The current reading is NORMAL.

**SITUATION:**
- Target Grade: ${targetGrade}
- Current Composition: Fe=${composition.Fe}%, C=${composition.C}%, Si=${composition.Si}%, Mn=${composition.Mn}%, P=${composition.P}%, S=${composition.S}%
- Anomaly Score: ${anomalyResult.anomaly_score || 'N/A'} (NORMAL range)

**ELEMENTS NEAR SPECIFICATION BOUNDARIES:**
${nearBoundary.length > 0 ? nearBoundary.map((item) => `- ${item.element}: ${item.value}% (approaching ${item.closeTo} limit)`).join('\n') : 'All elements comfortably within specification'}

**PROVIDE A BRIEF ASSESSMENT:**

1. **Status Confirmation** (1-2 sentences)
   Why the ML model considers this reading normal

2. **Proactive Monitoring** (2-3 sentences)
   Which elements are near boundaries? What to watch for?

3. **Maintenance Suggestions** (2-3 sentences)
   Proactive actions to maintain quality (e.g., monitor Si drift, check temperature)

4. **Next Quality Check** (1 sentence)
   When should the next measurement occur?

**Keep it brief (150 words max), reassuring, and actionable. Use markdown formatting.**`;

    return prompt;
  }

  /**
   * Generate comprehensive explanation using Groq
   */
  async generateExplanation(analysisData, explanationType = 'comprehensive') {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Groq AI service not configured. Please set GOOGLE_GEMINI_API_KEY with Groq API key.',
      };
    }

    try {
      // Build prompt based on type
      let prompt;
      switch (explanationType) {
        case 'comprehensive':
          prompt = this.buildExplanationPrompt(analysisData);
          break;
        case 'normal':
          prompt = this.buildNormalReadingPrompt(analysisData);
          break;
        default:
          prompt = this.buildExplanationPrompt(analysisData);
      }

      // Generate content using Groq
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Fast and capable model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      });

      const rawExplanation = completion.choices[0]?.message?.content || '';
      const explanation = this.cleanMarkdownFormatting(rawExplanation);

      // Generate audio if TTS is available
      let audioData = null;
      if (this.isTTSAvailable()) {
        try {
          const audioBuffer = await this.textToSpeech(explanation);
          audioData = {
            audio: audioBuffer.toString('base64'),
            format: 'mp3',
            encoding: 'base64'
          };
        } catch (ttsError) {
          console.error('TTS generation failed:', ttsError.message);
          // Continue without audio
        }
      }

      // Parse and structure the response
      return {
        success: true,
        data: {
          explanation: explanation,
          audio: audioData,
          severity_level: analysisData.anomalyResult.severity || 'NORMAL',
          confidence: analysisData.alloyResult.confidence || null,
          timestamp: new Date().toISOString(),
          model: 'llama-3.3-70b-versatile',
        },
      };
    } catch (error) {
      console.error('Gemini AI Error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: {
          explanation: 'AI explanation service temporarily unavailable. Please refer to ML predictions and consult with a metallurgist for manual analysis.',
        },
      };
    }
  }

  /**
   * Generate what-if analysis
   */
  async generateWhatIfAnalysis(analysisData, userQuestion) {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Groq AI service not configured.',
      };
    }

    try {
      const prompt = this.buildWhatIfPrompt(analysisData, userQuestion);

      // Generate content using Groq
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const rawAnalysis = completion.choices[0]?.message?.content || '';
      const analysis = this.cleanMarkdownFormatting(rawAnalysis);

      // Generate audio if TTS is available
      let audioData = null;
      if (this.isTTSAvailable()) {
        try {
          const audioBuffer = await this.textToSpeech(analysis);
          audioData = {
            audio: audioBuffer.toString('base64'),
            format: 'mp3',
            encoding: 'base64'
          };
        } catch (ttsError) {
          console.error('TTS generation failed:', ttsError.message);
          // Continue without audio
        }
      }

      return {
        success: true,
        data: {
          question: userQuestion,
          analysis: analysis,
          audio: audioData,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Gemini What-If Analysis Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate safety constraints
   */
  validateSafetyConstraints(alloyRecommendations) {
    const warnings = [];
    const errors = [];

    Object.keys(alloyRecommendations).forEach((element) => {
      const amount = alloyRecommendations[element];
      
      if (amount > this.SAFETY_LIMITS.MAX_ADDITION_PERCENT) {
        errors.push(
          `⚠️ SAFETY ALERT: ${element} addition of ${amount}% exceeds safety limit of ${this.SAFETY_LIMITS.MAX_ADDITION_PERCENT}%. Manual metallurgist review required.`,
        );
      } else if (amount > this.SAFETY_LIMITS.MAX_ADDITION_PERCENT * 0.8) {
        warnings.push(
          `⚠️ WARNING: ${element} addition of ${amount}% is approaching safety limit. Exercise caution.`,
        );
      }
    });

    return { warnings, errors, isSafe: errors.length === 0 };
  }
}

// Create singleton instance
const geminiService = new GeminiExplanationService();

module.exports = geminiService;
