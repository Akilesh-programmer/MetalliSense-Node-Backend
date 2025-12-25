const axios = require('axios');

class AIService {
  constructor() {
    // Individual endpoints URL (anomaly detection, alloy recommendation)
    this.individualURL =
      process.env.AI_SERVICE_INDIVIDUAL_URL || 'http://localhost:8000';
    // Agent endpoint URL (coordinated agent analysis)
    this.agentURL = process.env.AI_SERVICE_AGENT_URL || 'http://localhost:8000';
    this.timeout = 30000; // 30 seconds timeout

    console.log('AI Service Configuration:');
    console.log('  Individual Endpoints URL:', this.individualURL);
    console.log('  Agent Endpoint URL:', this.agentURL);
  }

  // Individual Endpoints

  /**
   * Detect anomalies in composition using individual endpoint
   * @param {Object} composition - Element composition {Fe, C, Si, Mn, P, S}
   * @returns {Promise<Object>} Anomaly detection result
   */
  async detectAnomaly(composition) {
    try {
      const response = await axios.post(
        `${this.individualURL}/anomaly/predict`,
        { composition },
        { timeout: this.timeout },
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('AI Service - Anomaly Detection Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        fallback: {
          anomaly_score: null,
          severity: 'UNKNOWN',
          message: 'AI service unavailable',
        },
      };
    }
  }

  /**
   * Get alloy addition recommendations using individual endpoint
   * @param {string} grade - Metal grade
   * @param {Object} composition - Element composition {Fe, C, Si, Mn, P, S}
   * @returns {Promise<Object>} Alloy recommendation result
   */
  async recommendAlloy(grade, composition) {
    try {
      const response = await axios.post(
        `${this.individualURL}/alloy/recommend`,
        { grade, composition },
        { timeout: this.timeout },
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('AI Service - Alloy Recommendation Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        fallback: {
          recommended_additions: {},
          confidence: null,
          message: 'AI service unavailable',
          warning: 'Could not generate recommendations',
        },
      };
    }
  }

  /**
   * Analyze composition using individual endpoints (calls both sequentially)
   * @param {string} grade - Metal grade
   * @param {Object} composition - Element composition {Fe, C, Si, Mn, P, S}
   * @returns {Promise<Object>} Combined analysis result
   */
  async analyzeIndividual(grade, composition) {
    try {
      // Call both endpoints in parallel
      const [anomalyResult, alloyResult] = await Promise.all([
        this.detectAnomaly(composition),
        this.recommendAlloy(grade, composition),
      ]);

      return {
        success: anomalyResult.success && alloyResult.success,
        anomaly: anomalyResult.success
          ? anomalyResult.data
          : anomalyResult.fallback,
        alloy: alloyResult.success ? alloyResult.data : alloyResult.fallback,
        errors: {
          anomaly: anomalyResult.success ? null : anomalyResult.error,
          alloy: alloyResult.success ? null : alloyResult.error,
        },
      };
    } catch (error) {
      console.error('AI Service - Individual Analysis Error:', error.message);
      throw error;
    }
  }

  // Agent Endpoint

  /**
   * Analyze composition using agent endpoint (coordinated analysis)
   * @param {string} grade - Metal grade
   * @param {Object} composition - Element composition {Fe, C, Si, Mn, P, S}
   * @returns {Promise<Object>} Agent analysis result
   */
  async analyzeWithAgent(grade, composition) {
    try {
      const response = await axios.post(
        `${this.agentURL}/agents/analyze`,
        { grade, composition },
        { timeout: this.timeout },
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('AI Service - Agent Analysis Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        fallback: {
          anomaly_agent: {
            agent: 'AnomalyDetectionAgent',
            anomaly_score: null,
            severity: 'UNKNOWN',
            confidence: null,
            explanation: 'AI service unavailable',
          },
          alloy_agent: {
            agent: 'AlloyCorrectionAgent',
            recommended_additions: {},
            confidence: null,
            explanation: 'AI service unavailable',
          },
          final_note: 'AI analysis unavailable - human approval required',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Health check for AI service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.individualURL}/health`, {
        timeout: 5000,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('AI Service - Health Check Error:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'unavailable',
      };
    }
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;
