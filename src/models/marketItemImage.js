// RE-Earth-api/src/models/marketItemImage.js
const Sequelize = require('sequelize')

module.exports = class MarketItemImage extends Sequelize.Model {
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
            marketItemId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'MarketItemImage',
            tableName: 'marketItemsImages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.MarketItem, { foreignKey: 'marketItemId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
