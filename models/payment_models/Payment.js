'use strict';
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    student_details_id: { type: DataTypes.BIGINT, allowNull: false },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(255), allowNull: false },
    amount: { type: DataTypes.DOUBLE, allowNull: false },
  }, {
    tableName: 'payment',
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    createdAt: "created_at", // Renames createdAt to created_at in the database
    updatedAt: "updated_at", // Renames updatedAt to updated_at in the database
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.StudentDetails, {
      foreignKey: 'student_details_id',
      as: 'student_details'  // <-- add alias here
    });
  };


  return Payment;
};


