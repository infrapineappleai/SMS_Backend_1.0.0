 'use strict';
 
module.exports = (sequelize, DataTypes) => {
  const Grade = sequelize.define('Grade', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    grade_name: { type: DataTypes.STRING, allowNull: false },
    course_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: "grade",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Grade.associate = (models) => {
    Grade.belongsTo(models.Course, { foreignKey: "course_id", as: "Course" });
    Grade.hasMany(models.UserGrade, { foreignKey: "grade_id", as: "UserGrades" });
    Grade.hasMany(models.Slot, { foreignKey: "grade_id", as: "Slots" });
  };

  return Grade;
};
