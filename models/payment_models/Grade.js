'use strict';
module.exports = (sequelize, DataTypes) => {
  const Grade = sequelize.define('Grade', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    grade_name: { type: DataTypes.STRING(255), allowNull: false },
    course_id: { type: DataTypes.BIGINT, allowNull: false }
  }, {
    tableName: 'grade',
    timestamps: false
  });

  Grade.associate = (models) => {
    Grade.belongsTo(models.Course, { foreignKey: 'course_id' });
    Grade.hasMany(models.UserGrade, { foreignKey: 'grade_id' });
    Grade.hasMany(models.GradeFee, { foreignKey: 'grade_id' });
  };

  return Grade;
};
