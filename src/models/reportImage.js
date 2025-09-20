// RE-Earth-api/src/models/reportImage.js
const Sequelize = require('sequelize')

module.exports = class ReportImage extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orImgName: {
               type: Sequelize.STRING(150),
               allowNull: false,
            },
            imgUrl: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            repImgYn: {
               type: Sequelize.CHAR(1),
               allowNull: false,
               validate: { isIn: [['Y', 'N']] },
            },
            reportId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'ReportImage',
            tableName: 'reportImages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.Report, { foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
