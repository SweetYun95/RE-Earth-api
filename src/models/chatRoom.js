// RE-Earth-api/src/models/chatRoom.js
const Sequelize = require('sequelize')

module.exports = class ChatRoom extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            userId: {
               // FK -> users.id (채팅방 소유/참여 사용자)
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            marketItemId: {
               // FK -> marketItems.id (아나바다장터 아이템)
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'ChatRoom',
            tableName: 'chatRooms',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
      this.belongsTo(db.MarketItem, { foreignKey: 'marketItemId', targetKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.ChatMessage, { foreignKey: 'chatRomId', sourceKey: 'id', onDelete: 'CASCADE' })
   }
}
