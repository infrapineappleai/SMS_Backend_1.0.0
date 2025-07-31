'use strict';

module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define(
    'Course',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      course_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Completed'),
        allowNull: false,
        defaultValue: 'Active',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'course',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  Course.associate = (models) => {
    Course.hasMany(models.Grade, {
      foreignKey: 'course_id',
      as: 'grade',
      onDelete: 'CASCADE',
      hooks: true,
    });
    
    // Removed Slot association since the model doesn't exist
    // Course.hasMany(models.Slot, {
    //   foreignKey: 'course_id',
    //   as: 'slots',
    //   onDelete: 'CASCADE',
    //   hooks: true,
    // });
  };

  return Course;
};