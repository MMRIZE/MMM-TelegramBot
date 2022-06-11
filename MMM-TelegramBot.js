'use strict'
/* Magic Mirror
 * Module: MMM-TelegramBot
 *
 * By eouia & @bugsounet
 */
 String.prototype.toRegExp = function() {
   var lastSlash = this.lastIndexOf("/")
   if(lastSlash > 1) {
     var restoredRegex = new RegExp(
       this.slice(1, lastSlash),
       this.slice(lastSlash + 1)
     )
     return (restoredRegex) ? restoredRegex : new RegExp(this.valueOf())
   } else {
     return new RegExp(this.valueOf())
   }
 }

Module.register("MMM-TelegramBot", {
  defaults: {
    allowedUser: [],
    commandAllowed: { // If set, only specific user can use these commands, other even in allowedUser cannot. These members should be allowed by allowedUser first.
      //"telecast": ["eouia", "someone"],
      //"mychatid": ["eouia"]
    },
    alertTimer: "30000",
    useWelcomeMessage: true,
    useSoundNotification: true,
    TelegramBotServiceAlerte: true,
    verbose:false,
    detailOption: {},
    //if you want this module to work behind local proxy, try this. (experimental)
    /*
    detailOption: {
      request: {
        proxy: "https://someone:somepassword@local.proxy.addr:1234",
      }
    }
    */
    favourites:["/commands", "/modules", "/hideall", "/showall"],
    customCommands:[],
    telecast: null, // true or chat_id
    telecastLife: 1000 * 60 * 60 * 6,
    telecastLimit: 5,
    telecastHideOverflow: true,
    telecastContainer: 300,
    dateFormat: "DD-MM-YYYY HH:mm:ss"
  },

  start: function() {
    this.isAlreadyInitialized = 0
    this.commands = []
    this.customCommandCallbacks = new Map()
    this.askSession = new Set()
    this.commonSession = new Map()
    this.config.text = {
      "TELBOT_HELPER_ERROR" : this.translate("TELBOT_HELPER_ERROR"),
      "TELBOT_HELPER_NOT_ALLOWED" : this.translate("TELBOT_HELPER_NOT_ALLOWED"),
      "TELBOT_HELPER_RESTART" : this.translate("TELBOT_HELPER_RESTART"),
      "TELBOT_HELPER_WAKEUP" : this.translate("TELBOT_HELPER_WAKEUP"),
      "TELBOT_HELPER_MSG_COMING" : this.translate("TELBOT_HELPER_MSG_COMING"),
      "TELBOT_HELPER_TOOOLDMSG" : this.translate("TELBOT_HELPER_TOOOLDMSG"),
      "TELBOT_HELPER_SERVED": this.translate("TELBOT_HELP_SERVED", { module: "TelegramBot Service"})
    }
    this.config = configMerge({}, this.defaults, this.config)
    this.sendSocketNotification('INIT', this.config)
    this.getCommands(
      new TelegramBotCommandRegister(this, this.registerCommand.bind(this))
    )
    this.allowed = new Set(this.config.allowedUser)
    this.history = []
    this.chats = []
    /** audio part **/
    if (this.config.useSoundNotification) {
      this.sound = new Audio()
      this.sound.autoplay = true
    }
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
      id: "translations/id.json",
      fr: "translations/fr.json",
      it: "translations/it.json",
      es: "translations/es.json"
    }
  },

  getStyles: function() {
    return ["MMM-TelegramBot.css"]
  },

  getScripts: function() {
    return ["TELBOT_lib.js", "configMerge.min.js"]
  },

  registerCommand: function(module, commandObj) {
    var c = commandObj
    var command = c.command
    var moduleName = module.name
    var callback = ((c.callback) ? (c.callback) : 'notificationReceived')
    if (typeof callback !== "function") {
      if (typeof module[callback] !== 'function') return false
    }
    var isNameUsed = 1
    var idx = 0
    for (var j in this.commands) {
      var sameCommand = this.commands.filter(function(com) {
        if (com.command == command) return com
      })
      if (sameCommand.length > 0) {
        isNameUsed = 1
        command = c.command + idx
        idx++
      } else {
        isNameUsed = 0
      }
    }
    var cObj = {
      command : command,
      execute : c.command,
      moduleName : module.name,
      module : module,
      description: c.description,
      callback : callback,
      argsPattern : c.args_pattern,
      argsMapping : c.args_mapping,
    }
    this.commands.push(cObj)
    return true
  },

  getCommands: function(Register) {
    var defaultCommands = [
      {
        command: 'help',
        callback : 'TELBOT_help',
        description : this.translate("TELBOT_HELP"),
        args_pattern : [/^[^\s]+/],
        args_mapping : ['command']
      },
      {
        command: 'commands',
        description: this.translate("TELBOT_COMMANDS"),
        callback : 'TELBOT_list_commands'
      },
      {
        command: 'modules',
        description: this.translate("TELBOT_MODULES"),
        callback : 'TELBOT_list_modules'
      },
      {
        command : 'mychatid',
        description: this.translate("TELBOT_MYCHATID"),
        callback : 'TELBOT_mychatid'
      },
      {
        command : 'allowed',
        description: this.translate("TELBOT_ALLOWED"),
        callback : 'TELBOT_allowed'
      },
      {
        command : 'allowuser',
        description: this.translate("TELBOT_ALLOWUSER"),
        callback : 'TELBOT_allowuser',
        args_pattern : [/^[^\s]+/],
        args_mapping : ['username']
      },
      {
        command: 'hideall',
        description : this.translate("TELBOT_HIDEALL"),
        callback : 'TELBOT_hideall',
      },
      {
        command: 'showall',
        description : this.translate("TELBOT_SHOWALL"),
        callback : 'TELBOT_showall',
      },
      {
        command: 'hide',
        description : this.translate("TELBOT_HIDE"),
        callback : 'TELBOT_hide',
      },
      {
        command: 'show',
        description : this.translate("TELBOT_SHOW"),
        callback : 'TELBOT_show',
      },
      {
        command: 'alert',
        description : this.translate("TELBOT_ALERT"),
        callback : 'TELBOT_alert',
      },
      {
        command: 'reboot',
        description : this.translate("TELBOT_REBOOT"),
        callback : 'TELBOT_reboot',
      },
      {
        command: 'shutdown',
        description : this.translate("TELBOT_SHUTDOWN"),
        callback : 'TELBOT_shutdown',
      },
      {
        command: 'dismissalert',
        description : this.translate("TELBOT_DISMISSALERT"),
        callback : 'TELBOT_dismissalert',
      },
      {
        command: 'favor',
        callback : 'TELBOT_favor',
        description : this.translate("TELBOT_FAVOR"),
      },
      {
        command: 'recent',
        callback : 'TELBOT_recent',
        description : this.translate("TELBOT_RECENT"),
      },
      {
        command: 'resetkeyboard',
        callback : 'TELBOT_reset_keyboard',
        description : this.translate("TELBOT_RESET_KEYBOARD"),
      },
      {
        command: 'shell',
        callback: 'TELBOT_shell',
        description: this.translate("TELBOT_SHELL"),
      },
      {
        command: 'notification',
        callback: 'TELBOT_noti',
        description: this.translate("TELBOT_NOTIFICATION"),
        args_pattern: [/([^\s]+)\s?([^\s]?.*|)$/]
      },
      {
        command: 'screenshot',
        callback: 'TELBOT_screenshot',
        description: this.translate("TELBOT_SCREENSHOT"),
      },
      {
        command: 'telecast',
        callback: 'TELBOT_telecast',
        description: this.translate("TELBOT_TELECAST"),
      },
      {
        command: 'clean',
        callback: 'TELBOT_clean',
        description: this.translate("TELBOT_CLEAN"),
      },
    ]
    defaultCommands.forEach((c) => {
      Register.add(c)
    })
    this.config.customCommands.forEach((c)=>{
      Register.add(c)
    })
  },

  TELBOT_clean: function(command, handler) {
     if (!this.config.telecast) {
      var text = this.translate("TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    this.chats = []
    this.updateDom()
    handler.reply("TEXT", this.translate("TELBOT_CLEAN_DONE"))
  },

  TELBOT_telecast: function(command, handler) {
    if (!this.config.telecast) {
      var text = this.translate("TELBOT_TELECAST_FALSE")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    handler.message.text = handler.args
    handler.message.caption = handler.args
    this.sendSocketNotification("FORCE_TELECAST", handler.message)
  },

  TELBOT_screenshot: function(command, handler) {
    var sessionId = Date.now() + "_" + this.commonSession.size
    this.commonSession.set(sessionId, handler)
    this.sendSocketNotification("SCREENSHOT", {session: sessionId})
  },

  TELBOT_screenshot_result: function(sessionId, ret) {
    var handler = this.commonSession.get(sessionId)
    var text = ""
    if (handler && ret.status) {
      this.commonSession.delete(sessionId)
      text = this.translate("TELBOT_SCREENSHOT_RESULT") + ret.timestamp
      handler.reply("PHOTO_PATH", ret.path, {caption: text})
      this.sendNotification("GPHOTO_UPLOAD", ret.path)
    } else {
      text = this.translate("TELBOT_SCREENSHOT_RESULT_ERROR") + "\n" + ret.result
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
    }
  },

  TELBOT_noti: function(command, handler) {
    var error = null
    if (!handler.args || !handler.args[0]) {
      var text = this.translate("TELBOT_NOTIFICATION_FAIL")
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
      return
    }
    var noti = handler.args[0][1]
    var pstr = handler.args[0][2]
    var payload = pstr
    if (pstr.indexOf("{") + pstr.indexOf("[") !== -2) {
      try {
        payload = JSON.parse(pstr)
      } catch (e) {
        var text = this.translate("TELBOT_NOTIFICATION_PAYLOAD_FAIL")
        text += "\n" + "`" + payload + "`"
        handler.reply("TEXT", text, {parse_mode:"Markdown"})
        return
      }
    }
    this.sendNotification(noti, payload)
    handler.reply("TEXT", this.translate("TELBOT_NOTIFICATION_RESULT"), {parse_mode:"Markdown"})
  },

  TELBOT_shell: function (command, handler) {
    var exec = handler.args
    var sessionId = Date.now() + "_" + this.commonSession.size
    if (exec) {
      this.commonSession.set(sessionId, handler)
      this.sendSocketNotification("SHELL", {
        session: sessionId,
        exec: exec
      })
    }
  },

  TELBOT_shell_result: function(sessionId, ret) {
    var handler = this.commonSession.get(sessionId)
    var text = ""
    if (handler) {
      this.commonSession.delete(sessionId)
      text = this.translate("TELBOT_SHELL_RESULT") + ret
    } else {
      text = this.translate("TELBOT_SHELL_RESULT_SESSION_ERROR")
    }
    handler.reply("TEXT", text, {parse_mode:"Markdown"})
  },

  TELBOT_favor: function (command, handler) {
    var text = this.translate("TELBOT_FAVOR_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.config.favourites]
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_recent: function (command, handler) {
    var text = this.translate("TELBOT_RECENT_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        keyboard: [this.history]
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_reset_keyboard: function (command, handler) {
    var text = this.translate("TELBOT_RESET_KEYBOARD_RESULT")
    handler.reply("TEXT", text, {
      reply_markup: {
        remove_keyboard:true,
      },
      parse_mode:"Markdown"
    })
  },

  TELBOT_alert: function (command, handler) {
    var title = moment().format("LT") + " - " + handler.message.from.first_name
    var message = handler.args
    var alerttime = this.config.alertTimer
    var text = this.translate("TELBOT_ALERT_RESULT")
    this.sendNotification('SHOW_ALERT', {
      timer:alerttime,
      title:title,
      message:message
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_dismissalert: function (command, handler) {
    this.sendNotification('HIDE_ALERT')
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_hideall: function(command, handler) {
    var text = this.translate("TELBOT_HIDEALL_RESULT")
    var lockString = this.name
    MM.getModules().enumerate((m)=> {
      m.hide(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_showall: function(command, handler) {
    var text = this.translate("TELBOT_SHOWALL_RESULT")
    var lockString = this.name
    MM.getModules().enumerate((m)=> {
      m.show(500, {lockString:"TB_LOCK"})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_hide: function(command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (m.hidden) return handler.reply("TEXT", handler.args + this.translate("TELBOT_HIDE_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.hide(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.translate("TELBOT_HIDE_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.translate("TELBOT_HIDE_LOCKED"))
          }
          else {
            m.hide(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.translate("TELBOT_HIDE_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.translate("TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.translate("TELBOT_MODULE_NAME"))
  },

  TELBOT_show: function(command, handler) {
    var found = false
    var unlock = false
    if (handler.args) {
      MM.getModules().enumerate((m)=> {
        if (m.name == handler.args) {
          found = true
          if (!m.hidden) return handler.reply("TEXT", handler.args + this.translate("TELBOT_SHOW_ALREADY"))
          if (m.lockStrings.length > 0) {
            m.lockStrings.forEach( lock => {
              if (lock == "TB_LOCK") {
                m.show(500, {lockString: "TB_LOCK"})
                if (m.lockStrings.length == 0) {
                  unlock = true
                  handler.reply("TEXT", handler.args + this.translate("TELBOT_SHOW_DONE"))
                }
              }
            })
            if (!unlock) return handler.reply("TEXT", handler.args + this.translate("TELBOT_SHOW_LOCKED"))
          }
          else {
            m.show(500, {lockString: "TB_LOCK"})
            handler.reply("TEXT", handler.args + this.translate("TELBOT_SHOW_DONE"))
          }
        }
      })
      if (!found) handler.reply("TEXT", this.translate("TELBOT_MODULE_NOTFOUND") + handler.args)
    } else return handler.reply("TEXT", this.translate("TELBOT_MODULE_NAME"))
  },

  TELBOT_allowed: function(command, handler) {
    var text = ""
    for (var username of this.allowed) {
      if (text == "") {
        text += "`" + username + "`"
      } else {
        text += ", `" + username + "`"
      }
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_allowuser: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("TELBOT_ONLY_ADMIN")
    } else if (handler.args !== null) {
      var user = handler.args['username']
      this.allowed.add(user)
      this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
      text = this.translate("TELBOT_ALLOWUSER_REGISTERED")
    } else {
      text = this.translate("TELBOT_ALLOWUSER_ERROR")
    }

    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_reboot: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.translate("TELBOT_REBOOT_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.sendSocketNotification('REBOOT')
    }
  },

  TELBOT_shutdown: function(command, handler) {
    var text = ""
    if (handler.message.admin !== 'admin') {
      text = this.translate("TELBOT_ONLY_ADMIN")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
    } else {
      text = this.translate("TELBOT_SHUTDOWN_RESPONSE")
      handler.reply("TEXT", text, {parse_mode:'Markdown'})
      this.sendSocketNotification('SHUTDOWN')
    }
  },

  TELBOT_mychatid: function(command, handler) {
    //handler.tell, handler.reply, handler.ask
    var text = this.translate(
      "TELBOT_MYCHATID_RESULT",
      {"chatid":handler.message.chat.id}
    )
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_list_modules: function(command, handler) {
    var text = ""
    var hidden = this.translate("TELBOT_HIDDEN")
    var showing = this.translate("TELBOT_SHOWING")
    MM.getModules().enumerate((m) => {
      text += "`" + m.name + "` _"

      text += ((m.hidden) ? hidden : showing)
      text += "_\n"
    })
    if (!text) {
      text = this.translate("TELBOT_MODULES_ERROR")
    }
    handler.reply('TEXT', text, {parse_mode:'Markdown'})
  },

  TELBOT_list_commands: function(command, handler) {
    var text = ""
    this.commands.forEach((c) => {
      var name = c.command
      var description = (c.description) ? c.description : ""
      var bits = description.split(/[\.\n]/)
      text += "*" + name + "* \- _" + bits[0] + "_\n"
    })
    if (!text) {
      text = this.translate("TELBOT_COMMANDS_ERROR")
    }
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_help: function(command, handler) {
    var target
    var text = ""
    if (handler.args !== null) {
      target = handler.args['command']
      this.commands.forEach((c)=>{
        if (c.command == target) {
          text += "`/" + c.command + "`\n"
          text += (c.description) ? c.description : ""
          text += "\n"
          text += (
            (c.moduleName)
              ? (this.translate('TELBOT_HELP_SERVED', {"module":c.moduleName}))
              : ""
          )
          text += "\n"
        }
      })
    }
    if (!text) {
      text = this.translate("TELBOT_HELP_HELP")
    }
    var result = handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  parseCommand: function(msg) {
    const createHandler = (msg, args) => {
      var callbacks = {
        reply: this.reply.bind(this),
        ask: this.ask.bind(this),
        say: this.say.bind(this)
      }
      return new TelegramBotMessageHandler(msg, args, callbacks)
    }
    var args = null
    var response = null
    var chatId = msg.chat.id
    if (typeof msg.text == 'undefined') return
    var msgText = msg.text
    if (msgText.indexOf("/") !== 0) return
    var matched = msgText.match(new RegExp("^\/([0-9a-zA-Z-_]+)\s?(.*)$"))
    var matchedCommands = []
    if (matched) {
      matchedCommands = this.commands.filter((c)=>{
        if (c.command.indexOf(matched[1]) == 0) return true
        return false
      })
      if (matchedCommands.length > 1) {
        var exact = matchedCommands.filter((c)=>{
          if (c.command == matched[1]) return true
          return false
        })
        if (exact.length == 1) {
          matchedCommands = exact
        }
      }
    }
    if (matchedCommands.length == 1) {
      //proper
      var c = matchedCommands[0]
      if (this.config.commandAllowed.hasOwnProperty(c.command)) {
        var allowedUser = this.config.commandAllowed[c.command]
        if (Array.isArray(allowedUser) && allowedUser.length > 0) {
          if (!allowedUser.includes(msg.from.username)) {
            var handler = createHandler(msg, null)
            var text = this.translate("TELBOT_NOT_ALLOWED_COMMAND")
            handler.reply("TEXT", text, {parse_mode:"Markdown"})
            return
          }
        }
      }
      var restText = matched[2].trim()
      if (restText == '') {
        args = null
      } else {
        if (c.argsPattern && Array.isArray(c.argsPattern)) {
          args = []
          for(var j = 0; j < c.argsPattern.length; j++) {
            var p = c.argsPattern[j]
            if (p instanceof RegExp) {
              //do nothing.
            } else {
              if (typeof p == 'string') {
                p = p.toRegExp()
              } else {
                p = /.*/
              }
            }
            var result = p.exec(restText.trim())
            if (c.argsMapping && Array.isArray(c.argsMapping)) {
              if (typeof c.argsMapping[j] !== 'undefined') {
                if (result && result.length == 1) {
                  args[c.argsMapping[j]] = result[0]
                } else {
                  args[c.argsMapping[j]] = result
                }
              } else {
                if (result && result.length == 1) {
                  args.push(result[0])
                } else {
                  args.push(result)
                }
              }
            } else {
              if (result && result.length == 1) {
                args.push(result[0])
              } else {
                args.push(result)
              }
            }
          }
        } else {
          args = restText
        }
      }
      if (msg.chat.id == this.config.adminChatId) {
        msg.admin = 'admin'
      }
      if (c.callback !== 'notificationReceived') {
        var handler = createHandler(msg, args)
        if (typeof c.callback == "function") {
          c.callback(c.execute, handler, c.module)
        } else {
          c.module[c.callback].bind(c.module)
          c.module[c.callback](c.execute, handler, c.module)
        }
      } else {
        c.module[c.callback].bind(c.module)
        c.module[c.callback](c.execute, args)
      }
      this.history.push(msg.text)
      while(this.history.length > 5) {
        this.history.shift()
      }
    } else {
      //0 or multi
      var handler = createHandler(msg, null)
      var text = this.translate("TELBOT_NOT_REGISTERED_COMMAND")
      if (matchedCommands.length > 1) {
        text = this.translate("TELBOT_FOUND_SEVERAL_COMMANDS")
        for (var tc of matchedCommands) {
          text += `*/${tc.command}*\n`
        }
      }
      handler.reply("TEXT", text, {parse_mode:"Markdown"})
    }
  },

  reply: function(response) {
    this.sendSocketNotification('REPLY', response)
  },

  ask: function(response, sessionId, callback) {
    if (sessionId == null) return false
    var session = {
      session_id : sessionId,
      callback:callback,
      time:moment().format('X')
    }
    this.askSession.add(session)
    response.askSession = session
    this.sendSocketNotification('ASK', response)
  },

  say: function(response, adminMode=false) {
    if (adminMode) {
      this.sendSocketNotification('SAY_ADMIN', response)
    } else {
      this.sendSocketNotification('SAY', response)
    }
  },

  telecast: function(msgObj) {
    if (!msgObj.text && !msgObj.photo && !msgObj.sticker && !msgObj.animation && !msgObj.audio && !msgObj.voice) return
    if (this.config.useSoundNotification) this.sound.src = "modules/MMM-TelegramBot/msg_incoming.mp3"
    while (this.chats.length >= this.config.telecastLimit) {
      this.chats.shift()
    }
    this.chats.push(msgObj)
    var dom = document.querySelector("#TELBOT .container")

    while(dom.childNodes.length >= this.config.telecastLimit + 1) {
      if (dom.firstChild.id !== "TELBOT_ANCHOR") dom.removeChild(dom.firstChild)
    }
    this.appendTelecastChat(dom, msgObj)
    this.sendNotification("TELBOT_TELECAST", msgObj)
    var dom = document.querySelector("#TELBOT .container")
    var anchor = document.querySelector("#TELBOT_ANCHOR")
    anchor.scrollIntoView(false)
  },

  getDom: function() {
    var dom = document.createElement("div")
    dom.id = "TELBOT"
    if ((isNaN(this.config.telecastContainer)) || this.config.telecastContainer < 200 || this.config.telecastContainer > 1000) {
      /** Wrong setting go to default **/
      this.config.telecastContainer = this.defaults.telecastContainer
    }
    dom.setAttribute('style', "--container-width:" + this.config.telecastContainer + "px;");

    if (this.config.telecast) {
      dom.appendChild(this.getTelecastDom())
    }
    return dom
  },

  appendTelecastChat: function(parent, c) {
    const getImageURL = (id)=>{
      return "/modules/MMM-TelegramBot/cache/" + id
    }
    var anchor = parent.querySelector("#TELBOT_ANCHOR")
    var chat = document.createElement("div")
    chat.classList.add("chat")
    var from = document.createElement("div")
    from.classList.add("from")
    var profile = document.createElement("div")
    profile.classList.add("profile")
    if (c.from._photo) {
      let profileImage = document.createElement("img")
      profileImage.classList.add("profileImage")
      profileImage.src = getImageURL(c.from._photo)
      profile.appendChild(profileImage)
    } else {
      let altName = ""
      if (c.from.first_name) altName += c.from.first_name.substring(0, 1)
      if (c.from.last_name) altName += c.from.last_name.substring(0, 1)
      if (!altName) altName += c.from.username.substring(0, 2)
      let rr = c.from.id % 360
      var hsl = `hsl(${rr}, 75%, 50%)`
      //profile.style.backgroundColor = "hsl(${rr}, 100%, 50%)"
      profile.style.backgroundColor = hsl
      profile.innerHTML = altName
    }
    from.appendChild(profile)
    chat.appendChild(from)
    var message = document.createElement("div")
    message.classList.add("message")
    var bubble = document.createElement("div")
    bubble.classList.add("bubble")
    //reply
    if (c.chat._photo) {
      var photo = document.createElement("div")
      photo.classList.add("photo")
      var background = document.createElement("div")
      background.classList.add("background")
      background.style.backgroundImage = `url(${getImageURL(c.chat._photo)})`
      photo.appendChild(background)
      var imageContainer = document.createElement("div")
      imageContainer.classList.add("imageContainer")
      var photoImage = document.createElement("img")
      photoImage.classList.add("photoImage")
      photoImage.src = getImageURL(c.chat._photo)
      photoImage.onload = ()=>{
        anchor.scrollIntoView(false)
      }
      imageContainer.appendChild(photoImage)
      photo.appendChild(imageContainer)
      bubble.appendChild(photo)
    }
    if (c.chat._video) {
      var video = document.createElement("video")
      video.classList.add("video")
      video.autoplay = true
      video.loop = true
      video.src = getImageURL(c.chat._video)
      video.addEventListener('loadeddata', () => {
          anchor.scrollIntoView(false)
      }, false)
      video.addEventListener("error", (e) => {
         delete c.chat._video
         c.text = "Video Error!"
         this.updateDom()
      }, false)
      bubble.appendChild(video)
    }

    if (c.text) {
      var text = document.createElement("div")
      text.classList.add("text")
      text.innerHTML = c.text
      bubble.appendChild(text)
    }

    if (c.chat._audio) {
      var text = document.createElement("div")
      text.classList.add("text")
      var audio = new Audio(getImageURL(c.chat._audio))
      audio.volume = 0.6
      audio.play()
      text.innerHTML = c.title ? c.title: (c.caption ? c.caption :"Audio")
      bubble.appendChild(text)
    }

    if (c.chat._voice) {
      var text = document.createElement("div")
      text.classList.add("text")
      var voice = new Audio(getImageURL(c.chat._voice))
      voice.volume = 1.0
      voice.play()
      text.innerHTML = "Voice"
      bubble.appendChild(text)
    }

    message.appendChild(bubble)
    chat.appendChild(message)
    chat.timer = setTimeout(()=>{
      parent.removeChild(chat)
    }, this.config.telecastLife)
    parent.insertBefore(chat, anchor)
  },

  getTelecastDom: function() {
    var dom = document.createElement("div")
    dom.classList.add("container")
    var anchor = document.createElement("div")
    anchor.id = "TELBOT_ANCHOR"
    dom.appendChild(anchor)
    if (this.config.telecastHideOverflow) dom.classList.add("telecastHideOverflow")
    for (var c of this.chats) {
      this.appendTelecastChat(dom, c)
    }
    return dom
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'CHAT':
        this.telecast(payload)
        break
      case 'COMMAND':
        this.parseCommand(payload)
        break
      case 'SHELL_RESULT':
        this.TELBOT_shell_result(payload.session, payload.result)
        break
      case 'SCREENSHOT_RESULT':
        this.TELBOT_screenshot_result(payload.session, payload)
        break
      case 'ANSWER':
        this.askSession.forEach((s)=> {
          if (s.session_id == payload.sessionId) {
            var callbacks = {
              reply: this.reply.bind(this),
              ask: this.ask.bind(this),
              say: this.say.bind(this)
            }
            var handler = new TelegramBotMessageHandler(
              payload,
              payload.text,
              callbacks
            )
            s.callback("ANSWER_FOR_ASK", handler)
            this.askSession.delete(s)
            return
          }
          if (moment.unix(s.time).isBefore(moment().add(-1, 'hours'))) {
            this.askSession.delete(s)
          }
        })
      break
    }
  },

  notificationReceived: function (notification, payload, sender) {
    switch(notification) {
      case 'ALL_MODULES_STARTED':
        if (this.isAlreadyInitialized) {
          return
        }
        this.isAlreadyInitialized = 1
        this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
        var commands = []
        MM.getModules().enumerate((m) => {
          if (m.name !== 'MMM-TelegramBot') {
            if (typeof m.getCommands == 'function') {
              var tc = m.getCommands(new TelegramBotCommandRegister(
                m,
                this.registerCommand.bind(this)
              ))
              if (Array.isArray(tc)) {
                tc.forEach((c)=>{
                  this.registerCommand(m, c)
                })
              }
            }
          }
        })
        break
      case 'TELBOT_REGISTER_COMMAND':
        this.registerCommand(sender, payload)
        break
      case 'TELBOT_TELL_ADMIN':
        if (typeof payload == 'string') {
          payload += "\n" + this.translate("TELBOT_HELP_SERVED" , {module: sender.name})
          var r = {
            chat_id : null,
            type : 'TEXT',
            text : payload,
            option : {parse_mode:'Markdown'}
          }
          this.say(r, true)
        } else if (typeof payload == "object") {
          var r = Object.assign({}, payload, {chat_id:null})
          this.say(r, true)
        }
        break
    }
  },
})
