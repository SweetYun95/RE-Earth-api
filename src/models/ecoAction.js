// RE-Earth-api/src/models/ecoAction.js
const Sequelize = require('sequelize')

module.exports = class EcoAction extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            code: {
               type: Sequelize.STRING(80),
               allowNull: false,
            },
            description: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            unit: {
               type: Sequelize.ENUM('KG', 'KM', 'EA'),
               allowNull: false,
            }, // 측정기준단위
            carbonUnit: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 단위당 탄소절감량
            pointUnit: {
               type: Sequelize.INTEGER,
               allowNull: false,
            }, // 단위당 포인트
            active: {
               type: Sequelize.BOOLEAN,
               allowNull: false,
               defaultValue: true,
            },
         },
         {
            sequelize,
            modelName: 'EcoAction',
            tableName: 'ecoActions',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['code'] }, { fields: ['active'] }],
         }
      )
   }

   static associate(db) {
      this.hasMany(db.EcoActionLog, { foreignKey: 'ecoActionId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
