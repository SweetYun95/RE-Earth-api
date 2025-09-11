// RE-Earth-api/src/models/itemImage.js
const Sequelize = require('sequelize')

module.exports = class ItemImage extends Sequelize.Model {
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
            itemId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → items.id
         },
         {
            sequelize,
            modelName: 'ItemImage',
            tableName: 'itemImages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['itemId'] }, { fields: ['repImgYn'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.Item, { foreignKey: 'itemId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
