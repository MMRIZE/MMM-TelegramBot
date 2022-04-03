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
    this.adminChatId = undefined
    this.askSession = new Set()
    this.allowed = new Set()
    this.TB = null
    this.counterInstance = 0
    this.TBService = true
  },

  initialize: function(config) {
    this.config = config
    this.TBService = this.config.TelegramBotServiceAlerte
    if (this.config.verbose) log = _log
    console.log("[TELBOT] MMM-TelegramBot Version:",  require('./package.json').version)
    if (typeof config.adminChatId !== 'undefined') {
      this.adminChatId = this.config.adminChatId
    }
    if (typeof config.telegramAPIKey !== 'undefined') {
      try {
        var option = Object.assign({polling:true}, config.detailOption)
        this.TB = new TelegramBot(config.telegramAPIKey, option)
        var me = this.TB.getMe()
      } catch (err) {
        return console.log("[TELBOT]", err)
      }

      /** Catch any errors TelegramBot Service
       *  303 SEE_OTHER
       *  400 BAD_REQUEST
       *  401 UNAUTHORIZED
       *  403 FORBIDDEN
       *  404 NOT_FOUND
       *  406 NOT_ACCEPTABLE
       *  409 MULTI_INSTANCE
       *  420 FLOOD
       *  500 INTERNAL
       *  and others
      **/
      this.TB.on('polling_error', (error) => {
        if (!error.response) {
          error = {
            response: {
              body: {
                error_code: "EFATAL",
                description: "No internet ?"
              }
            }
          }
        }
        console.log("[TELBOT] Error " + error.response.body.error_code, error.response.body.description)
        var msg = {
          type: 'TEXT',
          text: null,
          option: {
            disable_notification: false,
            parse_mode: 'Markdown'
          }
        }
        switch (error.response.body.error_code) {
          case 409:
            if (this.counterInstance >= 3) {
              if (this.TBService) {
                msg.text = "*[WARNING] This instance of TelegramBot is now stopped!*"
                msg.text += "\n\n" + this.config.text["TELBOT_HELPER_SERVED"]
                this.say(msg, true)
              } else {
                console.log("[TELBOT] stopPolling...")
              }
              this.TB.stopPolling()
            } else {
              this.counterInstance += 1
              if (this.TBService) {
                msg.text = "*[WARNING] Make sure that only one TelegramBot instance is running!*",
                msg.text += "\n\n" + this.config.text["TELBOT_HELPER_SERVED"]
                this.say(msg, true)
              }
            }
            break
          case "EFATAL":
          case 401:
          case 420:
            console.log("[TELBOT] stopPolling and waiting 1 min before retry...")
            this.TB.stopPolling()
            setTimeout(() => {
              this.TB.startPolling()
              console.log("[TELBOT] startPolling...")
              if (this.TBService) {
                msg.text = "*" + this.config.text["TELBOT_HELPER_WAKEUP"] + "*\n"
                msg.text += "Error: "+ error.response.body.error_code + "\n"
                msg.text += "Description: " + error.response.body.description
                msg.text += "\n\n" + this.config.text["TELBOT_HELPER_SERVED"]
                this.say(msg, true)
              }
            } , 1000 * 60)
            break
          default:
            if (this.TBService) {
              msg.text = "*[WARNING] An error has occurred!*\n"
              msg.text += "Error: "+ error.response.body.error_code + "\n"
              msg.text += "Description: " + error.response.body.description
              msg.text += "\n\n" + this.config.text["TELBOT_HELPER_SERVED"]
              this.say(msg, true)
            }
            break
        }
      })
      /** end of TelegramBot Service **/
      if (this.adminChatId && this.config.useWelcomeMessage) {
        this.say(this.welcomeMsg())
      }
      console.log("[TELBOT] Ready!")
      this.TB.on('message', (msg) =>{
        this.processMessage(msg)
      })
    } else {
      console.log("[TELBOT] Configuration fails.")
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
      if (String(this.config.telecast) == String(msg.chat.id) || this.allowed.has(msg.from.username)) {
        this.processTelecast(msg)
      }
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

    const processChatSticker = async (sticker) => {
      var fileId = sticker.thumb.file_id
      var link = await this.TB.getFileLink(fileId)
      var file = path.resolve(__dirname, "cache", String(sticker.thumb.file_unique_id))
      await downloadFile(link, file)
      return sticker.thumb.file_unique_id
    }

    const processChatAnimated = async (animation) => {
      var fileId = animation.file_id
      var link = await this.TB.getFileLink(fileId)
      var file = path.resolve(__dirname, "cache", String(animation.file_unique_id))
      await downloadFile(link, file)
      return animation.file_unique_id
    }

    const processChatAudio = async (audio) => {
      var fileId = audio.file_id
      var link = await this.TB.getFileLink(fileId)
      var file = path.resolve(__dirname, "cache", String(audio.file_unique_id))
      await downloadFile(link, file)
      return audio.file_unique_id
    }

    var r = await clearCache(this.config.telecastLife)
    if (r instanceof Error) log (r)
    var profilePhoto = await processProfilePhoto()
    if (profilePhoto) msg.from["_photo"] = String(profilePhoto)
    if (msg.hasOwnProperty("photo") && Array.isArray(msg.photo)) {
      if (msg.caption) msg.text = msg.caption
      msg.chat["_photo"] = String(await processChatPhoto(msg.photo))
    }
    if (msg.hasOwnProperty("sticker")) { // pass sticker as photo
      msg.chat["_photo"] = String(await processChatSticker(msg.sticker))
    }
    if (msg.hasOwnProperty("animation")) { // pass animation as video
      msg.chat["_video"] = String(await processChatAnimated(msg.animation))
    }
    if (msg.hasOwnProperty("audio")) {
      msg.chat["_audio"] = String(await processChatAudio(msg.audio))
    }

    if (msg.hasOwnProperty("voice")) {
      msg.chat["_voice"] = String(await processChatAudio(msg.voice))
    }

    callback(msg)
  },

  tooOldMsg: function(origMsg) {
    var text = origMsg.text
      + this.config.text["TELBOT_HELPER_TOOOLDMSG"]
      + moment.unix(origMsg.date).format(this.config.dateFormat)
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
      + "\n`" + startTime.format(this.config.dateFormat) + "`\n"
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
    if (!this.TB.isPolling() || !chatId) return
    switch(r.type) {
      case 'VOICE_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendVoice(chatId, data, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'VOICE_URL':
        this.TB.sendVoice(chatId, r.path, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'VIDEO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendVideo(chatId, data, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'VIDEO_URL':
        this.TB.sendVideo(chatId, r.path, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'DOCUMENT_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendDocument(chatId, data, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'DOCUMENT_URL':
        this.TB.sendDocument(chatId, r.path, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'PHOTO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendPhoto(chatId, data, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'PHOTO_URL':
        this.TB.sendPhoto(chatId, r.path, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'AUDIO_PATH':
        var data = fs.readFileSync(r.path);
        this.TB.sendAudio(chatId, data, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'AUDIO_URL':
        this.TB.sendAudio(chatId, r.path, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'LOCATION':
        this.TB.sendLocation(chatId, r.latitude, r.longitude, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'VENUE':
        this.TB.sendVenue(chatId, r.latitude, r.longitude, r.title, r.address, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'CONTACT':
        this.TB.sendContact(chatId, r.phoneNumber, r.firstName, r.option).catch((e) => {this.onError(e, r)})
        break;
      case 'TEXT':
      default:
        this.TB.sendMessage(chatId, r.text, r.option).catch((e) => {this.onError(e, r)})
        break;
    }
  },

  ask: function(r, adminMode=false) {
    var chatId = (adminMode) ? this.adminChatId : r.chat_id
    var sessionId = r.askSession.session_id

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
          .catch((e) => {this.onError(e, r)})
        break;
    }
  },

  socketNotificationReceived: function (notification, payload) {
    switch(notification) {
      case 'INIT':
        if (this.TB === null) {
          this.initialize(payload)
        } else {
          console.log("[TELBOT] Already running!")
        }
        break;
      case 'REPLY':
      case 'SAY':
        if (this.TB) this.say(payload)
        break;
      case 'SAY_ADMIN':
        if (this.TB) this.say(payload, true)
        break;
      case 'ASK':
        if (this.TB) this.ask(payload)
        break;
      case 'ALLOWEDUSER':
        if (this.TB) {
          this.allowed = new Set(payload)
        }
        break;
      case 'REBOOT':
        if (this.TB) this.shell('sudo reboot')
        break;
      case 'SHUTDOWN':
        if (this.TB) this.shell('sudo shutdown now')
        break;
      case 'PM2': //? used????
        if (this.TB) this.shell('pm2 ' + payload)
        break;
      case 'SHELL':
        if (this.TB) this.shell(payload.exec, payload.session)
        break
      case 'SCREENSHOT':
        if (this.TB) this.screenshot(payload.session)
        break
      case 'FORCE_TELECAST':
        if (this.TB) this.processTelecast(payload)
        break
    }
  },

  onError: function(err, response) {
    if (!this.TB.isPolling()) return
    if (typeof err.response !== 'undefined') {
      console.log("[TELBOT] ERROR" , err.response.body)
    } else {
      console.log("[TELBOT] ERROR", err.code)
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
    var shotDir = path.resolve(__dirname, "screenshot")
    var command = "scrot -o " + shotDir + "/screenshot.png"
    var t = new moment()
    var retObj = {
      session: sessionId,
      timestamp: t.format(this.config.dateFormat),
      path: shotDir + "/screenshot.png",
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
