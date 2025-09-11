// RE-Earth-api/src/models/index.js
const Sequelize = require('sequelize')
const env = process.env.NODE_ENV || 'development'
const config = require('../config/config')[env]

// === 모델 모듈 로드 ===
const User = require('./user')
const Item = require('./item')
const ItemImage = require('./itemImage')
const OrderItem = require('./orderItem')
const Point = require('./point')
const PointOrder = require('./pointOrder')
const Donation = require('./donation')
const DonationItem = require('./donationItem')
const Board = require('./board')
const Post = require('./post')
const PostImage = require('./postImage')
const Comment = require('./comment')
const Qna = require('./qna')
const QnaComment = require('./qnaComment')
const QnaImage = require('./qnaImage')
const Report = require('./report')
const ReportComment = require('./reportComment')
const ReportImage = require('./reportImage')
const Notification = require('./notification')
const AdminDashboard = require('./adminDashboard')
const AdminDashboardWidget = require('./adminDashboardWidget')
const MarketItem = require('./marketItem')
const MarketItemImage = require('./marketItemImage')
const ChatRoom = require('./chatRoom')
const ChatMessage = require('./chatMessage')
const EcoAction = require('./ecoAction')
const EcoActionLog = require('./ecoActionLog')
const Token = require('./token')

const db = {}
const sequelize = new Sequelize(config.database, config.username, config.password, config)
db.sequelize = sequelize
db.Sequelize = Sequelize

Object.assign(db, {
   User,
   Item,
   ItemImage,
   OrderItem,
   Point,
   PointOrder,
   Donation,
   DonationItem,
   Board,
   Post,
   PostImage,
   Comment,
   Qna,
   QnaComment,
   QnaImage,
   Report,
   ReportComment,
   ReportImage,
   Notification,
   AdminDashboard,
   AdminDashboardWidget,
   MarketItem,
   MarketItemImage,
   ChatRoom,
   ChatMessage,
   EcoAction,
   EcoActionLog,
   Token,
})

// === Initialize ===
User.init(sequelize)
Item.init(sequelize)
ItemImage.init(sequelize)
OrderItem.init(sequelize)
Point.init(sequelize)
PointOrder.init(sequelize)
Donation.init(sequelize)
DonationItem.init(sequelize)
Board.init(sequelize)
Post.init(sequelize)
PostImage.init(sequelize)
Comment.init(sequelize)
Qna.init(sequelize)
QnaComment.init(sequelize)
QnaImage.init(sequelize)
Report.init(sequelize)
ReportComment.init(sequelize)
ReportImage.init(sequelize)
Notification.init(sequelize)
AdminDashboard.init(sequelize)
AdminDashboardWidget.init(sequelize)
MarketItem.init(sequelize)
MarketItemImage.init(sequelize)
ChatRoom.init(sequelize)
ChatMessage.init(sequelize)
EcoAction.init(sequelize)
EcoActionLog.init(sequelize)
Token.init(sequelize)

// === Associate ===
User.associate?.(db)
Item.associate?.(db)
ItemImage.associate?.(db)
OrderItem.associate?.(db)
Point.associate?.(db)
PointOrder.associate?.(db)
Donation.associate?.(db)
DonationItem.associate?.(db)
Board.associate?.(db)
Post.associate?.(db)
PostImage.associate?.(db)
Comment.associate?.(db)
Qna.associate?.(db)
QnaComment.associate?.(db)
QnaImage.associate?.(db)
Report.associate?.(db)
ReportComment.associate?.(db)
ReportImage.associate?.(db)
Notification.associate?.(db)
AdminDashboard.associate?.(db)
AdminDashboardWidget.associate?.(db)
MarketItem.associate?.(db)
MarketItemImage.associate?.(db)
ChatRoom.associate?.(db)
ChatMessage.associate?.(db)
EcoAction.associate?.(db)
EcoActionLog.associate?.(db)
Token.associate?.(db)

module.exports = db
