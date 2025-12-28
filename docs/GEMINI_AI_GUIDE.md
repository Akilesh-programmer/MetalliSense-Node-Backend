# Gemini AI Explanation Service - MetalliSense

## Overview

The Gemini AI Explanation Service translates complex machine learning predictions into clear, actionable explanations for foundry operators. It works alongside two trained ML models:

- **Anomaly Detection Agent**: Detects abnormal spectrometer readings using Isolation Forest
- **Alloy Correction Agent**: Recommends alloy additions using Gradient Boosting

## Features

✅ **Comprehensive Explanations**: Detailed analysis of ML predictions with metallurgical context  
✅ **Operator-Friendly Language**: Technical accuracy with conversational tone  
✅ **Risk Assessment**: Calculates rejection probabilities and potential defects  
✅ **Action Plans**: Step-by-step guidance with kg amounts and timing  
✅ **What-If Analysis**: Interactive scenario exploration for alternative actions  
✅ **Safety Validation**: Automatic checking of addition limits and constraints  
✅ **Confidence Calibration**: Acknowledges uncertainty and model limitations

---

## API Endpoints

### 1. Check Gemini Service Health

**Endpoint:** `GET /api/v2/ai/gemini/health`

**Description:** Verifies if the Gemini AI service is configured and available.

**Response:**
```json
{
  "status": "success",
  "data": {
    "geminiService": "available",
    "message": "Gemini AI service is ready",
    "timestamp": "2025-12-27T10:30:00.000Z"
  }
}
```

---

### 2. Get Explanation for Existing ML Predictions

**Endpoint:** `POST /api/v2/ai/explain`

**Description:** Takes existing ML predictions and generates a comprehensive operator-friendly explanation.

**Request Body:**
```json
{
  "metalGrade": "SG-IRON",
  "composition": {
    "Fe": 81.2,
    "C": 4.4,
    "Si": 3.1,
    "Mn": 0.4,
    "P": 0.05,
    "S": 0.02
  },
  "anomalyResult": {
    "is_anomaly": true,
    "severity": "HIGH",
    "anomaly_score": 0.87,
    "confidence": 0.93
  },
  "alloyResult": {
    "recommended_additions": {
      "Si": 0.22,
      "Mn": 0.15
    },
    "confidence": 0.91
  },
  "batchContext": {
    "batch_id": "BATCH-2025-001",
    "furnace_temp": 1450,
    "melt_time_minutes": 45
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "mlPredictions": {
      "anomaly": { ... },
      "alloyRecommendation": { ... }
    },
    "gradeSpecification": {
      "grade": "SG-IRON",
      "standard": "ASTM A536",
      "composition_ranges": { ... }
    },
    "geminiExplanation": {
      "explanation": "## 1. Deviation Analysis\n\nThe current melt shows...",
      "severity_level": "HIGH",
      "confidence": 0.91,
      "timestamp": "2025-12-27T10:30:00.000Z",
      "model": "gemini-2.0-flash-exp"
    },
    "safetyCheck": {
      "warnings": [],
      "errors": [],
      "isSafe": true
    },
    "batchContext": { ... }
  }
}
```

---

### 3. Complete Analysis with Explanation

**Endpoint:** `POST /api/v2/ai/analyze-with-explanation`

**Description:** Generates synthetic reading, runs ML analysis, and provides Gemini explanation in one call.

**Request Body:**
```json
{
  "metalGrade": "SG-IRON",
  "deviationElements": ["C", "Si"],
  "deviationPercentage": 15,
  "batchContext": {
    "batch_id": "BATCH-2025-002",
    "melt_time_minutes": 50
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "syntheticReading": {
      "composition": { ... },
      "temperature": 1465,
      "pressure": 1.02,
      "deviations": [ ... ]
    },
    "mlAnalysis": {
      "anomaly": { ... },
      "alloyRecommendation": { ... },
      "serviceAvailable": true
    },
    "gradeSpecification": { ... },
    "geminiExplanation": {
      "explanation": "Comprehensive markdown explanation...",
      "severity_level": "MEDIUM",
      "confidence": 0.88
    },
    "safetyCheck": { ... },
    "batchContext": { ... }
  }
}
```

---

### 4. What-If Analysis

**Endpoint:** `POST /api/v2/ai/what-if`

**Description:** Analyzes alternative actions proposed by the operator.

**Request Body:**
```json
{
  "metalGrade": "SG-IRON",
  "composition": {
    "Fe": 81.2,
    "C": 4.4,
    "Si": 3.1,
    "Mn": 0.4,
    "P": 0.05,
    "S": 0.02
  },
  "alloyResult": {
    "recommended_additions": {
      "Si": 0.22,
      "Mn": 0.15
    },
    "confidence": 0.91
  },
  "userQuestion": "What if I add only half the recommended silicon?"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "question": "What if I add only half the recommended silicon?",
    "analysis": "## Predicted Outcome\n\nAdding only 0.11% silicon...",
    "timestamp": "2025-12-27T10:30:00.000Z"
  }
}
```

---

## Explanation Structure

Gemini provides structured explanations with the following sections:

### 1. **Deviation Analysis** (2-3 sentences)
- Which elements are out of specification and by how much
- Why the composition is flagged at specific severity
- What metallurgical properties are affected

### 2. **Root Cause Explanation** (2-3 sentences)
- Likely causes of deviations
- Sensor issue vs. genuine chemistry problem

### 3. **Alloy Correction Justification** (3-4 sentences)
- Why specific additions are recommended
- Metallurgical goals of each addition
- How adjustments affect final properties

### 4. **Risk Assessment** (2-3 sentences)
- Consequences of skipping correction
- Estimated rejection probability
- Potential quality defects

### 5. **Operator Action Plan** (Numbered steps)
- Specific steps with kg amounts (assumes 1000kg melt)
- Re-measurement timing
- Verification checkpoints
- When to proceed vs. additional correction

### 6. **Confidence & Limitations**
- Explanation of confidence levels
- Remaining uncertainties
- When to seek expert review

---

## Safety Constraints

The service automatically validates:

- ⚠️ **Maximum Addition Limit**: Flags additions exceeding 5% per element
- ⚠️ **Re-testing Requirements**: Always recommends verification after corrections
- ⚠️ **Expert Review**: Indicates when manual metallurgist approval needed
- ⚠️ **Probabilistic Language**: Uses "likely", "estimated" instead of guarantees

**Safety Check Response:**
```json
{
  "warnings": [
    "⚠️ WARNING: Si addition of 4.2% is approaching safety limit. Exercise caution."
  ],
  "errors": [
    "⚠️ SAFETY ALERT: Mn addition of 6.5% exceeds safety limit of 5%. Manual metallurgist review required."
  ],
  "isSafe": false
}
```

---

## Example Use Cases

### Use Case 1: High Severity Anomaly
Operator receives a reading flagged as HIGH severity. The system provides:
- Detailed deviation analysis
- Root cause identification
- Step-by-step correction plan
- Risk assessment if correction is skipped

### Use Case 2: Normal Reading
Reading is within specification. The system provides:
- Confirmation of normal status
- Proactive monitoring suggestions
- Elements approaching boundaries
- Next quality check timing

### Use Case 3: Alternative Action Exploration
Operator wants to reduce silicon addition cost. The system analyzes:
- Impact of using less silicon
- Quality risk increase percentage
- Specific property changes
- Recommendation with reasoning

---

## Configuration

### Environment Variables

Set in `config.env`:

```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

### Model Configuration

Currently using: **gemini-2.0-flash-exp**

Configurable in `services/geminiService.js`:
```javascript
const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
```

---

## Error Handling

### Gemini Service Unavailable

If API key is not configured:
```json
{
  "status": "warning",
  "data": {
    "mlPredictions": { ... },
    "geminiExplanation": {
      "explanation": "AI explanation service temporarily unavailable. Please refer to ML predictions and consult with a metallurgist for manual analysis."
    }
  },
  "warning": "Gemini AI service not configured. Please set GOOGLE_GEMINI_API_KEY.",
  "message": "AI explanation unavailable. Showing ML predictions only."
}
```

### ML Service Unavailable

If ML endpoints are down, the system still provides explanations based on composition analysis and grade specifications.

---

## Testing

### Test Gemini Health

```bash
curl -X GET http://localhost:3000/api/v2/ai/gemini/health
```

### Test Complete Analysis

```bash
curl -X POST http://localhost:3000/api/v2/ai/analyze-with-explanation \
  -H "Content-Type: application/json" \
  -d '{
    "metalGrade": "SG-IRON",
    "deviationElements": ["C", "Si"],
    "deviationPercentage": 20
  }'
```

### Test What-If Analysis

```bash
curl -X POST http://localhost:3000/api/v2/ai/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "metalGrade": "SG-IRON",
    "composition": {
      "Fe": 81.2,
      "C": 4.4,
      "Si": 3.1,
      "Mn": 0.4,
      "P": 0.05,
      "S": 0.02
    },
    "alloyResult": {
      "recommended_additions": {
        "Si": 0.22,
        "Mn": 0.15
      },
      "confidence": 0.91
    },
    "userQuestion": "What if I skip the manganese addition?"
  }'
```

---

## Integration Flow

```
┌─────────────────┐
│   Operator      │
│   Interface     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│         MetalliSense Node Backend               │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Generate    │  │   ML Analysis        │   │
│  │  Synthetic   │──▶  (Anomaly + Alloy)   │   │
│  │  Reading     │  │                      │   │
│  └──────────────┘  └──────────┬───────────┘   │
│                                │               │
│                                ▼               │
│  ┌──────────────────────────────────────┐     │
│  │   Gemini AI Explanation Service      │     │
│  │   - Deviation Analysis               │     │
│  │   - Root Cause                       │     │
│  │   - Correction Justification         │     │
│  │   - Risk Assessment                  │     │
│  │   - Action Plan                      │     │
│  │   - Safety Validation                │     │
│  └──────────────┬───────────────────────┘     │
└─────────────────┼───────────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Operator sees:  │
         │  - Clear         │
         │    Explanation   │
         │  - Action Steps  │
         │  - Risk Info     │
         └─────────────────┘
```

---

## Best Practices

1. **Always Check Safety**: Review safety constraints before applying recommendations
2. **Verify Confidence**: Low confidence (<70%) should trigger manual review
3. **Use What-If**: Explore alternatives before making decisions
4. **Monitor Trends**: Track recurring issues for process improvements
5. **Document Actions**: Record decisions and outcomes for quality audits

---

## Troubleshooting

### Issue: "Gemini AI service not configured"
**Solution:** Set `GOOGLE_GEMINI_API_KEY` in `config.env`

### Issue: Slow response times
**Solution:** Gemini API can take 3-10 seconds. Consider implementing caching for similar queries.

### Issue: Generic explanations
**Solution:** Ensure grade specifications are properly loaded in MongoDB. Check that composition ranges are accurate.

### Issue: Safety warnings not appearing
**Solution:** Verify `SAFETY_LIMITS` in `geminiService.js` match your facility's requirements.

---

## Future Enhancements

- [ ] Response caching for similar compositions
- [ ] Historical trend analysis integration
- [ ] Multi-language support for international operators
- [ ] Voice-enabled explanations for hands-free operation
- [ ] Batch optimization recommendations
- [ ] Integration with ERP systems for material costing

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify all environment variables are set
- Ensure ML service endpoints are reachable
- Test with sample data first

---

## License

Part of MetalliSense Industrial Quality Control System
© 2025 All Rights Reserved
