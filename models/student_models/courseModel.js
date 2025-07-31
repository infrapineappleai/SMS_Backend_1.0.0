'use strict';

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define('Course', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    course_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.STRING, allowNull: false ,defaultValue: 'active'},
  }, {
    tableName: "course",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Course.associate = (models) => {
    Course.hasMany(models.Grade, { foreignKey: "course_id", as: "Grades" });
    Course.hasMany(models.Slot, { foreignKey: "course_id", as: "Slots" });
  };

  return Course;
};

