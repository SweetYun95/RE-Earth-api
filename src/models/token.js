// RE-Earth-api/src/models/token.js
const Sequelize = require('sequelize')

module.exports = class Token extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            // id는 PK + AUTO_INCREMENT로 자동 생성됨 (명시 불필요)
            host: {
               type: Sequelize.STRING(80),
               allowNull: false,
            },
            clientToken: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            userId: {
               // FK → users.id
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'Token',
            tableName: 'tokens',
            timestamps: true, // createdAt, updatedAt
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
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
