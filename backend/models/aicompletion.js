'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AICompletion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  AICompletion.init({
    userId: DataTypes.INTEGER,
    fileId: DataTypes.INTEGER,
    originalText: DataTypes.TEXT,
    completedText: DataTypes.TEXT,
    model: DataTypes.STRING,
    tokensUsed: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'AICompletion',
  });
  return AICompletion;
};