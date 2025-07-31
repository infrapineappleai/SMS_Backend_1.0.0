'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserBranch = sequelize.define("UserBranch", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    branch_id: DataTypes.INTEGER
  }, {
    tableName: "user_branch",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  UserBranch.associate = (models) => {
    UserBranch.belongsTo(models.User, { foreignKey: "user_id", as: "User" });
    UserBranch.belongsTo(models.Branch, { foreignKey: "branch_id", as: "Branch" });
  };

  return UserBranch;
};