const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const { roles } = require('../config/auth');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM(Object.values(roles)),
    defaultValue: roles.USER,
    allowNull: false
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Método para verificar senha
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para gerar token JWT
User.prototype.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  const { jwtSecret, jwtExpiration } = require('../config/auth');
  
  return jwt.sign(
    {
      userId: this.id,
      email: this.email,
      role: this.role,
      companyName: this.companyName
    },
    jwtSecret,
    { expiresIn: jwtExpiration }
  );
};

// Método para gerar refresh token
User.prototype.generateRefreshToken = function() {
  const jwt = require('jsonwebtoken');
  const { jwtRefreshSecret, jwtRefreshExpiration } = require('../config/auth');
  
  return jwt.sign(
    {
      userId: this.id,
      tokenVersion: this.tokenVersion || 0
    },
    jwtRefreshSecret,
    { expiresIn: jwtRefreshExpiration }
  );
};

// Método para sanitizar dados do usuário (remover senha)
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  delete values.verificationToken;
  return values;
};

module.exports = User;
