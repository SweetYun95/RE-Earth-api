// RE-Earth-api/src/models/adminDashboardWidget.js
const Sequelize = require('sequelize')

module.exports = class AdminDashboardWidget extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            dashboardId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → adminDashboards.id
            widgetKey: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            title: {
               type: Sequelize.STRING(100),
               allowNull: true,
            },
            config: {
               type: Sequelize.JSON,
               allowNull: true,
            },
            posX: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 0,
            },
            posY: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 0,
            },
            width: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 3,
            },
            height: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 2,
            },
         },
         {
            sequelize,
            modelName: 'AdminDashboardWidget',
            tableName: 'adminDashboardWidgets',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['dashboardId'] }, { unique: true, fields: ['dashboardId', 'widgetKey'] }],
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.AdminDashboard, { foreignKey: 'dashboardId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
