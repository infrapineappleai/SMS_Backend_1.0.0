'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserSlot = sequelize.define('UserSlot', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    slot_id: { type: DataTypes.BIGINT, allowNull: false }
  }, {
    tableName: 'user_slot',
    timestamps: false
  });

  UserSlot.associate = (models) => {
    UserSlot.belongsTo(models.User, { foreignKey: 'user_id' });
    UserSlot.belongsTo(models.Slot, { foreignKey: 'slot_id' });
  };

  return UserSlot;
};
