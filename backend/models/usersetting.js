'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserSetting.init({
    userId: DataTypes.INTEGER,
    theme: DataTypes.STRING,
    editorFontSize: DataTypes.INTEGER,
    autoSave: DataTypes.BOOLEAN,
    highlightColors: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'UserSetting',
  });
  return UserSetting;
};