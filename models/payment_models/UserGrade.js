'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserGrade = sequelize.define('UserGrade', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    grade_id: { type: DataTypes.BIGINT, allowNull: false }
  }, {
    tableName: 'user_grade',
    timestamps: false
  });

  UserGrade.associate = (models) => {
    UserGrade.belongsTo(models.User, { foreignKey: 'user_id' });
    UserGrade.belongsTo(models.Grade, { foreignKey: 'grade_id' });
  };

  return UserGrade;
};
