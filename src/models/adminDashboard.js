// RE-Earth-api/src/models/adminDashboard.js
const Sequelize = require('sequelize')

module.exports = class AdminDashboard extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            name: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            layout: {
               type: Sequelize.JSON,
               allowNull: false,
               defaultValue: {},
            }, // 전체 레이아웃(그리드, 테마 등)
            adminId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 소유자 → users.id
         },
         {
            sequelize,
            modelName: 'AdminDashboard',
            tableName: 'adminDashboards',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'adminId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.AdminDashboardWidget, { foreignKey: 'dashboardId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
