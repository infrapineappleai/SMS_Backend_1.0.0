'use strict';

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: { 
      type: DataTypes.BIGINT, 
      primaryKey: true, 
      autoIncrement: true 
    },
    student_details_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false 
    },
    payment_date: { 
      type: DataTypes.DATEONLY, 
      allowNull: false 
    },
    amount: { 
      type: DataTypes.DOUBLE, 
      allowNull: false 
    },
    status: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
    }
  }, {
    tableName: 'payment',
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.StudentDetails, {
      foreignKey: 'student_details_id',
      as: 'student_details'
    });
  };

  return Payment;
};
