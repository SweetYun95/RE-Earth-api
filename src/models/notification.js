// RE-Earth-api/src/models/notification.js
const Sequelize = require('sequelize')

module.exports = class Notification extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            title: { type: Sequelize.STRING(120), allowNull: false },
            body: { type: Sequelize.STRING(500), allowNull: false },
            refType: { type: Sequelize.STRING(100), allowNull: false, field: 'reftype' }, // 연결대상유형
            refId: { type: Sequelize.INTEGER, allowNull: false, field: 'refid' }, // 연결대상 식별자
            isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, // 읽음여부
            userId: { type: Sequelize.INTEGER, allowNull: false }, // 회원식별(FK → users.id)
         },
         {
            sequelize,
            modelName: 'Notification',
            tableName: 'notifications',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [
               { fields: ['userId'] },
               { fields: ['isRead'] },
               { fields: ['reftype', 'refid'] }, // ref 조회 성능
            ],
            scopes: {
               unread: { where: { isRead: false } },
               read: { where: { isRead: true } },
            },
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
   }
}
