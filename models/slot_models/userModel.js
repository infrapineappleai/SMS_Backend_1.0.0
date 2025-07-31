'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    gender: DataTypes.STRING,
    email: DataTypes.STRING,
    phn_num: DataTypes.STRING,
    date_of_birth: DataTypes.STRING,
    role: DataTypes.STRING,
    status: DataTypes.STRING,
  }, 
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at" 
  });

  User.associate = (models) => {
    User.belongsToMany(models.Slot, {
      through: models.UserSlot,
      foreignKey: "user_id",
      otherKey: "slot_id",
    });

    User.belongsToMany(models.Grade, {
      through: models.UserGrade,
      foreignKey: "user_id",
      otherKey: "grade_id",
      as: "Grades"
    });
  };

  return User;
};