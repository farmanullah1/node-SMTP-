import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

/**
 * User Model
 * Production-ready User model with password hashing via bcryptjs,
 * email verification flags, password reset token expiry, and role-based permissions.
 */
export class User extends Model {
  /**
   * Compares plain-text candidate password with the stored bcrypt hash.
   * @param {string} candidatePassword 
   * @returns {Promise<boolean>}
   */
  async comparePassword(candidatePassword) {
    if (!this.password || !candidatePassword) {
      return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Returns a sanitized JSON object safe for sending in API responses.
   * Strips password, internal hashes, and security tokens.
   */
  toSafeJSON() {
    const { password, verificationToken, resetPasswordToken, ...safeData } = this.toJSON();
    return safeData;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name cannot be empty.' },
        len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters.' },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'This email address is already registered.',
      },
      validate: {
        isEmail: { msg: 'Must be a valid email address.' },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Password cannot be empty.' },
      },
    },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'user',
      allowNull: false,
      validate: {
        isIn: {
          args: [['user', 'admin']],
          msg: "Role must be either 'user' or 'admin'.",
        },
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    verificationTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Users',
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);
