// RE-Earth-api/src/models/item.js
const Sequelize = require('sequelize')

module.exports = class Item extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemNm: {
               type: Sequelize.STRING(80),
               allowNull: false,
            },
            price: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            itemDetail: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            itemSellStatus: {
               type: Sequelize.ENUM('SELL', 'SOLD_OUT'),
               allowNull: false,
            },
            stockNumber: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            itemSummary: {
               type: Sequelize.STRING(180),
               allowNull: true,
            },
            brandName: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            vendorName: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'Item',
            tableName: 'items',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['itemSellStatus'] }, { fields: ['brandName'] }, { fields: ['vendorName'] }],
         }
      )
   }

   static associate(db) {
      // Item 1:N ItemImage
      this.hasMany(db.ItemImage, { foreignKey: 'itemId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })

      // Item 1:N OrderItem (주문에 묶인 상품은 삭제 제한)
      this.hasMany(db.OrderItem, { foreignKey: 'itemId', sourceKey: 'id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
   }
}
