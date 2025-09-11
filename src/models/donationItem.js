// RE-Earth-api/src/models/donationItem.js
const Sequelize = require('sequelize')

module.exports = class DonationItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemName: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            amount: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            donationId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → donations.id
         },
         {
            sequelize,
            modelName: 'DonationItem',
            tableName: 'donationItems',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['donationId'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.Donation, {
         foreignKey: 'donationId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
   }
}
