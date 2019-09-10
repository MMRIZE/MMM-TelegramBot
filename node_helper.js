'use strict'

const moment = require('moment')
const TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var exec = require('child_process').exec;

const startTime = moment()

var _log = function() {
    var context = "[TELBOT]"
    return Function.prototype.bind.call(console.log, console, context)
}()

var log = function() {
  //do nothing
}

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

    if (this.config.verbose) log = _log

    if (typeof config.adminChatId !== 'undefined') {
      this.adminChatId = config.adminChatId
    }

    if (typeof config.telegramAPIKey !== 'undefined') {
      try {
        this.TB = new TelegramBot(config.telegramAPIKey, {polling:true})
        var me = this.TB.getMe()
      } catch (err) {
        log(err)
      }



      if (this.adminChatId && this.config.useWelcomeMessage) {
        this.say(this.welcomeMsg())
      }

      this.TB.on('message', (msg) =>{
        var time = moment.unix(msg.date)
        if (startTime.isBefore(time)) {
          log(
            "[" + time.format('YYYY-MM-DD HH:mm:ss')
            + "]" + this.config.text["TELBOT_HELPER_MSG_COMING"]
            + ":" + msg.chat.id
          )
          if (!this.allowed.has(msg.from.username)) {
            this.say(this.notAllowedMsg(msg.message_id, msg.chat.id))
            return
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
      + this.config.text["TELBOT_HELPER_TOOOLDMSG"]
      + moment.unix(origMsg.date).format('YYYY-MM-DD HH:mm:ss')
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
    var text = "*" + this.config.text["TELBOT_HELPER_WAKEUP"] + "*\n"
      + this.config.text["TELBOT_HELPER_RESTART"]
      + "\n`" + startTime.format("YYYY-MM-DD HH:mm:ss") + "`\n"
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
    var text = this.config.text["TELBOT_HELPER_NOT_ALLOWED"]
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
      case 'VOICE_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendVoice(chatId, data, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'VOICE_URL':
        this.TB.sendVoice(chatId, r.path, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'VIDEO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendVideo(chatId, data, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'VIDEO_URL':
        this.TB.sendVideo(chatId, r.path, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'DOCUMENT_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendDocument(chatId, data, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'DOCUMENT_URL':
        this.TB.sendDocument(chatId, r.path, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'PHOTO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendPhoto(chatId, data, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'PHOTO_URL':
        this.TB.sendPhoto(chatId, r.path, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'AUDIO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendAudio(chatId, data, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'AUDIO_URL':
        this.TB.sendAudio(chatId, r.path, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'LOCATION':
        this.TB.sendLocation(chatId, r.latitude, r.longitude, r.option).catch((e) => {self.onError(e, r)})
        break;
      case 'VENUE':
        this.TB.sendVenue(chatId, r.latitude, r.longitude, r.title, r.address, r.option).catch((e) => {self.onError(e, r)})
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
        break;
      case 'ASK':
        this.ask(payload)
        break;
      case 'ALLOWEDUSER':
        this.allowed = new Set(payload)
        break;
      case 'REBOOT':
        execute('sudo reboot', function(callback){
          log(callback);
        });
        break;
      case 'SHUTDOWN':
        execute('sudo shutdown now', function(callback){
          log(callback);
        });
        break;
      case 'PM2':
        execute(('pm2 ' + payload), function(callback){
          log(callback);
        });
        break;
    }
  },

  onError: function(err, response) {
    log("Error: " + err.code)
    if (typeof err.response !== 'undefined') {
      log(err.response.body)
    } else {
      log(err)
    }
    log("ERR_RESPONSE", response)
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
      msg = {
        type: 'TEXT',
        chat_id: response.chat_id,
        text: this.config.text["TELBOT_HELPER_ERROR"]
      }
      this.say(msg)
      //console.log(msg)
    }
  }
})

function execute(command, callback){
  exec(command, function(error, stdout, stderr){ callback(stdout); });
}
