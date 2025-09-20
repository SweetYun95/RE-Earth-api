// RE-Earth-api/src/models/donation.js
const Sequelize = require('sequelize')

module.exports = class Donation extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            // ───────── 신청자 정보
            donorName: { type: Sequelize.STRING(50), allowNull: false },
            donorPhone: { type: Sequelize.STRING(30), allowNull: false },
            donorEmail: { type: Sequelize.STRING(100), allowNull: true, validate: { isEmail: true } },

            // ───────── 수거 주소
            zipcode: { type: Sequelize.STRING(10), allowNull: false },
            address1: { type: Sequelize.STRING(200), allowNull: false },
            address2: { type: Sequelize.STRING(200), allowNull: true },

            // ───────── 일정/메모
            pickupDate: { type: Sequelize.DATEONLY, allowNull: false },
            memo: { type: Sequelize.STRING(500), allowNull: true },

            // ───────── 상태/동의
            // ENUM이 부담되면 일단 STRING(32)로 두고 나중에 ENUM으로 바꿔도 됨
            status: {
               type: Sequelize.ENUM('REQUESTED', 'SCHEDULED', 'PICKED', 'CANCELLED'),
               allowNull: false,
               defaultValue: 'REQUESTED',
            },
            agreePolicy: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

            // ───────── 부가 필드(유지)
            count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, // 아이템 총 수량(합계)
            expectedPoint: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }, // 예상 포인트(후처리 산정)
            receiptUrl: { type: Sequelize.STRING(500), allowNull: true }, // 영수증/확인증 링크

            // ───────── FK
            userId: { type: Sequelize.INTEGER, allowNull: true }, // 로그인 사용자면 설정
         },
         {
            sequelize,
            modelName: 'Donation',
            tableName: 'donations',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['userId'] }, { fields: ['status'] }, { fields: ['pickupDate'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         onDelete: 'SET NULL',
         onUpdate: 'CASCADE',
      })
      this.hasMany(db.DonationItem, {
         as: 'items',
         foreignKey: 'donationId',
         sourceKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
   }
}
