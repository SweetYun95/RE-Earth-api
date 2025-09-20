// RE-Earth-api/src/models/qnaComment.js
const Sequelize = require('sequelize')

module.exports = class QnaComment extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            body: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            qnaId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → qnas.id
            adminId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id (관리자)
         },
         {
            sequelize,
            modelName: 'QnaComment',
            tableName: 'qnaComments',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.Qna, { foreignKey: 'qnaId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.belongsTo(db.User, { as: 'Admin', foreignKey: 'adminId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
