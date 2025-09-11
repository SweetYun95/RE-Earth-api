// RE-Earth-api/src/models/ecoActionLog.js
const Sequelize = require('sequelize')

module.exports = class EcoActionLog extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            quantity: {
               type: Sequelize.DECIMAL(10, 3),
               allowNull: false,
            }, // 수행량(거리/시간)
            provider: {
               type: Sequelize.ENUM('MANUAL', 'TMONEY', 'KAKAO', 'API'),
               allowNull: false,
            },
            status: {
               type: Sequelize.STRING(100),
               allowNull: false,
            }, // 검증상태(관리자)
            carbonSave: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 산출된 탄소절감량
            ecoActionId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → ecoActions.id
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id
            pointEarned: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 최종포인트
            co2Saved: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 탄소절감량 스냅
            snapPointUnit: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            snapCo2PerUnit: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            snapUnit: {
               type: Sequelize.ENUM('KG', 'KM', 'EA'),
               allowNull: false,
               field: 'sanpUnit',
            }, // ERD 오타 컬럼명 매핑
            quantityCanonical: {
               type: Sequelize.DECIMAL(12, 3),
               allowNull: false,
            }, // 표준환산수량
            verifiedAt: {
               type: Sequelize.DATE,
               allowNull: false,
            },
            verifiedBy: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // FK → users.id (검증자 / 관리자)
            sourceRef: {
               type: Sequelize.STRING(130),
               allowNull: false,
            }, // 외부연동증거레퍼런스
         },
         {
            sequelize,
            modelName: 'EcoActionLog',
            tableName: 'ecoActionLogs',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['userId'] }, { fields: ['ecoActionId'] }, { fields: ['provider'] }, { fields: ['status'] }, { fields: ['verifiedAt'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.EcoAction, {
         foreignKey: 'ecoActionId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
      this.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
      this.belongsTo(db.User, {
         as: 'Verifier', // 관리자(검증자)
         foreignKey: 'verifiedBy',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
   }
}
