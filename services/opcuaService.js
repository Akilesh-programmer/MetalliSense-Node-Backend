const SpectrometerOPCUAServer = require('../opcua-server/opcuaServer');
const SpectrometerOPCUAClient = require('./opcuaClient');

class OPCUAService {
  constructor() {
    this.server = new SpectrometerOPCUAServer();
    this.client = new SpectrometerOPCUAClient();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing OPC UA Service...');

      // Initialize and start server first
      const serverInitialized = await this.server.initialize();
      if (!serverInitialized) {
        throw new Error('Failed to initialize OPC UA Server');
      }

      const serverStarted = await this.server.start();
      if (!serverStarted) {
        throw new Error('Failed to start OPC UA Server');
      }

      // Wait a moment for server to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Connect client to server
      const clientConnected = await this.client.connect();
      if (!clientConnected) {
        console.warn('Failed to connect OPC UA Client, but server is running');
      }

      this.isInitialized = true;
      console.log('OPC UA Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OPC UA Service:', error);
      return false;
    }
  }

  async requestSpectrometerReading(
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  ) {
    try {
      if (!this.isInitialized) {
        throw new Error('OPC UA Service not initialized');
      }

      // Set deviation elements on server (direct method call since it's same process)
      this.server.setDeviationElements(deviationElements);

      // Send request via OPC UA client
      const success = await this.client.writeRequestedGrade(
        metalGrade,
        deviationElements,
        deviationPercentage,
      );

      if (!success) {
        throw new Error('Failed to write requested grade to OPC server');
      }

      // Wait for reading to be generated and read it back
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const data = await this.client.readCurrentData();
      if (!data) {
        throw new Error('Failed to read data from OPC server');
      }

      return {
        success: true,
        data: {
          metalGrade: metalGrade.toUpperCase(),
          composition: data.composition,
          temperature: data.temperature,
          pressure: data.pressure,
          status: data.status,
          deviationElements: data.deviationElements,
          timestamp: new Date(),
          opcEndpoint: this.client.endpointUrl,
        },
      };
    } catch (error) {
      console.error('Error requesting spectrometer reading:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  getOPCStatus() {
    return {
      server: this.server.getStatus(),
      client: this.client.getConnectionStatus(),
      isInitialized: this.isInitialized,
    };
  }

  async shutdown() {
    try {
      console.log('Shutting down OPC UA Service...');

      if (this.client) {
        await this.client.disconnect();
      }

      if (this.server) {
        await this.server.stop();
      }

      this.isInitialized = false;
      console.log('OPC UA Service shut down successfully');
    } catch (error) {
      console.error('Error shutting down OPC UA Service:', error);
    }
  }
}

// Create singleton instance
const opcuaService = new OPCUAService();

module.exports = opcuaService;
