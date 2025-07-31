'use strict';
module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define('Course', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    course_code: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false }
  }, {
    tableName: 'course',
    timestamps: false
  });

  Course.associate = (models) => {
    Course.hasMany(models.Grade, { foreignKey: 'course_id' });
    Course.hasMany(models.Slot, { foreignKey: 'course_id' });
    
  };

  return Course;
};
