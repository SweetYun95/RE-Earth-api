// RE-Earth-api/src/models/user.js
const Sequelize = require('sequelize')

function makeUserId({ email, provider }) {
   const head = (email || '')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 24)
   const rnd = Math.floor(Math.random() * 9000 + 1000)
   const prov = (provider || 'LOCAL').toUpperCase() // 안전하게 대문자화
   const pref = prov !== 'LOCAL' ? `${prov.toLowerCase()}_` : '' // 접두사는 소문자 유지
   return `${pref}${head || 'user'}_${rnd}`.slice(0, 50)
}

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            name: { type: Sequelize.STRING(50), allowNull: false },
            password: { type: Sequelize.STRING(255), allowNull: true },
            address: { type: Sequelize.STRING(150), allowNull: false },
            gender: { type: Sequelize.CHAR(1), allowNull: true, validate: { isIn: [['F', 'M']] } },
            userId: { type: Sequelize.STRING(50), allowNull: false, unique: true },
            role: { type: Sequelize.ENUM('ADMIN', 'USER'), allowNull: false, defaultValue: 'USER' },
            phoneNumber: { type: Sequelize.STRING(20), allowNull: true },
            email: { type: Sequelize.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
            provider: { type: Sequelize.ENUM('LOCAL', 'GOOGLE', 'KAKAO'), allowNull: false, defaultValue: 'LOCAL' },
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
               beforeValidate(user) {
                  if (user.provider) user.provider = String(user.provider).toUpperCase()
                  if (!user.userId) user.userId = makeUserId({ email: user.email, provider: user.provider })
               },
            },
         }
      )
   }

   static associate(db) {
      // ─ 게시글/댓글
      this.hasMany(db.Post, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      this.hasMany(db.Comment, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })

      // ─ 문의/신고
      this.hasMany(db.Qna, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      // ❌ HandledReports(userId=handlerId) 제거
      this.hasMany(db.Report, { as: 'Reports', foreignKey: 'reporterId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      // ❌ QnaComment/ReportComment 의 userId 참조 제거 → 관리자 기준으로 연결
      this.hasMany(db.QnaComment, { as: 'AdminQnaComments', foreignKey: 'adminId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.ReportComment, { as: 'AdminReportComments', foreignKey: 'adminId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })

      // ─ 대시보드/알림/기부/포인트 등 나머진 동일
      this.hasOne(db.AdminDashboard, { foreignKey: 'adminId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Notification, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Donation, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.EcoActionLog, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.EcoActionLog, { as: 'VerifiedLogs', foreignKey: 'verifiedBy', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.Point, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
      this.hasMany(db.PointOrder, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
   }
}
