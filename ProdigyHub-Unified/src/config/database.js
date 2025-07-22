// ===================================================================
// Path: src/config/database.js
// Enhanced MongoDB Connection with Full Stability
// ===================================================================

const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.intentionalDisconnect = false;
    this.connectionStartTime = null;
    this.reconnectDelay = 2000; // 2 seconds
  }

  /**
   * Connect to MongoDB with enhanced stability
   */
  async connect() {
    // Check if already connected
    if (this.connection && this.connection.readyState === 1) {
      console.log('📊 Database already connected');
      return this.connection;
    }

    // Check if connection is in progress
    if (this.isConnecting) {
      console.log('📊 Database connection already in progress...');
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.connection && this.connection.readyState === 1) {
            resolve(this.connection);
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    try {
      this.isConnecting = true;
      this.connectionStartTime = Date.now();
      
      const mongoUri = this.getMongoUri();
      
      if (!mongoUri) {
        throw new Error('MongoDB URI not provided in environment variables');
      }

      console.log('📊 Connecting to MongoDB Atlas...');
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

      // Mongoose 8+ Compatible Options - No deprecated settings
      const options = {
        // Connection Pool Management
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 5,
        minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
        
        // Timeout Configuration
        serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 10000,
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 0, // 0 = disabled
        connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
        
        // Connection Management
        heartbeatFrequencyMS: 10000,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 5000,
        
        // Network Settings
        family: 4, // Use IPv4
        
        // Retry Configuration
        retryWrites: true,
        retryReads: true,
        
        // Application Identification
        appName: process.env.APP_NAME || 'ProdigyHub-TMF-API'
      };

      console.log(`📊 Pool size: ${options.maxPoolSize}, Timeout: ${options.serverSelectionTimeoutMS}ms`);
      
      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUri, options);
      
      // Calculate connection time
      const connectionTime = Date.now() - this.connectionStartTime;
      const maskedUri = this.maskUri(mongoUri);
      
      console.log(`✅ MongoDB connected successfully in ${connectionTime}ms`);
      console.log(`📊 Connected to: ${maskedUri}`);
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`📊 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`📊 Connection state: ${this.getConnectionState()}`);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Reset connection state
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      return this.connection;
      
    } catch (error) {
      this.isConnecting = false;
      const connectionTime = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
      
      console.error(`❌ MongoDB connection failed after ${connectionTime}ms`);
      console.error(`❌ Error: ${error.message}`);
      
      // Enhanced error diagnostics
      this.diagnoseConnectionError(error);
      
      // Attempt reconnection in production
      if (process.env.NODE_ENV === 'production' && 
          this.reconnectAttempts < this.maxReconnectAttempts &&
          !this.intentionalDisconnect) {
        
        this.reconnectAttempts++;
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms...`);
        
        setTimeout(() => {
          this.connect().catch(err => {
            console.error(`❌ Reconnection ${this.reconnectAttempts} failed:`, err.message);
          });
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        return;
      }
      
      throw error;
    }
  }

  /**
   * Get MongoDB URI based on environment
   */
  getMongoUri() {
    switch (process.env.NODE_ENV) {
      case 'test':
        return process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/prodigyhub_test';
      case 'production':
        return process.env.MONGODB_URI;
      default:
        return process.env.MONGODB_URI || 'mongodb://localhost:27017/prodigyhub';
    }
  }

  /**
   * Mask sensitive information in URI for secure logging
   */
  maskUri(uri) {
    try {
      if (uri.includes('@')) {
        // Split by @ to separate auth and host parts
        const parts = uri.split('@');
        const hostPart = parts[1];
        const protocolAndAuth = parts[0];
        
        // Mask the password part
        if (protocolAndAuth.includes(':')) {
          const segments = protocolAndAuth.split(':');
          if (segments.length >= 3) {
            // Replace password with asterisks
            segments[2] = '***';
            return segments.join(':') + '@' + hostPart;
          }
        }
        
        // If we can't parse it properly, just mask the auth part
        return protocolAndAuth.split(':')[0] + '://***@' + hostPart;
      }
      
      // For local URIs without auth, just return the database name
      return uri.split('/').pop() || uri;
    } catch (error) {
      return 'mongodb://***masked***';
    }
  }

  /**
   * Diagnose connection errors and provide helpful messages
   */
  diagnoseConnectionError(error) {
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Server Selection Error - Possible causes:');
      console.error('   • Network connectivity issues');
      console.error('   • MongoDB Atlas cluster is paused/unavailable');
      console.error('   • IP address not whitelisted in Atlas Network Access');
      console.error('   • Incorrect connection string or credentials');
      console.error('   • Firewall blocking MongoDB port (27017)');
    } else if (error.name === 'MongoNetworkError') {
      console.error('💡 Network Error - Check:');
      console.error('   • Internet connection stability');
      console.error('   • Atlas cluster availability');
      console.error('   • Corporate firewall settings');
    } else if (error.name === 'MongoParseError') {
      console.error('💡 Connection String Parse Error - Check:');
      console.error('   • MongoDB URI format');
      console.error('   • Special characters in password (URL encode them)');
      console.error('   • Connection string options syntax');
    } else if (error.message.includes('Authentication failed')) {
      console.error('💡 Authentication Error - Check:');
      console.error('   • Username and password in Atlas Database Access');
      console.error('   • User permissions for the database');
      console.error('   • Password special characters (URL encode them)');
    }
  }

  /**
   * Setup comprehensive MongoDB event listeners
   */
  setupEventListeners() {
    const connection = mongoose.connection;

    // Connection established
    connection.on('connected', () => {
      console.log('📊 Mongoose connected to MongoDB');
      console.log(`📊 ReadyState: ${this.getConnectionState()}`);
    });

    // Connection ready for operations
    connection.on('open', () => {
      console.log('📊 MongoDB connection opened and ready');
    });

    // Connection errors
    connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      
      // Diagnose specific error types
      if (err.name === 'MongoNetworkError') {
        console.error('💡 Network error detected - connection may be unstable');
      } else if (err.name === 'MongoWriteConcernError') {
        console.error('💡 Write concern error - check Atlas cluster health');
      }
    });

    // Connection lost
    connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      
      // Attempt reconnection if not intentionally disconnected
      if (!this.intentionalDisconnect && 
          process.env.NODE_ENV !== 'test' &&
          this.reconnectAttempts < this.maxReconnectAttempts) {
        
        console.log(`🔄 Attempting automatic reconnection in ${this.reconnectDelay}ms...`);
        setTimeout(() => {
          this.connect().catch(err => {
            console.error('❌ Auto-reconnection failed:', err.message);
          });
        }, this.reconnectDelay);
      }
    });

    // Successfully reconnected
    connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000; // Reset delay
    });

    // Connection closed
    connection.on('close', () => {
      console.log('📊 MongoDB connection closed');
    });

    // Buffer overflow warnings
    connection.on('fullsetup', () => {
      console.log('📊 MongoDB replica set fully connected');
    });

    // Graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n📊 ${signal} received - initiating graceful shutdown...`);
      this.intentionalDisconnect = true;
      
      try {
        await this.disconnect();
        console.log('✅ Database disconnected gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGINT', gracefulShutdown);   // Ctrl+C
    process.on('SIGTERM', gracefulShutdown);  // Termination signal
    process.on('SIGUSR2', gracefulShutdown);  // Nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error.message);
      this.intentionalDisconnect = true;
      try {
        await this.disconnect();
      } catch (disconnectError) {
        console.error('❌ Error disconnecting after uncaught exception:', disconnectError.message);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.intentionalDisconnect = true;
      try {
        await this.disconnect();
      } catch (disconnectError) {
        console.error('❌ Error disconnecting after unhandled rejection:', disconnectError.message);
      }
      process.exit(1);
    });
  }

  /**
   * Disconnect from MongoDB gracefully
   */
  async disconnect() {
    try {
      if (this.connection && mongoose.connection.readyState !== 0) {
        this.intentionalDisconnect = true;
        
        console.log('📊 Closing MongoDB connection...');
        await mongoose.connection.close();
        
        this.connection = null;
        console.log('✅ MongoDB connection closed gracefully');
      } else {
        console.log('📊 MongoDB already disconnected');
      }
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
      throw error;
    }
  }

  /**
   * Check if connected to MongoDB
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get current connection state as string
   */
  getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  /**
   * Get comprehensive connection statistics
   */
  getStats() {
    if (!this.isConnected()) {
      return {
        connected: false,
        state: this.getConnectionState(),
        reconnectAttempts: this.reconnectAttempts,
        error: 'Not connected to database'
      };
    }

    const connection = mongoose.connection;
    return {
      connected: true,
      state: this.getConnectionState(),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections).length,
      models: Object.keys(connection.models).length,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      readyState: connection.readyState
    };
  }

  /**
   * Comprehensive health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          message: 'Database not connected',
          state: this.getConnectionState(),
          reconnectAttempts: this.reconnectAttempts
        };
      }

      // Perform ping operation to test connection
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Database connection is active and responsive',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name,
        state: this.getConnectionState(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Start connection monitoring (for development)
   */
  startMonitoring(intervalMs = 60000) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Starting connection monitoring (${intervalMs}ms interval)`);
      
      setInterval(() => {
        if (this.isConnected()) {
          const stats = this.getStats();
          console.log(`📊 MongoDB Monitor - State: ${stats.state}, Collections: ${stats.collections}, Uptime: ${Math.round(stats.uptime / 1000)}s`);
        } else {
          console.log(`⚠️ MongoDB Monitor - Disconnected (${this.getConnectionState()})`);
        }
      }, intervalMs);
    }
  }

  /**
   * Force reconnection (for testing/debugging)
   */
  async forceReconnect() {
    console.log('🔄 Forcing MongoDB reconnection...');
    try {
      await this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      await this.connect();
      console.log('✅ Force reconnection completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Force reconnection failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database info and server status
   */
  async getServerInfo() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to database');
      }

      const admin = mongoose.connection.db.admin();
      
      // Get server status
      const serverStatus = await admin.serverStatus();
      
      // Get database stats
      const dbStats = await mongoose.connection.db.stats();

      return {
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          network: serverStatus.network
        },
        database: {
          name: mongoose.connection.name,
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get server info: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const database = new Database();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DB_MONITORING !== 'false') {
  // Start monitoring after a delay to avoid startup noise
  setTimeout(() => {
    database.startMonitoring();
  }, 5000);
}

module.exports = database;