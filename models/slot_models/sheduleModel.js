'use strict';

module.exports = (sequelize, DataTypes) => {
  const Slot = sequelize.define("Slot", {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    day: DataTypes.STRING,
    st_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    course_id: DataTypes.INTEGER,
    branch_id: DataTypes.INTEGER,
 
    grade_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'grade',
        key: 'id'
      }
    }
  }, 
  {
    tableName: "slot",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Slot.associate = (models) => {
    Slot.belongsTo(models.Course, {
      foreignKey: "course_id",
      as: "Course"
    });

    Slot.belongsTo(models.Grade, {
      foreignKey: "grade_id",
      as: "Grade" 
    });

    Slot.belongsToMany(models.User, {
      through: models.UserSlot,
      foreignKey: "slot_id",
      otherKey: "user_id",
      as: "Users"
    });
  };

  return Slot;
};
