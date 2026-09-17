import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * OtpLog Model
 * Stores cryptographically hashed OTP codes, expiry timestamps,
 * attempt tracking (to prevent brute force guessing), and verification state.
 */
export const OtpLog = sequelize.define('OtpLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: { msg: 'Must be a valid email address.' },
    },
  },
  otpHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING(50),
    defaultValue: 'VERIFICATION', // 'VERIFICATION', 'LOGIN_2FA', 'PASSWORD_RESET', etc.
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'OtpLogs',
  timestamps: true,
  indexes: [
    {
      fields: ['email'],
    },
    {
      fields: ['expiresAt'],
    },
  ],
});
