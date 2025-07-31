'use strict';

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define("Course", {
    id: { 
      type: DataTypes.INTEGER,
      primaryKey: true, 
      autoIncrement: true 
    },
    course_code: DataTypes.STRING,
    name: DataTypes.STRING,
  }, 
  {
    tableName: "course",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Course.associate = (models) => {
    Course.hasMany(models.Grade, {
      foreignKey: "course_id",
    });

    Course.hasMany(models.Slot, {
      foreignKey: "course_id",
    });
  };

  return Course;
};