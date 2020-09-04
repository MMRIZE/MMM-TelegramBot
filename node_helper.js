'use strict'

const moment = require('moment')
const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')
const exec = require('child_process').exec
const path = require('path')
const https = require('https')

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
    this.adminChatId = ""
    this.askSession = new Set()
    this.allowed = new Set()
    this.TB = null
  },

  initialize: function(config) {
    this.config = config
    if (this.config.verbose) log = _log
    if (typeof config.adminChatId !== 'undefined') {
      this.adminChatId = this.config.adminChatId
    }
    if (typeof config.telegramAPIKey !== 'undefined') {
      try {
        var option = Object.assign({polling:true}, config.detailOption)
        this.TB = new TelegramBot(config.telegramAPIKey, option)
        var me = this.TB.getMe()
      } catch (err) {
        log(err)
      }
      if (this.adminChatId && this.config.useWelcomeMessage) {
        this.say(this.welcomeMsg())
      }
      this.TB.on('message', (msg) =>{
        this.processMessage(msg)
      })
    } else {
      log("Configuration fails.")
    }
  },

  processMessage: function(msg) {
    var time = moment.unix(msg.date)
    if (startTime.isAfter(time)) return //do nothing
    var commandLike = (msg.text) ? msg.text : ((msg.caption) ? msg.caption : "")
    if (commandLike.indexOf("/") === 0) {
      //commandLike
      if (!this.allowed.has(msg.from.username)) {
        const notAllowedMsg = (messageid, chatid) => {
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
        }
        this.say(notAllowedMsg(msg.message_id, msg.chat.id))
        return
      } else {
        msg.text = commandLike
        this.sendSocketNotification('COMMAND', msg)
      }
    } else {
      // Not commandlike
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
        if (msg.reply_to_message.from.is_bot) return // Don't transfer reply for Robot.
      }
      // Not answer for Bot
      if (!this.config.telecast) return
      if (String(this.config.telecast) !== String(msg.chat.id)) return
      this.processTelecast(msg)
    }
  },

  processTelecast: function(msg) {
    this.cookMsg(msg, (message)=>{
      this.sendSocketNotification("CHAT", message)
    })
  },

  cookMsg: async function (msg, callback=(retmsg)=>{}) {
    var fromUserId = msg.from.id
    const clearCache = (life)=>{
      return new Promise ((resolve)=>{
        try {
          log("Clearing old cache data")
          var cacheDir = path.resolve(__dirname, "cache")
          var files = fs.readdirSync(cacheDir)
          for (var f of files) {
            var p = path.join(cacheDir, f)
            var stat = fs.statSync(p)
            var now = new Date().getTime()
            var endTime = new Date(stat.ctime).getTime() + life
            if (now > endTime) {
              log("Unlink old cache file:", p)
              fs.unlinkSync(p)
            }
          }
          resolve(true)
        } catch (e){
          resolve(e)
        }
      })
    }
    const downloadFile = (url, filepath)=>{
      return new Promise((resolve)=>{
        var f = fs.createWriteStream(filepath)
        f.on('finish', () => {
          f.close()
          resolve(filepath)
        })
        const request = https.get(url, (response) => {
          response.pipe(f)
        })
      })
    }
    const processProfilePhoto = async ()=>{
      var upp = await this.TB.getUserProfilePhotos(fromUserId, {offset:0, limit:1})
      if (!(upp && upp.total_count)) return null
      var file = path.resolve(__dirname, "cache", String(fromUserId))
      if (fs.existsSync(file)) return fromUserId
      var photo = upp.photos[0][0]
      var link = await this.TB.getFileLink(photo.file_id)
      await downloadFile(link, file)
      return fromUserId
    }
    const processChatPhoto = async (fileArray) => {
      var bigger = fileArray.reduce((p, v)=>{
        return (p.file_size > v.file_size ? p : v)
      })
      var fileId = bigger.file_id
      var link = await this.TB.getFileLink(fileId)
      var file = path.resolve(__dirname, "cache", String(bigger.file_unique_id))
      await downloadFile(link, file)
      return bigger.file_unique_id
    }
    var r = await clearCache(this.config.telecastLife)
    if (r instanceof Error) log (r)
    var profilePhoto = await processProfilePhoto()
    if (profilePhoto) msg.from["_photo"] = String(profilePhoto)
    if (msg.hasOwnProperty("photo") && Array.isArray(msg.photo)) {
      if (msg.caption) msg.text = msg.caption
      msg.chat["_photo"] = String(await processChatPhoto(msg.photo))
    }
    callback(msg)
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
        this.shell('sudo reboot')
        break;
      case 'SHUTDOWN':
        this.shell('sudo shutdown now')
        break;
      case 'PM2': //? used????
        this.shell('pm2 ' + payload)
        break;
      case 'SHELL':
        this.shell(payload.exec, payload.session)
        break
      case 'SCREENSHOT':
        this.screenshot(payload.session)
        break
      case 'FORCE_TELECAST':
        this.processTelecast(payload)
        break
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

      /** disabled -> infinite loop **/
      /** only sended to admin **/
      /*
      msg = {
        type: 'TEXT',
        chat_id: response.chat_id,
        text: this.config.text["TELBOT_HELPER_ERROR"]
      }
      this.say(msg)
      */
    }
  },

  shell: function(command, sessionId=null, callback=null){
    if (callback == null) {
      callback = (ret, session) => {
        if (ret.length > 3000) {
          ret = ret.slice(0, 3000) + " ..."
        }
        this.sendSocketNotification("SHELL_RESULT", {
          session: session,
          result: ret
        })
      }
    }
    log("SHELL:", command)
    exec(command, function(error, stdout, stderr){
      var result = stdout
      if (error) { result = error.message}
      log("SHELL RESULT:", result)
      callback(result, sessionId)
    })
  },

  screenshot: function(sessionId = null, callback=null) {
    var command = this.config.screenshotScript + " screenshot.png"
    var t = new moment()
    var retObj = {
      session: sessionId,
      timestamp: t.format("YYYY/MM/DD HH:mm:ss"),
      path: path.resolve("screenshot.png"),
      result: "",
      status: false
    }
    if (callback == null) {
      callback = (ret, session) => {
        if (ret.length > 3000) {
          ret = ret.slice(0, 3000) + " ..."
        }
        retObj.ret = ret
        this.sendSocketNotification("SCREENSHOT_RESULT", retObj)
      }
    }
    log("SCREENSHOT:", command)
    exec(command, function(error, stdout, stderr){
      var result = stdout
      if (error) {
        retObj.result = error.message
        result = error.message
      } else {
        retObj.status = true
      }
      log("SCREENSHOT RESULT:", result)
      callback(result, sessionId)
    })
  }

})
