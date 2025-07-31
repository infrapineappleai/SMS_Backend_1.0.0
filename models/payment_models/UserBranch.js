'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserBranch = sequelize.define('UserBranch', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    branch_id: { type: DataTypes.BIGINT, allowNull: false }
  }, {
    tableName: 'user_branch',
    timestamps: false
  });

  UserBranch.associate = (models) => {
    UserBranch.belongsTo(models.User, { foreignKey: 'user_id' });
    UserBranch.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });

  };

  return UserBranch;
};
