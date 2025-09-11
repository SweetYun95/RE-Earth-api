// RE-Earth-api/src/models/postImage.js
const Sequelize = require('sequelize')

module.exports = class PostImage extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orImgName: { type: Sequelize.STRING(150), allowNull: false },
            imgUrl: { type: Sequelize.STRING(255), allowNull: false },
            repImgYn: { type: Sequelize.CHAR(1), allowNull: false, validate: { isIn: [['Y', 'N']] } },
            postId: { type: Sequelize.INTEGER, allowNull: false }, // FK → posts.id
         },
         {
            sequelize,
            modelName: 'PostImage',
            tableName: 'postImages',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            indexes: [{ fields: ['postId'] }, { fields: ['repImgYn'] }],
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.Post, {
         foreignKey: 'postId',
         targetKey: 'id',
         onDelete: 'CASCADE',
         onUpdate: 'CASCADE',
      })
   }
}
