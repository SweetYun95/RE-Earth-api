// RE-Earth-api/src/models/point.js
const Sequelize = require('sequelize')

module.exports = class Point extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            amount: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 적립/사용 금액 (원화 등)
            reason: {
               type: Sequelize.STRING(200),
               allowNull: false,
            }, // 발생원인 코드/텍스트
            delta: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 누적 변화량(+적립 / -차감)
            description: {
               type: Sequelize.STRING(200),
               allowNull: true,
            }, // 상세 설명
            ecoActionLogId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → ecoActionLogs.id
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id
         },
         {
            sequelize,
            modelName: 'Point',
            tableName: 'points',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['userId'] }, { fields: ['ecoActionLogId'] }, { fields: ['reason'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.belongsTo(db.EcoActionLog, { foreignKey: 'ecoActionLogId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.PointOrder, { foreignKey: 'pointId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
