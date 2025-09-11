// RE-Earth-api/src/models/board.js
const Sequelize = require('sequelize')

module.exports = class Board extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            boardKey: { type: Sequelize.STRING(40), allowNull: false },
            name: { type: Sequelize.STRING(100), allowNull: false },
            description: { type: Sequelize.STRING(255), allowNull: true },
            visibility: { type: Sequelize.ENUM('PUBLIC', 'MEMBERS_ONLY'), allowNull: false },
            postingPermission: { type: Sequelize.ENUM('ALL', 'MEMBERS', 'MODS'), allowNull: false },
            sortOrder: { type: Sequelize.INTEGER, allowNull: true },
         },
         {
            sequelize,
            modelName: 'Board',
            tableName: 'boards',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.hasMany(db.Post, { foreignKey: 'boardId', sourceKey: 'id', onDelete: 'CASCADE' })
   }
}
