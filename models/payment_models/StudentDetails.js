'use strict';

module.exports = (sequelize, DataTypes) => {
  const StudentDetails = sequelize.define('StudentDetails', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    student_no: { type: DataTypes.BIGINT, allowNull: false },
    photo_url: { type: DataTypes.STRING(255), allowNull: false },
    ice_contact: { type: DataTypes.STRING(255), allowNull: false },
    salutation:{ type: DataTypes.STRING(255), allowNull: false },
  }, {
    tableName: 'student_details',
    timestamps: false
  });

  StudentDetails.associate = (models) => {
    StudentDetails.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user' // 👈 MUST be here to match controller
    });

    StudentDetails.hasMany(models.Payment, { foreignKey: 'student_details_id' });
  };

  return StudentDetails;
};
