'use strict'

const moment = require('moment')
const TelegramBot = require('node-telegram-bot-api');


const startTime = moment()

var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function () {
    this.config = {}
    this.commands = []
    this.callsigns = []
    this.adminChatId = ''
    this.askSession = new Set()
    this.allowed = new Set()
    this.TB = null
  },

  initialize: function(config) {
    this.config = config

    if (typeof config.adminChatId !== 'undefined') {
      this.adminChatId = config.adminChatId
    }

    if (typeof config.telegramAPIKey !== 'undefined') {
      try {
        this.TB = new TelegramBot(config.telegramAPIKey, {polling:true})
        var me = this.TB.getMe()
      } catch (err) {
        console.log(err)
      }



      if (this.adminChatId) {
        this.say(this.welcomeMsg())
      }

      this.TB.on('message', (msg) =>{
        var time = moment.unix(msg.date)
        console.log (this.allowed)
        if (startTime.isBefore(time)) {
          console.log("[TLGBOT][" + time.format('YYYY-MM-DD HH:mm:ss') + "] Message is coming.")
          if (!this.allowed.has(msg.from.username)) {
            this.say(this.notAllowedMsg(msg.message_id, msg.chat.id))
          }
          if (msg.reply_to_message) {
            var reply = msg.reply_to_message.message_id
            var foundSession = 0
            this.askSession.forEach((s) => {
              if(s.messageId == reply) {
                foundSession = 1
                msg.sessionId = s.sessionId
                this.sendSocketNotification('ANSWER', msg)
                this.askSession.delete(s)
                return
              }
              if (moment.unix(s.time).isBefore(moment().add(-1, 'hours'))) {
                this.askSession.delete(s)
              }
            })
            if (foundSession == 1) return
          }

          this.sendSocketNotification('MESSAGE', msg)
          return
        } else {
          //too old. do nothing
        }
      })

    }
  },

  tooOldMsg: function(origMsg) {
    var text = origMsg.text
      + "\nYour message on `"
      + moment.unix(origMsg.date).format('YYYY-MM-DD HH:mm:ss')
      + "` is too old so I'll ignore."
    var msg = {
      type: 'TEXT',
      chat_id: origMsg.chat.id,
      text: text,
      option: {
        disable_notification: false,
        parse_mode: 'Markdown'
      }
    }
    return msg
  },

  welcomeMsg: function() {
    var text = "*I've just woken from a deep sleep!*\n"
      + "`MagicMirror` is restarted on `" + startTime.format("YYYY-MM-DD HH:mm:ss") + "`.\n"
    var msg = {
      type: 'TEXT',
      chat_id: this.adminChatId,
      text: text,
      option: {
        disable_notification: false,
        parse_mode: 'Markdown'
      }
    }
    return msg
  },

  notAllowedMsg: function(messageid, chatid) {
    var text = "You are not allowed to command me. Ask to my admin."
    var msg = {
      type: 'TEXT',
      chat_id: chatid,
      text: text,
      option: {
        reply_to_message_id: messageid,
        disable_notification: false,
        parse_mode: 'Markdown'
      }
    }
    return msg
  },

  say: function(r, adminMode=false) {
    var chatId = (adminMode) ? this.adminChatId : r.chat_id
    var self = this
    switch(r.type) {
      case 'PHOTO':
        this.TB.sendPhoto(chatId, r.url, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'AUDIO':
        this.TB.sendAudio(chatId, r.url, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'LOCATION':
        this.TB.sendLocation(chatId, r.latitude, r.longitude, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'VENUE':
        this.TB.sendLocation(chatId, r.latitude, r.longitude, r.title, r.address, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'CONTACT':
        this.TB.sendContact(chatId, r.phoneNumber, r.firstName, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'TEXT':
      default:
        this.TB.sendMessage(chatId, r.text, r.option).catch((e) => {self.onError(e, r)})
        break;
    }
  },

  ask: function(r, adminMode=false) {
    console.log("ask!", r)
    var chatId = (adminMode) ? this.adminChatId : r.chat_id
    var sessionId = r.askSession.session_id

    var self = this
    switch(r.type) {
      case 'TEXT':
        this.TB.sendMessage(chatId, r.text, r.option)
          .then((ret)=> {
            this.askSession.add({
              sessionId:sessionId,
              messageId:ret.message_id,
              time:moment().format('X')
            })
          })
          .catch((e) => {self.onError(e, r)})
        break;
    }
  },

  socketNotificationReceived: function (notification, payload) {
    switch(notification) {
      case 'INIT':
        this.initialize(payload)
        break;
      case 'REPLY':
      case 'SAY':
        this.say(payload)
        break;
      case 'SAY_ADMIN':
        this.say(payload, true)
      case 'ASK':
        this.ask(payload)
        break;
      case 'ALLOWEDUSER':
        console.log('payload', payload)
        this.allowed = new Set(payload)
        console.log(">", this.allowed)
        break;
    }
  },

  onError: function(err, response) {
    console.log("[TLGBOT] Error: " + err.code)
    if (typeof err.response !== 'undefined') {
      console.log(err.response.body)
    } else {
      console.log(err)
    }
    if (err.code !== 'EFATAL') {
      var text = '`ERROR`\n'
        + "```\n"
        + ((err.response) ? err.response.body.description : "??")
        + "\n```\n"
        + "at\n"
        + "```\n"
        + JSON.stringify(response)
        + "\n```"
      var msg = {
        type: 'TEXT',
        text: text,
        option: {
          disable_notification: false,
          parse_mode: 'Markdown'
        }
      }
      this.say(msg, true)
    }
  }
})
