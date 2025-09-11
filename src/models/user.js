// RE-Earth-api/src/models/user.js
const Sequelize = require('sequelize')

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            name: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            password: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            address: {
               type: Sequelize.STRING(150),
               allowNull: false,
            },
            gender: {
               type: Sequelize.CHAR(1),
               allowNull: true,
               validate: {
                  isIn: [['F', 'M']],
               },
            },
            userId: {
               type: Sequelize.STRING(50),
               allowNull: false,
               unique: true,
            },
            role: {
               type: Sequelize.ENUM('ADMIN', 'USER'),
               allowNull: false,
            },
            phoneNumber: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            email: {
               type: Sequelize.STRING(100),
               allowNull: false,
               unique: true,
               validate: {
                  isEmail: true,
               },
            },
            provider: {
               type: Sequelize.ENUM('local', 'google', 'kakao'),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'User',
            tableName: 'users',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.hasMany(db.MarketItem, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.ChatRoom, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.ChatMessage, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.Token, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.Post, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.Comment, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })

      this.hasMany(db.Qna, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.QnaComment, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Report, { as: 'Reports', foreignKey: 'reporterId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Report, { as: 'HandledReports', foreignKey: 'handlerId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.ReportComment, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
