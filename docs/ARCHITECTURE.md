# MetalliSense Gemini AI Architecture

## System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                    METALLISENSE SYSTEM ARCHITECTURE                 │
└────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │    Operator     │
                          │   Interface     │
                          │   (Frontend)    │
                          └────────┬────────┘
                                   │
                                   │ HTTP Requests
                                   │
                    ┌──────────────▼──────────────┐
                    │   Node.js Backend Server    │
                    │   (Express + MongoDB)       │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
    │   ML Services    │  │   Database   │  │  Gemini AI API   │
    │  (Python APIs)   │  │  (MongoDB)   │  │   (Google)       │
    │                  │  │              │  │                  │
    │ • Anomaly Det.   │  │ • GradeSpec  │  │ • Explanations   │
    │ • Alloy Rec.     │  │ • TrainingData│ │ • What-If        │
    │ • Agent Mode     │  │ • Readings   │  │ • Analysis       │
    └──────────────────┘  └──────────────┘  └──────────────────┘
```

---

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                      ANALYSIS REQUEST FLOW                         │
└───────────────────────────────────────────────────────────────────┘

1. OPERATOR REQUEST
   │
   │  POST /api/v2/ai/analyze-with-explanation
   │  {
   │    metalGrade: "SG-IRON",
   │    deviationElements: ["C", "Si"],
   │    deviationPercentage: 20
   │  }
   │
   ▼

2. GENERATE SYNTHETIC READING
   │
   │  • Fetch grade specification from MongoDB
   │  • Get random training sample
   │  • Apply deviations to specified elements
   │  • Generate temperature & pressure
   │
   ▼

3. ML ANALYSIS (Parallel)
   │
   ├──► ANOMALY DETECTION (Python ML)
   │    POST http://172.31.99.5:8000/anomaly/predict
   │    Returns: {is_anomaly, severity, score, confidence}
   │
   └──► ALLOY RECOMMENDATION (Python ML)
        POST http://172.31.99.5:8000/alloy/recommend
        Returns: {recommended_additions, confidence}
   │
   ▼

4. FETCH GRADE SPECIFICATION
   │
   │  MongoDB.findOne({ grade: "SG-IRON" })
   │  Returns: {composition_ranges, standards, properties}
   │
   ▼

5. CALCULATE DEVIATIONS
   │
   │  For each element:
   │    • Compare current vs. specification range
   │    • Calculate percentage deviation
   │    • Identify out-of-spec elements
   │    • Flag elements near boundaries
   │
   ▼

6. SAFETY VALIDATION
   │
   │  For each recommended addition:
   │    • Check if > 5% (error)
   │    • Check if > 4% (warning)
   │    • Check if < 70% confidence (caution)
   │
   ▼

7. BUILD GEMINI PROMPT
   │
   │  • Include current composition
   │  • Include target specification
   │  • Include ML predictions
   │  • Include deviation analysis
   │  • Include batch context
   │  • Add safety constraints
   │  • Add formatting instructions
   │
   ▼

8. GENERATE EXPLANATION (Google Gemini API)
   │
   │  POST https://generativelanguage.googleapis.com/v1beta/...
   │  Model: gemini-2.0-flash-exp
   │  
   │  Returns markdown explanation with:
   │    1. Deviation Analysis
   │    2. Root Cause Explanation
   │    3. Alloy Correction Justification
   │    4. Risk Assessment
   │    5. Operator Action Plan
   │    6. Confidence & Limitations
   │
   ▼

9. BUILD COMPREHENSIVE RESPONSE
   │
   │  {
   │    syntheticReading: {...},
   │    mlAnalysis: {...},
   │    gradeSpecification: {...},
   │    geminiExplanation: {...},
   │    safetyCheck: {...},
   │    batchContext: {...}
   │  }
   │
   ▼

10. RETURN TO OPERATOR
    │
    │  JSON Response (200 OK)
    │  Operator sees:
    │    • Clear explanation in plain language
    │    • Step-by-step action plan
    │    • Safety warnings (if any)
    │    • Confidence indicators
    │
    └──► Operator follows action plan
```

---

## Component Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND STRUCTURE                            │
└────────────────────────────────────────────────────────────────┘

app.js (Main Application)
  │
  ├── Middleware Setup
  │   ├── CORS
  │   ├── Helmet (Security)
  │   ├── Rate Limiting
  │   ├── Body Parser
  │   └── Error Handling
  │
  └── Routes
      └── /api/v2/ai (AI Routes)

routes/aiRoutes.js
  │
  ├── GET  /health                      → getAIServiceHealth
  ├── GET  /gemini/health              → getGeminiHealth
  ├── POST /individual/analyze          → analyzeIndividual
  ├── POST /agent/analyze               → analyzeWithAgent
  ├── POST /explain                     → explainAnalysis ★
  ├── POST /analyze-with-explanation    → analyzeWithExplanation ★
  └── POST /what-if                     → whatIfAnalysis ★

controllers/aiController.js
  │
  ├── generateSyntheticReading()
  ├── analyzeIndividual()
  ├── analyzeWithAgent()
  ├── getAIServiceHealth()
  │
  ├── ★ explainAnalysis()               [NEW]
  ├── ★ analyzeWithExplanation()        [NEW]
  ├── ★ whatIfAnalysis()                [NEW]
  └── ★ getGeminiHealth()               [NEW]

services/
  │
  ├── aiService.js (ML Integration)
  │   ├── detectAnomaly()
  │   ├── recommendAlloy()
  │   ├── analyzeIndividual()
  │   ├── analyzeWithAgent()
  │   └── healthCheck()
  │
  └── ★ geminiService.js (NEW)
      ├── generateExplanation()
      ├── generateWhatIfAnalysis()
      ├── buildExplanationPrompt()
      ├── buildWhatIfPrompt()
      ├── buildNormalReadingPrompt()
      ├── calculateDeviations()
      ├── formatGradeSpec()
      ├── validateSafetyConstraints()
      └── isAvailable()

models/ (MongoDB Schemas)
  │
  ├── gradeSpecModel.js
  ├── trainingDataModel.js
  ├── metalGradeModel.js
  └── spectrometerReadingModel.js
```

---

## API Endpoint Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                               │
└─────────────────────────────────────────────────────────────────┘

BASE URL: http://localhost:3000/api/v2/ai

┌─────────────────────────────────────────────────────────────────┐
│ HEALTH CHECKS                                                    │
├─────────────────────────────────────────────────────────────────┤
│ GET  /health              ML service health                      │
│ GET  /gemini/health       Gemini service health        [NEW] ★  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ML ANALYSIS (Existing)                                           │
├─────────────────────────────────────────────────────────────────┤
│ POST /individual/analyze  Separate anomaly + alloy calls        │
│ POST /agent/analyze       Coordinated agent analysis            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GEMINI EXPLANATIONS (New)                                ★       │
├─────────────────────────────────────────────────────────────────┤
│ POST /explain                   Explain existing ML predictions  │
│ POST /analyze-with-explanation  Complete analysis + explanation │
│ POST /what-if                   Alternative scenario analysis   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICE CONNECTIONS                       │
└────────────────────────────────────────────────────────────────┘

1. ML SERVICES (Python)
   ┌─────────────────────────────────────────┐
   │ Anomaly Detection Service               │
   │ URL: http://172.31.99.5:8000           │
   │ Endpoint: /anomaly/predict             │
   │ Method: POST                           │
   │ Input: {composition}                   │
   │ Output: {is_anomaly, severity, score}  │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ Alloy Recommendation Service            │
   │ URL: http://172.31.99.5:8000           │
   │ Endpoint: /alloy/recommend             │
   │ Method: POST                           │
   │ Input: {grade, composition}            │
   │ Output: {recommended_additions}        │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ Agent Service                           │
   │ URL: http://172.31.99.5:8001           │
   │ Endpoint: /agents/analyze              │
   │ Method: POST                           │
   │ Input: {grade, composition}            │
   │ Output: {anomaly_agent, alloy_agent}   │
   └─────────────────────────────────────────┘

2. GEMINI AI (Google) ★
   ┌─────────────────────────────────────────┐
   │ Google Generative AI API                │
   │ Model: gemini-2.0-flash-exp            │
   │ Auth: GOOGLE_GEMINI_API_KEY            │
   │ Method: generateContent()              │
   │ Input: Prompt string                   │
   │ Output: Markdown explanation           │
   └─────────────────────────────────────────┘

3. DATABASE (MongoDB)
   ┌─────────────────────────────────────────┐
   │ MongoDB Atlas                           │
   │ URI: mongodb+srv://...                 │
   │ Collections:                           │
   │   • gradespecs                         │
   │   • trainingdata                       │
   │   • metalGrades                        │
   │   • spectrometerReadings               │
   └─────────────────────────────────────────┘
```

---

## Safety Validation Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   SAFETY VALIDATION LOGIC                       │
└────────────────────────────────────────────────────────────────┘

Recommended Additions
  │
  │  {Si: 0.22, Mn: 0.15}
  │
  ▼
┌────────────────────────┐
│ For Each Element       │
└────────────────────────┘
  │
  ├─► Check if > 5.0% ───────► ERROR ⛔
  │   "SAFETY ALERT: Manual review required"
  │
  ├─► Check if > 4.0% ───────► WARNING ⚠️
  │   "WARNING: Approaching safety limit"
  │
  └─► Check if ≤ 4.0% ───────► SAFE ✅
      "Proceed with caution"

Safety Check Result
  │
  │  {
  │    warnings: [...],
  │    errors: [...],
  │    isSafe: true/false
  │  }
  │
  ▼
Include in Response
  │
  └─► If NOT safe → Prevent operator action
      If Safe → Allow with warnings displayed
```

---

## Prompt Engineering Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    GEMINI PROMPT STRUCTURE                      │
└────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────┐
│ 1. CONTEXT SETTING                    │
│   "You are an expert metallurgist..." │
│   Role definition + tone              │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ 2. CURRENT SITUATION                  │
│   • Batch ID                          │
│   • Target grade                      │
│   • Current composition               │
│   • Furnace conditions                │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ 3. ML ANALYSIS RESULTS                │
│   • Anomaly detection output          │
│   • Severity & confidence             │
│   • Recommended additions             │
│   • Correction confidence             │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ 4. TARGET SPECIFICATION               │
│   • Grade spec ranges                 │
│   • Deviation details                 │
│   • Elements out of spec              │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ 5. INSTRUCTIONS                       │
│   Requested sections:                 │
│   1. Deviation Analysis               │
│   2. Root Cause                       │
│   3. Correction Justification         │
│   4. Risk Assessment                  │
│   5. Action Plan                      │
│   6. Confidence & Limitations         │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ 6. CONSTRAINTS                        │
│   • Safety limits                     │
│   • Tone requirements                 │
│   • Format requirements               │
│   • Word count limits                 │
└───────────────────────────────────────┘
           ▼
┌───────────────────────────────────────┐
│ GEMINI GENERATES                      │
│ Structured Markdown Explanation       │
└───────────────────────────────────────┘
```

---

## Error Handling Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW                        │
└────────────────────────────────────────────────────────────────┘

Request Received
  │
  ▼
┌─────────────────────────┐
│ Validate Input          │
│ • Required fields       │
│ • Data types            │
│ • Value ranges          │
└─────────────────────────┘
  │
  ├─► INVALID ──► 400 Bad Request
  │               Return error message
  │
  ▼
┌─────────────────────────┐
│ Call ML Services        │
│ (with timeout)          │
└─────────────────────────┘
  │
  ├─► TIMEOUT/ERROR ──► Use fallback data
  │                     Continue with warning
  │
  ▼
┌─────────────────────────┐
│ Fetch Grade Spec        │
└─────────────────────────┘
  │
  ├─► NOT FOUND ──► 404 Not Found
  │                  "Grade not found"
  │
  ▼
┌─────────────────────────┐
│ Call Gemini API         │
│ (with timeout)          │
└─────────────────────────┘
  │
  ├─► NOT CONFIGURED ──► Return ML data only
  │                      Add warning message
  │
  ├─► TIMEOUT ──► Return fallback explanation
  │               "AI service unavailable"
  │
  ├─► API ERROR ──► Log error, return fallback
  │                 Continue operation
  │
  ▼
┌─────────────────────────┐
│ Return Success          │
│ 200 OK with full data   │
└─────────────────────────┘

PRINCIPLE: Graceful degradation
• Never fail completely
• Always provide useful information
• Clear error messages
• Fallback to ML predictions if AI unavailable
```

---

## Future Enhancement Opportunities

```
┌────────────────────────────────────────────────────────────────┐
│                    POTENTIAL ENHANCEMENTS                       │
└────────────────────────────────────────────────────────────────┘

1. CACHING LAYER
   ┌──────────────────────────────────────┐
   │ Redis Cache                           │
   │ • Cache similar composition queries   │
   │ • TTL: 1 hour                        │
   │ • Reduce Gemini API calls            │
   └──────────────────────────────────────┘

2. BATCH OPTIMIZATION
   ┌──────────────────────────────────────┐
   │ Multi-Batch Analysis                  │
   │ • Analyze multiple batches together   │
   │ • Identify trends                    │
   │ • Optimize material usage            │
   └──────────────────────────────────────┘

3. HISTORICAL TRACKING
   ┌──────────────────────────────────────┐
   │ Explanation History                   │
   │ • Store all explanations             │
   │ • Track operator decisions           │
   │ • Measure outcome accuracy           │
   │ • Continuous improvement             │
   └──────────────────────────────────────┘

4. MULTI-LANGUAGE SUPPORT
   ┌──────────────────────────────────────┐
   │ Internationalization                  │
   │ • Detect operator language           │
   │ • Translate explanations             │
   │ • Localize terminology               │
   └──────────────────────────────────────┘

5. VOICE INTERFACE
   ┌──────────────────────────────────────┐
   │ Hands-Free Operation                  │
   │ • Text-to-speech explanations        │
   │ • Voice commands for what-if         │
   │ • Ideal for foundry floor            │
   └──────────────────────────────────────┘

6. PREDICTIVE MAINTENANCE
   ┌──────────────────────────────────────┐
   │ Equipment Health Monitoring           │
   │ • Detect sensor drift patterns       │
   │ • Predict calibration needs          │
   │ • Schedule preventive maintenance    │
   └──────────────────────────────────────┘
```

---

## Deployment Checklist

```
┌────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                        │
└────────────────────────────────────────────────────────────────┘

PRE-DEPLOYMENT
  □ Set GOOGLE_GEMINI_API_KEY in production environment
  □ Verify ML service URLs are accessible
  □ Test MongoDB connection from production server
  □ Configure CORS for production frontend URL
  □ Set NODE_ENV=production
  □ Test all endpoints with production-like data
  □ Run npm run test:gemini successfully
  □ Review and adjust rate limits
  □ Configure logging (Morgan, Winston, etc.)
  □ Set up error monitoring (Sentry, etc.)

DEPLOYMENT
  □ Deploy code to production server
  □ Install dependencies: npm install --production
  □ Start server: npm start:prod
  □ Verify health endpoints respond
  □ Test sample analysis request
  □ Check server logs for errors
  □ Monitor initial requests

POST-DEPLOYMENT
  □ Train operators on new features
  □ Monitor API usage and costs
  □ Track explanation accuracy
  □ Collect operator feedback
  □ Document any issues
  □ Plan iterative improvements

ONGOING
  □ Monitor Gemini API quota usage
  □ Review explanation quality regularly
  □ Update prompts based on feedback
  □ Keep documentation current
  □ Track success metrics
```

---

*Architecture Documentation - MetalliSense v1.0*  
*Last Updated: December 27, 2025*
