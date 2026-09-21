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
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'CUSTOM',
    allowNull: false,
  },
  deliveryDurationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  indexes: [
    { fields: ['userId'] },
    { fields: ['recipient'] },
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['createdAt'] },
    { fields: ['messageId'] },
  ],
});
