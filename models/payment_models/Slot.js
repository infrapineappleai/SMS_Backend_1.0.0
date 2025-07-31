'use strict';
module.exports = (sequelize, DataTypes) => {
  const Slot = sequelize.define('Slot', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    branch_id: { type: DataTypes.BIGINT, allowNull: false },
    course_id: { type: DataTypes.BIGINT, allowNull: false },
    day: { type: DataTypes.STRING(255), allowNull: false },
    st_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false }
  }, {
    tableName: 'slot',
    timestamps: false
  });

  Slot.associate = (models) => {
    Slot.belongsTo(models.Branch, { foreignKey: 'branch_id' });
    Slot.belongsTo(models.Course, { foreignKey: 'course_id' });
    Slot.hasMany(models.UserSlot, { foreignKey: 'slot_id' });
  };

  return Slot;
};
