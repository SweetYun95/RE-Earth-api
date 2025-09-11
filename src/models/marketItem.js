// RE-Earth-api/src/models/marketItem.js
const Sequelize = require('sequelize')

module.exports = class MarketItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            title: {
               type: Sequelize.STRING(150),
               allowNull: false,
            },
            description: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            price: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            marketItemSellStatus: {
               type: Sequelize.ENUM('SELL', 'SOLD_OUT'),
               allowNull: false,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'MarketItem',
            tableName: 'marketItems',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.MarketItemImage, { foreignKey: 'marketItemId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.ChatRoom, { foreignKey: 'marketItemId', sourceKey: 'id', onDelete: 'CASCADE' })
   }
}
