const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SecurityLog = sequelize.define('SecurityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: true
  },
  method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low'
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'security_logs',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['resolved']
    },
    {
      fields: ['ipAddress']
    }
  ]
});

// Método para marcar como resolvido
SecurityLog.prototype.markAsResolved = function(userId) {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  return this.save();
};

// Método para buscar logs por período
SecurityLog.getLogsByPeriod = async function(startDate, endDate, severity = null) {
  const where = {
    createdAt: {
      [sequelize.Sequelize.Op.between]: [startDate, endDate]
    }
  };
  
  if (severity) {
    where.severity = severity;
  }
  
  return await SecurityLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [{
      association: 'user',
      attributes: ['id', 'name', 'email']
    }]
  });
};

// Método para contar eventos por ação
SecurityLog.countByAction = async function(action, startDate, endDate) {
  return await SecurityLog.count({
    where: {
      action,
      createdAt: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    }
  });
};

module.exports = SecurityLog;
