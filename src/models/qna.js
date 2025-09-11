// RE-Earth-api/src/models/qna.js
const Sequelize = require('sequelize')

module.exports = class Qna extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            title: {
               type: Sequelize.STRING(200),
               allowNull: false,
            },
            question: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            status: {
               type: Sequelize.ENUM('OPEN', 'ANSWERED', 'CLOSED'),
               allowNull: false,
               defaultValue: 'OPEN',
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'Qna',
            tableName: 'qna',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }
   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.QnaComment, { foreignKey: 'qnaId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.QnaImage, { foreignKey: 'qnaId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
