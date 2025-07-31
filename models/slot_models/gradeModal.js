'use strict';

module.exports = (sequelize, DataTypes) => {
  const Grade = sequelize.define("Grade", {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    grade_name: DataTypes.STRING,
    course_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
  }, 
  {
    tableName: "grade",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Grade.associate = (models) => {
    Grade.belongsToMany(models.User, {
      through: models.UserGrade,
      foreignKey: "grade_id",
      otherKey: "user_id",
      as: "Users"
    });

    Grade.belongsTo(models.Course, {
      foreignKey: "course_id",
      as: "Course"
    });
  };

  return Grade;
};
