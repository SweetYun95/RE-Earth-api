const Sequelize = require('sequelize')

module.exports = class QnaImage extends Sequelize.Model {
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
            qnaId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'QnaImage',
            tableName: 'qnaImages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.Qna, { foreignKey: 'qnaId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
