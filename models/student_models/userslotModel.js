'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserSlot = sequelize.define("UserSlot", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    slot_id: DataTypes.INTEGER
  }, {
    tableName: "user_slot",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  UserSlot.associate = (models) => {
    UserSlot.belongsTo(models.User, { foreignKey: "user_id", as: "User" });
    UserSlot.belongsTo(models.Slot, { foreignKey: "slot_id", as: "Slot" });
  };

  return UserSlot;
};