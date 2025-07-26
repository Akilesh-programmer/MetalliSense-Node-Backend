const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  ClientSubscription,
  TimestampsToReturn,
} = require('node-opcua');

class SpectrometerOPCUAClient {
  constructor() {
    this.client = null;
    this.session = null;
    this.subscription = null;
    this.endpointUrl = 'opc.tcp://localhost:4334/MetalliSense/Spectrometer';
    this.isConnected = false;
    this.connectionStatus = 'Disconnected';
    this.lastError = null;
    this.monitoredItems = {};
    this.dataCache = {
      composition: {},
      status: 'Unknown',
      temperature: 0,
      pressure: 0,
      deviationElements: [],
    };
  }

  async connect() {
    try {
      this.connectionStatus = 'Connecting...';

      // Create client
      this.client = OPCUAClient.create({
        applicationName: 'MetalliSense Backend Client',
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 3,
        },
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        endpointMustExist: false,
      });

      // Connect to server
      await this.client.connect(this.endpointUrl);

      // Create session
      this.session = await this.client.createSession();

      this.isConnected = true;
      this.connectionStatus = 'Connected';
      this.lastError = null;

      console.log('OPC UA Client connected successfully');

      // Start monitoring key variables
      await this.startMonitoring();

      return true;
    } catch (error) {
      console.error('Failed to connect OPC UA Client:', error);
      this.connectionStatus = 'Connection Failed';
      this.lastError = error.message;
      this.isConnected = false;
      return false;
    }
  }

  async startMonitoring() {
    try {
      // Create subscription for monitoring changes
      this.subscription = ClientSubscription.create(this.session, {
        requestedPublishingInterval: 1000,
        requestedLifetimeCount: 10,
        requestedMaxKeepAliveCount: 2,
        maxNotificationsPerPublish: 2,
        publishingEnabled: true,
        priority: 10,
      });

      // Monitor Status
      const statusNodeId = 'ns=1;s=Status';
      const statusMonitoredItem = await this.subscription.monitor(
        { nodeId: statusNodeId, attributeId: AttributeIds.Value },
        { samplingInterval: 100, discardOldest: true, queueSize: 1 },
        TimestampsToReturn.Both,
      );

      statusMonitoredItem.on('changed', (dataValue) => {
        this.dataCache.status = dataValue.value.value;
        console.log('Status updated:', this.dataCache.status);
      });

      // Monitor Composition
      const compositionNodeId = 'ns=1;s=Composition';
      const compositionMonitoredItem = await this.subscription.monitor(
        { nodeId: compositionNodeId, attributeId: AttributeIds.Value },
        { samplingInterval: 100, discardOldest: true, queueSize: 1 },
        TimestampsToReturn.Both,
      );

      compositionMonitoredItem.on('changed', (dataValue) => {
        try {
          this.dataCache.composition = JSON.parse(dataValue.value.value);
          console.log(
            'Composition updated:',
            Object.keys(this.dataCache.composition).length,
            'elements',
          );
        } catch (error) {
          console.error('Error parsing composition:', error);
        }
      });

      console.log('OPC UA monitoring started');
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }

  async writeRequestedGrade(
    metalGrade,
    deviationElements = [],
    deviationPercentage = 10,
  ) {
    try {
      if (!this.isConnected || !this.session) {
        throw new Error('OPC UA Client not connected');
      }

      // Write deviation elements first (if supported)
      try {
        const deviationElementsNodeId = 'ns=1;s=DeviationElements';
        await this.session.write({
          nodeId: deviationElementsNodeId,
          attributeId: AttributeIds.Value,
          value: {
            value: {
              dataType: 'String',
              value: JSON.stringify(deviationElements),
            },
          },
        });
      } catch (error) {
        console.log(
          'Note: DeviationElements not writable via OPC, using server method',
        );
      }

      // Write deviation percentage
      try {
        const deviationPercentageNodeId = 'ns=1;s=DeviationPercentage';
        await this.session.write({
          nodeId: deviationPercentageNodeId,
          attributeId: AttributeIds.Value,
          value: {
            value: {
              dataType: 'Double',
              value: deviationPercentage,
            },
          },
        });
      } catch (error) {
        console.log('Could not write deviation percentage:', error.message);
      }

      // Write requested grade (this triggers reading generation)
      const requestedGradeNodeId = 'ns=1;s=RequestedGrade';
      await this.session.write({
        nodeId: requestedGradeNodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: {
            dataType: 'String',
            value: metalGrade.toUpperCase(),
          },
        },
      });

      console.log(`Requested grade written: ${metalGrade}`);

      // Wait a moment for the server to generate new reading
      await new Promise((resolve) => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      console.error('Failed to write requested grade:', error);
      this.lastError = error.message;
      return false;
    }
  }

  async readCurrentData() {
    try {
      if (!this.isConnected || !this.session) {
        throw new Error('OPC UA Client not connected');
      }

      // Read all variables
      const nodesToRead = [
        { nodeId: 'ns=1;s=Status', attributeId: AttributeIds.Value },
        { nodeId: 'ns=1;s=Composition', attributeId: AttributeIds.Value },
        { nodeId: 'ns=1;s=Temperature', attributeId: AttributeIds.Value },
        { nodeId: 'ns=1;s=Pressure', attributeId: AttributeIds.Value },
        { nodeId: 'ns=1;s=DeviationElements', attributeId: AttributeIds.Value },
        { nodeId: 'ns=1;s=RequestedGrade', attributeId: AttributeIds.Value },
      ];

      const results = await this.session.read(nodesToRead);

      const data = {
        status: results[0].value?.value || 'Unknown',
        composition: {},
        temperature: results[2].value?.value || 0,
        pressure: results[3].value?.value || 0,
        deviationElements: [],
        requestedGrade: results[5].value?.value || '',
      };

      // Parse composition
      try {
        if (results[1].value?.value) {
          data.composition = JSON.parse(results[1].value.value);
        }
      } catch (error) {
        console.error('Error parsing composition:', error);
      }

      // Parse deviation elements
      try {
        if (results[4].value?.value) {
          data.deviationElements = JSON.parse(results[4].value.value);
        }
      } catch (error) {
        console.error('Error parsing deviation elements:', error);
      }

      // Update cache
      this.dataCache = { ...data };

      return data;
    } catch (error) {
      console.error('Failed to read current data:', error);
      this.lastError = error.message;
      return null;
    }
  }

  async disconnect() {
    try {
      this.connectionStatus = 'Disconnecting...';

      if (this.subscription) {
        await this.subscription.terminate();
        this.subscription = null;
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
      this.connectionStatus = 'Disconnected';

      console.log('OPC UA Client disconnected');
    } catch (error) {
      console.error('Error disconnecting OPC UA Client:', error);
      this.lastError = error.message;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      lastError: this.lastError,
      endpointUrl: this.endpointUrl,
      cachedData: this.dataCache,
    };
  }

  getCachedData() {
    return this.dataCache;
  }
}

module.exports = SpectrometerOPCUAClient;
