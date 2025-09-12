// RE-Earth-api/src/models/reportComment.js
const Sequelize = require('sequelize')

module.exports = class ReportComment extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            body: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            reportId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → reports.id
            adminId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id (관리자)
         },
         {
            sequelize,
            modelName: 'ReportComment',
            tableName: 'reportComments',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.Report, { foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.belongsTo(db.User, { as: 'Admin', foreignKey: 'adminId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
