# Gemini AI Quick Reference for Operators

## 🎯 What is Gemini AI?

Gemini AI is your intelligent assistant that explains what the machine learning models are telling you about your melt quality. It translates complex ML predictions into clear, actionable steps.

---

## 🔍 When to Use

### Use Gemini Explanations When:
- ✅ You receive an anomaly alert
- ✅ You're unsure why an addition is recommended
- ✅ You want to understand quality risks
- ✅ You're considering alternative actions
- ✅ You need step-by-step guidance

---

## 📊 Understanding the Output

### Severity Levels

| Level | Meaning | Action Required |
|-------|---------|----------------|
| **NORMAL** | Everything looks good | Routine monitoring |
| **LOW** | Minor deviations | Watch closely, may need minor adjustments |
| **MEDIUM** | Significant issues | Corrections recommended |
| **HIGH** | Major problems | Immediate action required |
| **CRITICAL** | Severe quality risk | Stop and consult metallurgist |

### Confidence Levels

| Confidence | Meaning | What to Do |
|------------|---------|-----------|
| **90-100%** | Very reliable | Follow recommendations |
| **80-89%** | Reliable | Safe to follow, verify results |
| **70-79%** | Moderate | Use caution, double-check |
| **< 70%** | Uncertain | Consult metallurgist before proceeding |

---

## 🛡️ Safety Indicators

### ⚠️ Warning Signs

**🟢 SAFE**: All recommendations within normal limits
- Proceed with confidence
- Follow action plan as provided

**🟡 WARNING**: Approaching safety limits
- Exercise caution
- Consider smaller additions
- Monitor closely

**🔴 UNSAFE**: Exceeds safety limits
- **DO NOT PROCEED**
- Consult metallurgist immediately
- Manual review required

---

## 📝 Reading the Explanation

### Section 1: Deviation Analysis
**What it tells you:** Which elements are off-target and why it matters

**Look for:**
- Elements above or below specification
- Percentage deviation
- Impact on final product properties

**Example:**
> "Silicon is 15% above target, reducing ductility and increasing brittleness risk."

---

### Section 2: Root Cause
**What it tells you:** Why this happened

**Common causes:**
- Insufficient inoculant
- Contaminated scrap metal
- Sensor calibration drift
- Temperature fluctuations

---

### Section 3: Correction Justification
**What it tells you:** Why specific additions are needed

**Look for:**
- Element being added
- Target property improvement
- Metallurgical reasoning

**Example:**
> "Adding 0.22% silicon will restore graphite formation, improving tensile strength by ~8%."

---

### Section 4: Risk Assessment
**What it tells you:** What happens if you don't act

**Look for:**
- Rejection probability (%)
- Specific defects that may occur
- Cost implications

**Example:**
> "Skipping correction: 65% rejection risk. Likely defects: carbide formation, reduced machinability."

---

### Section 5: Action Plan
**What it tells you:** Exactly what to do

**Follow these steps in order:**
1. Add specified amounts (kg)
2. Wait for mixing time
3. Re-measure composition
4. Verify results
5. Proceed to casting OR repeat correction

**Example:**
```
Step 1: Add 2.2 kg silicon (for 1000kg melt)
Step 2: Mix for 10 minutes at 1450°C
Step 3: Take new spectrometer reading
Step 4: Verify Si is within 2.0-3.0% range
Step 5: If verified, proceed to casting
```

---

### Section 6: Confidence & Limitations
**What it tells you:** How certain the AI is

**Look for:**
- Confidence percentage
- Uncertainties mentioned
- When to get help

---

## ❓ Using What-If Analysis

### When to Use
- You want to try a different approach
- Recommended additions are expensive
- You have limited materials available
- You're training new operators

### Example Questions You Can Ask

**Cost-Related:**
- "What if I add only half the recommended silicon?"
- "What if I use a cheaper alloy substitute?"

**Time-Related:**
- "What if I skip this correction and adjust in the next batch?"
- "What if I increase temperature instead of adding materials?"

**Material-Constrained:**
- "What if I don't have enough manganese?"
- "What if I use scrap steel instead of pure iron?"

### Understanding What-If Responses

**Predicted Outcome:** What will happen
**Quality Risk:** How much rejection probability increases (+%) or decreases (-%)
**Metallurgical Impact:** Specific property changes
**Recommendation:** Should you do it? Yes/No with reasoning

---

## 🚨 Critical Safety Rules

### ALWAYS:
✅ Check safety indicators before acting  
✅ Re-test after making corrections  
✅ Document your actions and results  
✅ Consult metallurgist if confidence < 70%  
✅ Stop if you see "UNSAFE" warnings  

### NEVER:
❌ Add more than 5% of any element at once  
❌ Skip re-testing after corrections  
❌ Ignore CRITICAL severity alerts  
❌ Proceed if safety check shows errors  
❌ Guarantee outcomes to customers  

---

## 🔧 Common Scenarios

### Scenario 1: High Severity Anomaly
**What you see:** Big red alert, multiple elements out of spec

**What to do:**
1. Read the deviation analysis carefully
2. Check if it's a sensor issue (re-measure if unsure)
3. Follow the action plan step-by-step
4. Re-test after each major addition
5. Don't proceed to casting until verified

---

### Scenario 2: Normal Reading
**What you see:** Green status, all elements in spec

**What to do:**
1. Check for elements near boundaries
2. Note any proactive suggestions
3. Continue normal operations
4. Schedule next quality check as recommended

---

### Scenario 3: Medium Severity with Low Confidence
**What you see:** Orange alert but confidence is 65%

**What to do:**
1. **DO NOT proceed alone**
2. Show data to senior operator or metallurgist
3. Consider taking additional measurements
4. Wait for manual approval before corrections

---

### Scenario 4: Cost-Constrained Situation
**What you see:** Expensive alloy addition recommended

**What to do:**
1. Use What-If analysis: "What if I add half?"
2. Review quality risk increase
3. Decide based on batch criticality
4. Document decision and reasoning

---

## 📞 When to Call for Help

### Immediate Metallurgist Consultation Required:
- 🔴 CRITICAL severity
- 🔴 Safety errors present
- 🔴 Confidence < 70%
- 🔴 Unusual readings (never seen before)
- 🔴 Multiple corrections failed
- 🔴 Customer-critical batch

### Can Handle with Supervision:
- 🟡 HIGH severity with >80% confidence
- 🟡 MEDIUM severity with clear action plan
- 🟡 Alternative action exploration
- 🟡 Routine process optimization

### Can Handle Independently:
- 🟢 NORMAL readings
- 🟢 LOW severity with >90% confidence
- 🟢 Standard operating procedures
- 🟢 Routine quality checks

---

## 💡 Tips for Best Results

### Before Taking Action:
1. Read the entire explanation, not just the action plan
2. Check safety indicators
3. Verify confidence level
4. Make sure you have the right materials
5. Confirm furnace conditions are stable

### During Correction:
1. Measure additions accurately (use scales)
2. Add materials gradually, not all at once
3. Allow proper mixing time
4. Monitor temperature
5. Watch for unusual reactions

### After Correction:
1. Re-test within recommended timeframe
2. Compare results to targets
3. Document what you did
4. Note any unexpected outcomes
5. Report to shift supervisor

---

## 📚 Metallurgical Terms Explained

| Term | Meaning | Why It Matters |
|------|---------|---------------|
| **Tensile Strength** | How much force before breaking | Higher = stronger, less breakage |
| **Ductility** | How much it can bend without breaking | Higher = more flexible, less brittle |
| **Machinability** | How easy it is to cut/machine | Better = easier to work with, lower tool wear |
| **Hardness** | Resistance to scratching/denting | Higher = more wear-resistant |
| **Graphite Formation** | Carbon structure in iron | Proper formation = better properties |
| **Carbide Formation** | Hard, brittle carbon compounds | Too much = brittle, hard to machine |
| **Inoculant** | Additive for graphite control | Helps create desired structure |

---

## 🎓 Learning Mode

As you use the system more:
- Compare AI recommendations to actual outcomes
- Note which suggestions work best
- Share insights with your team
- Build your metallurgical intuition
- Trust the system more as you verify accuracy

**Remember:** The AI is a tool to help you make better decisions, not to replace your expertise and judgment.

---

## 📞 Support Contacts

- **Urgent Quality Issues:** Contact Senior Metallurgist
- **System Issues:** Contact IT Support
- **Questions about AI:** Review this guide or ask supervisor
- **Safety Concerns:** Stop work and notify supervisor immediately

---

## ✅ Quick Checklist

Before proceeding with any correction:

- [ ] Read full explanation
- [ ] Check severity level
- [ ] Verify confidence > 70%
- [ ] Review safety indicators
- [ ] Confirm materials available
- [ ] Understand why correction needed
- [ ] Know what properties will improve
- [ ] Prepared to re-test
- [ ] Documented batch ID and actions

---

**Remember:** When in doubt, ask for help. Quality and safety come first!

---

*Last Updated: December 27, 2025*  
*MetalliSense Quality Control System*
