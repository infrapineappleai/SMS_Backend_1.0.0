'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserBranchHistory = sequelize.define('UserBranchHistory', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    branch_id: { type: DataTypes.BIGINT, allowNull: false }
  }, {
    tableName: 'user_branch_history',
    timestamps: false
  });

  UserBranchHistory.associate = (models) => {
    UserBranchHistory.belongsTo(models.User, { foreignKey: 'user_id' });
    UserBranchHistory.belongsTo(models.Branch, { foreignKey: 'branch_id' });
  };

  return UserBranchHistory;
};
