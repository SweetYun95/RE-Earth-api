// RE-Earth-api/src/models/user.js
const Sequelize = require('sequelize')

function makeUserId({ email, provider }) {
   // 이메일 앞부분 + 난수 4자리. 소셜이면 prefix
   const head = (email || '')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 24)
   const rnd = Math.floor(Math.random() * 9000 + 1000)
   const pref = provider && provider !== 'local' ? `${provider}_` : ''
   return `${pref}${head || 'user'}_${rnd}`.slice(0, 50)
}

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            name: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            // 소셜 계정은 비밀번호가 없을 수 있으므로 allowNull: true
            password: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            address: {
               type: Sequelize.STRING(150),
               allowNull: false,
            },
            gender: {
               type: Sequelize.CHAR(1),
               allowNull: true,
               validate: { isIn: [['F', 'M']] },
            },
            // 가입 로직에서 제공하지 않아도 훅에서 자동 생성
            userId: {
               type: Sequelize.STRING(50),
               allowNull: false,
               unique: true,
            },
            role: {
               type: Sequelize.ENUM('ADMIN', 'USER'),
               allowNull: false,
               defaultValue: 'USER',
            },
            // 전화번호는 숫자 외 기호/앞자리 0 보존을 위해 문자열 추천
            phoneNumber: {
               type: Sequelize.STRING(20),
               allowNull: true,
            },
            email: {
               type: Sequelize.STRING(100),
               allowNull: false,
               unique: true,
               validate: { isEmail: true },
            },
            provider: {
               type: Sequelize.ENUM('local', 'google', 'kakao'),
               allowNull: false,
               defaultValue: 'local',
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
            indexes: [{ unique: true, fields: ['email'] }, { unique: true, fields: ['userId'] }, { fields: ['provider'] }],
            hooks: {
               // userId 자동 생성
               beforeValidate(user) {
                  if (!user.userId) {
                     user.userId = makeUserId({ email: user.email, provider: user.provider })
                  }
               },
            },
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
      this.hasOne(db.AdminDashboard, { foreignKey: 'adminId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Notification, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Donation, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.EcoActionLog, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.EcoActionLog, { as: 'VerifiedLogs', foreignKey: 'verifiedBy', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Point, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.PointOrder, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
