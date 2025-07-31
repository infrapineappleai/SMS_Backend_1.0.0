'use strict';

module.exports = (sequelize, DataTypes) => {
  const StudentDetails = sequelize.define('StudentDetails', {
    id: { type: 
      DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    user_id: { type: 
      DataTypes.INTEGER, 
      allowNull: false, 
      unique: true 
    },
    salutation: DataTypes.STRING,
    ice_contact: DataTypes.STRING,
    student_no: { type: 
      DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    photo_url: DataTypes.STRING
  }, {
    tableName: "student_details",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

  StudentDetails.associate = (models) => {
    StudentDetails.belongsTo(models.User, { foreignKey: 'user_id', as: "User"});
  };

  return StudentDetails;
};
