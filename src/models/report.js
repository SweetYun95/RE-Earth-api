// RE-Earth-api/src/models/report.js
const Sequelize = require('sequelize')

module.exports = class Report extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            targetType: {
               type: Sequelize.STRING(200),
               allowNull: false,
            },
            reasonCode: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            reasonText: {
               type: Sequelize.STRING(300),
               allowNull: true,
            },
            status: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            reporterId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id
         },
         {
            sequelize,
            modelName: 'Report',
            tableName: 'reports',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.User, { as: 'Reporter', foreignKey: 'reporterId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.ReportComment, { foreignKey: 'reportId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.ReportImage, { foreignKey: 'reportId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
