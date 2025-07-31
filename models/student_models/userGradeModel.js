'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserGrade = sequelize.define("UserGrade", {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    user_id: DataTypes.INTEGER,
    grade_id: DataTypes.INTEGER,
  }, 
  {
    tableName: "user_grade",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  UserGrade.associate = (models) => {
    UserGrade.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    UserGrade.belongsTo(models.Grade, { foreignKey: 'grade_id', as: 'Grade' });
  };

  return UserGrade;
};
