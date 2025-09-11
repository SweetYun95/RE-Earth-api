// RE-Earth-api/src/models/donation.js
const Sequelize = require('sequelize')

module.exports = class Donation extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            count: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            expectedPoint: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            returnAddress: {
               type: Sequelize.STRING(200),
               allowNull: false,
            },
            status: {
               type: Sequelize.STRING(200),
               allowNull: false,
            },
            receiptUrl: {
               type: Sequelize.STRING(500),
               allowNull: false,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id
         },
         {
            sequelize,
            modelName: 'Donation',
            tableName: 'donations',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['userId'] }, { fields: ['status'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
      this.hasMany(db.DonationItem, {
         foreignKey: 'donationId',
         sourceKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
   }
}
