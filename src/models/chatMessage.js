// RE-Earth-api/src/models/chatMessage.js
const Sequelize = require('sequelize')

module.exports = class ChatMessage extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            content: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            chatRoomId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               field: 'chatRoom',
            },
            userId: {
               // FK -> users.id (보낸 사람)
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'ChatMessage',
            tableName: 'chatMessages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.ChatRoom, { foreignKey: 'chatRoomId', targetKey: 'id', onDelete: 'CASCADE' })
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
