const mqtt = require('mqtt');
const EventEmitter = require('events');

class SpectrometerMQTTClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.brokerUrl = options.brokerUrl || 'mqtt://localhost:1883';
    this.clientId = options.clientId || `metallisense-backend-${Date.now()}`;
    this.client = null;
    this.isConnected = false;
    this.currentConfig = {
      metalGrade: 'SG-Iron',
      incorrectElementsCount: 2,
      latestReading: null,
      temperature: 0.0
    };
    this.topics = {
      config: {
        metalGrade: 'spectrometer/config/metal_grade',
        incorrectElements: 'spectrometer/config/incorrect_elements'
      },
      data: {
        reading: 'spectrometer/data/reading',
        temperature: 'spectrometer/data/temperature'
      },
      control: {
        generateReading: 'spectrometer/control/generate_reading'
      },
      status: 'spectrometer/status'
    };
    
    // Add error handler to prevent uncaught exceptions
    this.on('error', (error) => {
      console.error('🔥 MQTT Client Error Event:', error.message || error);
      // Don't rethrow - just log it
    });
  }

  // Establish connection to MQTT broker
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        if (this.isConnected) {
          return resolve({ success: true, message: 'Already connected' });
        }

        console.log(`🔄 Attempting to connect to MQTT broker at ${this.brokerUrl}...`);

        // Set up connection timeout first
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.log('⚠️ MQTT connection timeout - operating in offline mode');
            if (this.client) {
              try {
                this.client.end(true);
              } catch (endError) {
                console.error('❌ Error ending MQTT client:', endError.message);
              }
            }
            this.isConnected = false;
            resolve({ 
              success: false, 
              message: 'MQTT broker not available - operating in offline mode',
              offline: true 
            });
          }
        }, 8000);

        try {
          this.client = mqtt.connect(this.brokerUrl, {
            clientId: this.clientId,
            clean: true,
            connectTimeout: 5000,
            reconnectPeriod: 5000,
            keepalive: 60,
            protocolVersion: 4
          });
        } catch (mqttError) {
          clearTimeout(connectionTimeout);
          console.error('❌ MQTT Client Creation Error:', mqttError.message);
          return resolve({ 
            success: false, 
            message: `Failed to create MQTT client: ${mqttError.message} - operating in offline mode`,
            offline: true 
          });
        }

        this.client.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          console.log('✅ Connected to MQTT Spectrometer Server');
          
          // Subscribe to all data topics
          const subscribeTopics = [
            this.topics.data.reading,
            this.topics.data.temperature,
            this.topics.status
          ];
          
          this.client.subscribe(subscribeTopics, (err) => {
            if (err) {
              console.error('❌ MQTT Subscription Error:', err);
              resolve({ 
                success: false, 
                message: `Failed to subscribe to topics: ${err.message}`,
                connected: true,
                subscribed: false
              });
              return;
            }
            console.log('✅ Subscribed to spectrometer data topics');
            resolve({ success: true, message: 'Connected successfully' });
          });
        });

        this.client.on('message', (topic, message) => {
          try {
            this.handleMessage(topic, message);
          } catch (messageError) {
            console.error('❌ Error handling MQTT message:', messageError.message);
          }
        });

        this.client.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ MQTT Connection Error:', error.message || error);
          this.isConnected = false;
          
          // Emit error event but don't let it become uncaught
          try {
            this.emit('error', error);
          } catch (emitError) {
            console.error('❌ Error event emission failed:', emitError.message);
          }
          
          // Don't reject, just resolve with offline mode
          resolve({ 
            success: false, 
            message: `MQTT connection failed: ${error.message || error} - operating in offline mode`,
            offline: true 
          });
        });

        this.client.on('close', () => {
          this.isConnected = false;
          console.log('🔌 MQTT connection closed');
          try {
            this.emit('disconnected');
          } catch (emitError) {
            console.error('❌ Error emitting disconnected event:', emitError.message);
          }
        });

        this.client.on('offline', () => {
          console.log('📴 MQTT client is offline');
          this.isConnected = false;
        });

        this.client.on('reconnect', () => {
          console.log('🔄 Attempting to reconnect to MQTT broker...');
        });

      } catch (error) {
        console.error('❌ MQTT Setup Error:', error.message);
        this.isConnected = false;
        resolve({ 
          success: false, 
          message: `Failed to setup MQTT connection: ${error.message} - operating in offline mode`,
          offline: true 
        });
      }
    });
  }

  // Handle incoming MQTT messages
  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      
      switch (topic) {
        case this.topics.data.reading:
          this.currentConfig.latestReading = data;
          console.log('📡 New spectrometer reading received:', data.id);
          this.emit('reading-updated', { reading: data });
          
          // Emit to WebSocket clients if global.io is available
          if (global.io) {
            global.io.emit('spectrometer-reading', {
              reading: data,
              temperature: this.currentConfig.temperature,
              timestamp: new Date().toISOString(),
            });
          }
          break;
          
        case this.topics.data.temperature:
          this.currentConfig.temperature = data.temperature;
          console.log('🌡️ Temperature updated:', data.temperature + '°C');
          this.emit('temperature-updated', data);
          break;
          
        case this.topics.status:
          console.log('📊 Spectrometer status:', data);
          this.emit('status-updated', data);
          break;
          
        default:
          console.log('📦 Unknown topic:', topic, data);
      }
    } catch (error) {
      console.error('❌ Error parsing MQTT message:', error.message);
    }
  }

  // Close connection
  async disconnect() {
    try {
      if (!this.isConnected) {
        return { success: true, message: 'Already disconnected' };
      }

      if (this.client) {
        this.client.end();
        this.client = null;
      }

      this.isConnected = false;
      console.log('✅ Disconnected from MQTT Spectrometer Server');
      return { success: true, message: 'Disconnected successfully' };
    } catch (error) {
      console.error('❌ MQTT Disconnection Error:', error.message);
      throw new Error(
        `Failed to disconnect from spectrometer: ${error.message}`,
      );
    }
  }

  // Get latest reading from local cache
  async getLatestReading() {
    try {
      if (!this.isConnected) {
        // Return mock data in offline mode
        return {
          Al: 0.15,
          Si: 2.1,
          Mn: 0.8,
          P: 0.02,
          S: 0.01,
          Cr: 0.3,
          Ni: 0.1,
          Mo: 0.05,
          Cu: 0.25,
          V: 0.01,
          Ti: 0.02,
          Nb: 0.01,
          Co: 0.02,
          W: 0.01,
          Pb: 0.001,
          Sn: 0.01,
          As: 0.005,
          B: 0.001,
          Ca: 0.001,
          Ce: 0.001,
          timestamp: new Date().toISOString(),
          offline: true
        };
      }

      return this.currentConfig.latestReading;
    } catch (error) {
      console.error('❌ Get Latest Reading Error:', error.message);
      throw new Error(`Failed to get latest reading: ${error.message}`);
    }
  }

  // Get current temperature from local cache
  async getTemperature() {
    try {
      if (!this.isConnected) {
        // Return mock temperature in offline mode
        return {
          temperature: 1450 + Math.random() * 100, // Random temperature between 1450-1550°C
          timestamp: new Date().toISOString(),
          offline: true
        };
      }

      return this.currentConfig.temperature;
    } catch (error) {
      console.error('❌ Get Temperature Error:', error.message);
      throw new Error(`Failed to get temperature: ${error.message}`);
    }
  }

  // Update configuration by publishing to MQTT topics
  async updateConfiguration(grade, count) {
    try {
      if (!this.isConnected) {
        // Update local config in offline mode
        this.currentConfig.metalGrade = grade;
        this.currentConfig.incorrectElementsCount = count;
        console.log(`⚠️ Offline mode: Configuration updated locally - Grade: ${grade}, Count: ${count}`);
        return { 
          success: true, 
          message: 'Configuration updated locally (offline mode)',
          offline: true 
        };
      }

      // Publish metal grade configuration
      this.client.publish(this.topics.config.metalGrade, grade, (err) => {
        if (err) {
          console.error('❌ Failed to publish metal grade:', err);
        } else {
          console.log(`✅ Metal grade updated: ${grade}`);
        }
      });

      // Publish incorrect elements count configuration
      this.client.publish(this.topics.config.incorrectElements, count.toString(), (err) => {
        if (err) {
          console.error('❌ Failed to publish incorrect elements count:', err);
        } else {
          console.log(`✅ Incorrect elements count updated: ${count}`);
        }
      });

      // Update local configuration
      this.currentConfig.metalGrade = grade;
      this.currentConfig.incorrectElementsCount = parseInt(count);

      console.log(
        `✅ Configuration updated: ${grade}, ${count} incorrect elements`,
      );
      return { success: true, message: 'Configuration updated' };
    } catch (error) {
      console.error('❌ Update Configuration Error:', error.message);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  // Generate a new reading by publishing to control topic
  async generateReading() {
    try {
      if (!this.isConnected) {
        // Generate mock reading in offline mode
        const mockReading = {
          Al: parseFloat((Math.random() * 0.3).toFixed(3)),
          Si: parseFloat((1.8 + Math.random() * 0.6).toFixed(2)),
          Mn: parseFloat((0.6 + Math.random() * 0.4).toFixed(2)),
          P: parseFloat((0.01 + Math.random() * 0.02).toFixed(3)),
          S: parseFloat((0.005 + Math.random() * 0.01).toFixed(3)),
          Cr: parseFloat((0.2 + Math.random() * 0.2).toFixed(2)),
          Ni: parseFloat((0.05 + Math.random() * 0.1).toFixed(2)),
          Mo: parseFloat((0.02 + Math.random() * 0.06).toFixed(3)),
          Cu: parseFloat((0.15 + Math.random() * 0.2).toFixed(2)),
          V: parseFloat((0.005 + Math.random() * 0.01).toFixed(3)),
          Ti: parseFloat((0.01 + Math.random() * 0.02).toFixed(3)),
          Nb: parseFloat((0.005 + Math.random() * 0.01).toFixed(3)),
          Co: parseFloat((0.01 + Math.random() * 0.02).toFixed(3)),
          W: parseFloat((0.005 + Math.random() * 0.01).toFixed(3)),
          Pb: parseFloat((0.0005 + Math.random() * 0.0015).toFixed(4)),
          Sn: parseFloat((0.005 + Math.random() * 0.01).toFixed(3)),
          As: parseFloat((0.002 + Math.random() * 0.006).toFixed(4)),
          B: parseFloat((0.0005 + Math.random() * 0.0015).toFixed(4)),
          Ca: parseFloat((0.0005 + Math.random() * 0.0015).toFixed(4)),
          Ce: parseFloat((0.0005 + Math.random() * 0.0015).toFixed(4)),
          timestamp: new Date().toISOString(),
          offline: true
        };

        this.currentConfig.latestReading = mockReading;
        console.log('⚠️ Offline mode: Generated mock reading');
        
        // Emit event for any listeners
        this.emit('reading-updated', { reading: mockReading });
        
        // Emit to WebSocket clients if available
        if (global.io) {
          global.io.emit('spectrometer-reading', {
            reading: mockReading,
            temperature: this.currentConfig.temperature,
            timestamp: new Date().toISOString(),
            offline: true
          });
        }

        return { 
          success: true, 
          message: 'Mock reading generated (offline mode)',
          offline: true 
        };
      }

      // Publish to control topic to trigger reading generation
      this.client.publish(this.topics.control.generateReading, 'generate', (err) => {
        if (err) {
          console.error('❌ Failed to request reading generation:', err);
        } else {
          console.log('✅ Reading generation requested');
        }
      });

      return { success: true, message: 'Reading generation requested' };
    } catch (error) {
      console.error('❌ Generate Reading Error:', error.message);
      throw new Error(`Failed to generate reading: ${error.message}`);
    }
  }

  // Get current configuration
  getCurrentConfig() {
    return {
      ...this.currentConfig,
      connected: this.isConnected,
      brokerUrl: this.brokerUrl,
      offline: !this.isConnected
    };
  }

  // Return connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      brokerUrl: this.brokerUrl,
      clientReady: this.client !== null,
      clientId: this.clientId,
      offline: !this.isConnected,
      mode: this.isConnected ? 'online' : 'offline'
    };
  }

  // Subscribe to readings (MQTT handles this automatically)
  async subscribeToReadings() {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to spectrometer server');
      }

      // In MQTT, we're already subscribed to reading topics in connect()
      // This method exists for compatibility with existing code
      console.log('✅ Already subscribed to MQTT reading topics');
      return { success: true, message: 'Subscribed to readings' };
    } catch (error) {
      console.error('❌ Subscription Error:', error.message);
      throw new Error(`Failed to subscribe to readings: ${error.message}`);
    }
  }

  // Unsubscribe from readings (compatibility method)
  async unsubscribeFromReadings() {
    try {
      // In MQTT, we don't need to explicitly unsubscribe from individual topics
      // This method exists for compatibility with existing code
      console.log('✅ MQTT subscriptions managed automatically');
      return { success: true, message: 'Unsubscribed from readings' };
    } catch (error) {
      console.error('❌ Unsubscribe Error:', error.message);
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }
  }
}

// Create singleton instance
const spectrometerMQTTClient = new SpectrometerMQTTClient();

module.exports = spectrometerMQTTClient;
