'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserBranchHistory = sequelize.define(
    'UserBranchHistory',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      branch_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'branch',
          key: 'id'
        }
      }
    },
    {
      tableName: 'user_branch_history',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  UserBranchHistory.associate = (models) => {
    UserBranchHistory.belongsTo(models.User, {foreignKey: 'user_id',as: 'User'});
    UserBranchHistory.belongsTo(models.Branch, {foreignKey: 'branch_id',as: 'Branch'});
  };

  return UserBranchHistory;
};