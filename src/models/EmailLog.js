import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * EmailLog Model
 * Records every outgoing email attempt for audit trail, deliverability analytics,
 * and bounce tracking.
 */
export const EmailLog = sequelize.define('EmailLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  recipient: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACCEPTED',
    allowNull: false,
    validate: {
      isIn: {
        args: [['ACCEPTED', 'REJECTED', 'FAILED']],
        msg: "Status must be 'ACCEPTED', 'REJECTED', or 'FAILED'",
      },
    },
  },
  messageId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  providerResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  previewUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'EmailLogs',
  timestamps: true,
});
