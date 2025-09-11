// RE-Earth-api/src/models/pointOrder.js
const Sequelize = require('sequelize')

module.exports = class PointOrder extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderDate: {
               type: Sequelize.DATEONLY,
               allowNull: false,
            },
            orderStatus: {
               type: Sequelize.ENUM('ORDER', 'READY', 'SHIPPED', 'DELIVERED', 'CANCEL'),
               allowNull: false,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id
            pointId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → points.id
         },
         {
            sequelize,
            modelName: 'PointOrder',
            tableName: 'pointOrders',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['userId'] }, { fields: ['pointId'] }, { fields: ['orderStatus'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.belongsTo(db.Point, { foreignKey: 'pointId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.OrderItem, { foreignKey: 'pointOrderId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
