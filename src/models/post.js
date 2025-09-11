// RE-Earth-api/src/models/post.js
const Sequelize = require('sequelize')

module.exports = class Post extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            title: {
               type: Sequelize.STRING(200),
               allowNull: false,
            },
            status: {
               type: Sequelize.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
               allowNull: false,
            },
            publishedAt: {
               type: Sequelize.DATE,
               allowNull: true,
            },
            slug: {
               type: Sequelize.STRING(200),
               allowNull: true,
            },
            views: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 0,
            },
            notice: {
               type: Sequelize.BOOLEAN,
               allowNull: false,
               defaultValue: false,
            },
            body: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            commentsCount: {
               type: Sequelize.INTEGER,
               allowNull: false,
               defaultValue: 0,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            boardId: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            modelName: 'Post',
            tableName: 'posts',
            timestamps: true,
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
      this.belongsTo(db.Board, { foreignKey: 'boardId', targetKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.Comment, { foreignKey: 'postId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.PostImage, { foreignKey: 'postId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
