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
            }, // 위젯 타입 키(ex. 'salesSummary','activeUsers')
            title: {
               type: Sequelize.STRING(100),
               allowNull: true,
            }, // 사용자 지정 타이틀
            config: {
               type: Sequelize.JSON,
               allowNull: true,
            }, // 위젯 개별 설정(필터, 기간 등)
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
            sortOrder: {
               type: Sequelize.INTEGER,
               allowNull: true,
            },
            isVisible: {
               type: Sequelize.BOOLEAN,
               allowNull: false,
               defaultValue: true,
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
            indexes: [
               { fields: ['dashboardId'] },
               { unique: true, fields: ['dashboardId', 'widgetKey'] }, // 하나의 대시보드에 동일 위젯 타입 중복 방지
               { fields: ['sortOrder'] },
            ],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.AdminDashboard, { foreignKey: 'dashboardId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
