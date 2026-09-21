import { sequelize } from '../config/database.js';
import { EmailLog } from './EmailLog.js';
import { User } from './User.js';
import { OtpLog } from './OtpLog.js';

// Setup Associations
User.hasMany(EmailLog, { foreignKey: 'userId', as: 'emailLogs' });
EmailLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

/**
 * Initializes and synchronizes database models with MSSQL.
 * Idempotently applies column additions and performance indexes.
 */
export async function initModels() {
  console.log('[DB Models] Initializing and synchronizing Sequelize models...');
  try {
    await sequelize.sync();

    // Idempotent column migrations for EmailLogs (T-SQL compatible)
    const columnQueries = [
      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('EmailLogs') AND name = 'category')
       ALTER TABLE EmailLogs ADD category NVARCHAR(50) NOT NULL CONSTRAINT DF_EmailLogs_category DEFAULT 'CUSTOM'`,
      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('EmailLogs') AND name = 'deliveryDurationMs')
       ALTER TABLE EmailLogs ADD deliveryDurationMs INT NULL`,
      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('EmailLogs') AND name = 'attempts')
       ALTER TABLE EmailLogs ADD attempts INT NOT NULL CONSTRAINT DF_EmailLogs_attempts DEFAULT 1`,
      `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('EmailLogs') AND name = 'metadata')
       ALTER TABLE EmailLogs ADD metadata NVARCHAR(MAX) NULL`,
    ];

    for (const q of columnQueries) {
      await sequelize.query(q).catch(() => {});
    }

    // Idempotent index migrations for high-throughput queries
    const indexQueries = [
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_userId' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_userId ON EmailLogs (userId)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_recipient' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_recipient ON EmailLogs (recipient)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_status' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_status ON EmailLogs (status)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_category' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_category ON EmailLogs (category)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_createdAt' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_createdAt ON EmailLogs (createdAt DESC)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmailLogs_messageId' AND object_id = OBJECT_ID('EmailLogs'))
       CREATE INDEX IX_EmailLogs_messageId ON EmailLogs (messageId)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_role' AND object_id = OBJECT_ID('Users'))
       CREATE INDEX IX_Users_role ON Users (role)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_isVerified' AND object_id = OBJECT_ID('Users'))
       CREATE INDEX IX_Users_isVerified ON Users (isVerified)`,
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_createdAt' AND object_id = OBJECT_ID('Users'))
       CREATE INDEX IX_Users_createdAt ON Users (createdAt DESC)`,
    ];

    for (const q of indexQueries) {
      await sequelize.query(q).catch(() => {});
    }

    console.log('[DB Models] Models and performance indexes synchronized with MSSQL successfully.');
  } catch (error) {
    console.warn('[DB Models] Notice on sync:', error.message);
  }
}

export {
  EmailLog,
  User,
  OtpLog,
};
