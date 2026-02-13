import mongoose from 'mongoose';
import { logger } from './logger.js';

/**
 * Database Connection Manager
 */
class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.isConnected) {
      logger.info('[Database] Already connected');
      return this.connection;
    }

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jionews-sentinel';

      logger.info(`[Database] Connecting to MongoDB...`);

      this.connection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;

      // Event listeners
      mongoose.connection.on('error', (error) => {
        logger.error('[Database] Connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('[Database] Disconnected from MongoDB');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('[Database] Reconnected to MongoDB');
        this.isConnected = true;
      });

      logger.info('[Database] ✓ Connected to MongoDB');

      return this.connection;

    } catch (error) {
      logger.error('[Database] Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('[Database] Disconnected from MongoDB');
    } catch (error) {
      logger.error('[Database] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: 'Not connected' };
      }

      // Ping database
      await mongoose.connection.db.admin().ping();

      return {
        healthy: true,
        status: this.getStatus()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const database = new Database();

export default database;
export { database };
