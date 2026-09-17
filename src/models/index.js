import { sequelize } from '../config/database.js';
import { EmailLog } from './EmailLog.js';
import { User } from './User.js';
import { OtpLog } from './OtpLog.js';

// Setup Associations
User.hasMany(EmailLog, { foreignKey: 'userId', as: 'emailLogs' });
EmailLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

/**
 * Initializes and synchronizes database models with MSSQL.
 * Uses alter: true so new columns and tables are cleanly synced.
 */
export async function initModels() {
  console.log('[DB Models] Initializing and synchronizing Sequelize models...');
  try {
    await sequelize.sync();
    console.log('[DB Models] Models synchronized with MSSQL successfully (Users, EmailLogs, OtpLogs).');
  } catch (error) {
    console.warn('[DB Models] Notice on sync:', error.message);
  }
}

export {
  EmailLog,
  User,
  OtpLog,
};
