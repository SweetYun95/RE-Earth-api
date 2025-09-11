// RE-Earth-api/src/models/orderItem.js
const Sequelize = require('sequelize')

module.exports = class OrderItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderPrice: { type: Sequelize.INTEGER, allowNull: false },
            pointOrderId: { type: Sequelize.INTEGER, allowNull: false }, // FK → pointOrders.id
            itemId: { type: Sequelize.INTEGER, allowNull: false }, // FK → items.id
         },
         {
            sequelize,
            modelName: 'OrderItem',
            tableName: 'orderItems',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['pointOrderId'] }, { fields: ['itemId'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.PointOrder, {
         foreignKey: 'pointOrderId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
      this.belongsTo(db.Item, {
         foreignKey: 'itemId',
         targetKey: 'id',
         onDelete: 'RESTRICT', // 주문상품 존재 시 상품 삭제 방지
         onUpdate: 'CASCADE',
      })
   }
}
