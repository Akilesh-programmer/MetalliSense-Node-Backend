const { OPCUAServer, Variant, DataType, StatusCodes } = require('node-opcua');
const SpectrometerReading = require('../models/spectrometerReadingModel');

class SpectrometerOPCUAServer {
  constructor() {
    this.server = null;
    this.namespace = null;
    this.variables = {};
    this.currentGrade = null;
    this.currentComposition = {};
    this.currentStatus = 'Ready';
    this.lastReading = null;
  }

  async initialize() {
    try {
      // Create OPC UA Server
      this.server = new OPCUAServer({
        port: 4334, // Standard OPC UA port + offset
        resourcePath: '/MetalliSense/Spectrometer',
        buildInfo: {
          productName: 'MetalliSense Spectrometer Simulator',
          buildNumber: '1.0.0',
          buildDate: new Date(),
        },
      });

      // Set up post-initialize event BEFORE calling initialize
      this.server.on('post_initialize', () => {
        try {
          const addressSpace = this.server.engine.addressSpace;
          this.namespace = addressSpace.getOwnNamespace();
          this.createVariables();

          // Initialize with default data
          this.initializeDefaultData();

          console.log('OPC UA Variables created successfully');
        } catch (error) {
          console.error('Failed to create OPC UA variables:', error);
        }
      });

      await this.server.initialize();

      console.log('OPC UA Server initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize OPC UA Server:', error);
      return false;
    }
  }

  initializeDefaultData() {
    // Set default composition values
    this.currentComposition = {
      Fe: 85.5,
      C: 3.2,
      Si: 2.1,
      Mn: 0.8,
      P: 0.04,
      S: 0.02,
      Cr: 0.3,
      Ni: 0.15,
      Mo: 0.05,
      Cu: 0.25,
    };

    this.lastReading = {
      composition: new Map(Object.entries(this.currentComposition)),
      temperature: this.generateTemperature(),
      pressure: this.generatePressure(),
      deviation_elements: [],
    };

    this.currentStatus = 'Ready';
    console.log('Initialized with default composition data');
  }

  createVariables() {
    try {
      if (!this.namespace) {
        throw new Error('Namespace not available');
      }

      const addressSpace = this.server.engine.addressSpace;
      const rootFolder = addressSpace.rootFolder;

      console.log('Address space available:', !!addressSpace);
      console.log('Root folder available:', !!rootFolder);
      console.log('Objects folder available:', !!rootFolder?.objects);

      // Create a folder to organize our variables
      const spectrometerFolder = this.namespace.addFolder(rootFolder.objects, {
        browseName: 'Spectrometer',
        displayName: 'Spectrometer Data',
        nodeId: 'ns=1;s=SpectrometerFolder',
      });

      // Requested Grade - writable by client
      this.variables.requestedGrade = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'RequestedGrade',
        nodeId: 'ns=1;s=RequestedGrade',
        dataType: DataType.String,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.String,
              value: this.currentGrade || '',
            }),
          set: (variant) => {
            this.currentGrade = variant.value;
            this.generateNewReading();
            return StatusCodes.Good;
          },
        },
      });

      // Status - readable
      this.variables.status = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'Status',
        nodeId: 'ns=1;s=Status',
        dataType: DataType.String,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.String,
              value: this.currentStatus,
            }),
        },
      });

      // Composition - readable (JSON string)
      this.variables.composition = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'Composition',
        nodeId: 'ns=1;s=Composition',
        dataType: DataType.String,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.String,
              value: JSON.stringify(this.currentComposition),
            }),
        },
      });

      // Individual element variables for composition
      const elements = [
        'Fe',
        'C',
        'Si',
        'Mn',
        'P',
        'S',
        'Cr',
        'Ni',
        'Mo',
        'Cu',
      ];
      elements.forEach((element) => {
        this.variables[element] = this.namespace.addVariable({
          componentOf: spectrometerFolder,
          browseName: element,
          displayName: `${element} (%)`,
          nodeId: `ns=1;s=${element}`,
          dataType: DataType.Double,
          value: {
            get: () =>
              new Variant({
                dataType: DataType.Double,
                value: this.currentComposition[element] || 0.0,
              }),
          },
        });
      });

      // Temperature - readable
      this.variables.temperature = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'Temperature',
        nodeId: 'ns=1;s=Temperature',
        dataType: DataType.Double,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.Double,
              value: this.lastReading?.temperature || 0,
            }),
        },
      });

      // Pressure - readable
      this.variables.pressure = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'Pressure',
        nodeId: 'ns=1;s=Pressure',
        dataType: DataType.Double,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.Double,
              value: this.lastReading?.pressure || 0,
            }),
        },
      });

      // Deviation Elements - readable (JSON array string)
      this.variables.deviationElements = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'DeviationElements',
        nodeId: 'ns=1;s=DeviationElements',
        dataType: DataType.String,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.String,
              value: JSON.stringify(this.lastReading?.deviation_elements || []),
            }),
        },
      });

      // Deviation Percentage - writable
      this.variables.deviationPercentage = this.namespace.addVariable({
        componentOf: spectrometerFolder,
        browseName: 'DeviationPercentage',
        nodeId: 'ns=1;s=DeviationPercentage',
        dataType: DataType.Double,
        value: {
          get: () =>
            new Variant({
              dataType: DataType.Double,
              value: this.deviationPercentage || 10,
            }),
          set: (variant) => {
            this.deviationPercentage = variant.value;
            return StatusCodes.Good;
          },
        },
      });

      const elementNames = Object.keys(this.variables);
      console.log(
        `Created ${elementNames.length} OPC UA variables:`,
        elementNames,
      );
      console.log('Variables organized under Spectrometer folder');
    } catch (error) {
      console.error('Failed to create OPC UA variables:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async generateNewReading() {
    try {
      this.currentStatus = 'Generating Reading...';

      if (!this.currentGrade) {
        this.currentStatus = 'No Grade Specified';
        return;
      }

      // Use existing method from SpectrometerReading model
      const syntheticData = await SpectrometerReading.generateSyntheticReading(
        this.currentGrade,
        this.deviationElements || [],
        this.deviationPercentage || 10,
      );

      // Convert Map to Object for easier handling
      this.currentComposition = Object.fromEntries(syntheticData.composition);

      // Store the reading data
      this.lastReading = {
        ...syntheticData,
        temperature: this.generateTemperature(),
        pressure: this.generatePressure(),
      };

      this.currentStatus = 'Reading Complete';

      console.log(`Generated new reading for grade: ${this.currentGrade}`);
      console.log('Composition:', this.currentComposition);
    } catch (error) {
      console.error('Error generating reading:', error);
      this.currentStatus = `Error: ${error.message}`;
    }
  }

  generateTemperature() {
    // Simulate realistic foundry temperature (1400-1600°C)
    return Math.round(1400 + Math.random() * 200);
  }

  generatePressure() {
    // Simulate realistic pressure (0.95-1.05 atm)
    return Math.round((0.95 + Math.random() * 0.1) * 100) / 100;
  }

  // Method to set deviation elements from external call
  setDeviationElements(elements = []) {
    this.deviationElements = elements;
    if (this.currentGrade) {
      this.generateNewReading();
    }
  }

  async start() {
    try {
      await this.server.start();
      console.log('OPC UA Server started successfully');
      console.log(
        'Server endpoint:',
        this.server.endpoints[0].endpointDescriptions()[0].endpointUrl,
      );
      return true;
    } catch (error) {
      console.error('Failed to start OPC UA Server:', error);
      return false;
    }
  }

  async stop() {
    try {
      await this.server.shutdown();
      console.log('OPC UA Server stopped');
    } catch (error) {
      console.error('Error stopping OPC UA Server:', error);
    }
  }

  // Get current server status
  getStatus() {
    return {
      isRunning: this.server ? true : false,
      currentGrade: this.currentGrade,
      currentStatus: this.currentStatus,
      lastReading: this.lastReading,
      endpoint:
        this.server?.endpoints[0]?.endpointDescriptions()[0]?.endpointUrl ||
        null,
    };
  }
}

module.exports = SpectrometerOPCUAServer;
