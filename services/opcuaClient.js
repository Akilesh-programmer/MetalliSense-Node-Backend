const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
} = require('node-opcua');

class OPCUAClientService {
  constructor() {
    this.client = null;
    this.session = null;
    this.isConnected = false;
    this.serverUrl = 'opc.tcp://localhost:4840/spectrometer/';
    this.namespace = 1;
  }

  // Establish connection to OPC UA server
  async connect() {
    try {
      if (this.isConnected) {
        return { success: true, message: 'Already connected' };
      }

      this.client = OPCUAClient.create({
        applicationName: 'MetalliSense-Client',
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 1,
        },
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        endpoint_must_exist: false,
      });

      await this.client.connect(this.serverUrl);
      this.session = await this.client.createSession();
      this.isConnected = true;

      console.log('✅ Connected to OPC UA Spectrometer Server');
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      console.error('❌ OPC UA Connection Error:', error.message);
      this.isConnected = false;
      throw new Error(`Failed to connect to spectrometer: ${error.message}`);
    }
  }

  // Close connection
  async disconnect() {
    try {
      if (!this.isConnected) {
        return { success: true, message: 'Already disconnected' };
      }

      if (this.session) {
        await this.session.close();
        this.session = null;
      }

      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      this.isConnected = false;
      console.log('✅ Disconnected from OPC UA Spectrometer Server');
      return { success: true, message: 'Disconnected successfully' };
    } catch (error) {
      console.error('❌ OPC UA Disconnection Error:', error.message);
      throw new Error(
        `Failed to disconnect from spectrometer: ${error.message}`,
      );
    }
  }


  // Read LatestReading node
  async getLatestReading() {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to spectrometer server');
      }

      const nodeId = `ns=${this.namespace};s=Spectrometer.LatestReading`;
      const dataValue = await this.session.read({
        nodeId,
        attributeId: AttributeIds.Value,
      });

      if (dataValue.statusCode.isGood()) {
        return dataValue.value.value;
      } else {
        throw new Error(
          `Failed to read latest reading: ${dataValue.statusCode.toString()}`,
        );
      }
    } catch (error) {
      console.error('❌ Get Latest Reading Error:', error.message);
      throw new Error(`Failed to get latest reading: ${error.message}`);
    }
  }


  // Write to MetalGrade & IncorrectElementsCount nodes
  async updateConfiguration(grade, count) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to spectrometer server');
      }

      const gradeNodeId = `ns=${this.namespace};s=Spectrometer.MetalGrade`;
      const countNodeId = `ns=${this.namespace};s=Spectrometer.IncorrectElementsCount`;

      // Write metal grade
      await this.session.write({
        nodeId: gradeNodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: {
            dataType: 'String',
            value: grade,
          },
        },
      });

      // Write incorrect elements count
      await this.session.write({
        nodeId: countNodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: {
            dataType: 'Int32',
            value: parseInt(count),
          },
        },
      });

      console.log(
        `✅ Configuration updated: ${grade}, ${count} incorrect elements`,
      );
      return { success: true, message: 'Configuration updated' };
    } catch (error) {
      console.error('❌ Update Configuration Error:', error.message);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  // Return connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      serverUrl: this.serverUrl,
      clientReady: this.client !== null,
      sessionActive: this.session !== null,
    };
  }
}

// Create singleton instance
const opcuaClientService = new OPCUAClientService();

module.exports = opcuaClientService;
