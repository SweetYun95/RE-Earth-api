// RE-Earth-api/src/models/donationItem.js
const Sequelize = require('sequelize')

module.exports = class DonationItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            // ───────── 새 구조(프론트 폼과 1:1 매칭)
            category: {
               type: Sequelize.ENUM('TOP', 'BOTTOM', 'OUTER', 'SHOES', 'BAG', 'ETC'),
               allowNull: false,
               defaultValue: 'TOP',
            },
            condition: {
               type: Sequelize.ENUM('GOOD', 'NORMAL', 'POOR'),
               allowNull: false,
               defaultValue: 'NORMAL',
            },
            quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
            note: { type: Sequelize.STRING(200), allowNull: true },

            // ───────── 구 스키마 호환(선택)
            itemName: { type: Sequelize.STRING(100), allowNull: true },
            amount: { type: Sequelize.INTEGER, allowNull: true },

            // ───────── FK
            donationId: { type: Sequelize.INTEGER, allowNull: false },
         },
         {
            sequelize,
            modelName: 'DonationItem',
            tableName: 'donationItems', // 기존 테이블명 유지
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
