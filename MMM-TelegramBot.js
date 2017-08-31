'use strict'
/* Magic Mirror
 * Module: MMM-TelegramBot
 *
 * By eouia
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
    allowedUser: []
  },
  requiresVersion: "2.1.2", // Required version of MagicMirror

  start: function() {
    this.isAlreadyInitialized = 0
    this.commands = []
    this.askSession = new Set()
    this.config.text = {
      "TELBOT_HELPER_ERROR" : this.translate("TELBOT_HELPER_ERROR"),
      "TELBOT_HELPER_NOT_ALLOWED" : this.translate("TELBOT_HELPER_NOT_ALLOWED"),
      "TELBOT_HELPER_RESTART" : this.translate("TELBOT_HELPER_RESTART"),
      "TELBOT_HELPER_WAKEUP" : this.translate("TELBOT_HELPER_WAKEUP"),
      "TELBOT_HELPER_MSG_COMING" : this.translate("TELBOT_HELPER_MSG_COMING"),
      "TELBOT_HELPER_TOOOLDMSG" : this.translate("TELBOT_HELPER_TOOOLDMSG")
    }
    this.sendSocketNotification('INIT', this.config)
    this.getCommands(
      new TelegramBotCommandRegister(this, this.registerCommand.bind(this))
    )
    this.allowed = new Set(this.config.allowedUser)
  },

  getTranslations: function() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
    }
  },

  getScripts: function() {
    return ["TELBOT_lib.js"]
  },

  registerCommand: function(module, commandObj) {
    var c = commandObj
    var command = c.command
    var moduleName = module.name

    var callback = ((c.callback) ? (c.callback) : 'notificationReceived')
    if (typeof module[callback] !== 'function') return false

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
    ]
    defaultCommands.forEach((c) => {
      Register.add(c)
    })
  },

  TELBOT_alert: function (command, handler) {
    var title = handler.message.from.first_name
    var message = handler.args
    var text = this.translate("TELBOT_ALERT_RESULT")
    this.sendNotification('SHOW_ALERT', {
      timer:30000,
      title:title,
      message:message
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_hideall: function(command, handler) {
    var text = this.translate("TELBOT_HIDEALL_RESULT")
    var lockString = this.name
    MM.getModules().enumerate((m)=> {
      m.hide(0, {lockString:lockString})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TELBOT_showall: function(command, handler) {
    var text = this.translate("TELBOT_SHOWALL_RESULT")
    var lockString = this.name
    MM.getModules().enumerate((m)=> {
      m.show(0, {lockString:lockString})
    })
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
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
    MM.getModules().enumerate((m) => {
      text += "`" + m.name + "`"
      text += ((m.hidden) ? " _hidden_" : " _showing_")
      text += "\n"
    })
    if (!text) {
      text = this.translate("TELBOT_MODULES_ERROR")
    }
    handler.reply('TEXT', text, {parse_mode:'Markdown'})
  },

  TELBOT_list_commands: function(command, handler) {
    var text = ""
    this.commands.forEach((c) => {
      text += "`/" + c.command + "`"
      text += ((c.moduleName) ? (" - _" + c.moduleName + "_"): "")
      text += "\n"
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
    var args = null
    var response = null
    var chatId = msg.chat.id
    if (typeof msg.text == 'undefined') return
    var msgText = msg.text
    var matched = msgText.match(new RegExp("^\/([0-9a-zA-Z-_]+)\s?(.*)$"))
    if (matched) { // This is something like command
      var commandFound = 0
      for (var i in this.commands) {
        var c = this.commands[i]
        if (c.command == matched[1]) { // Proper command found!
          commandFound = 1
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
            var callbacks = {
              reply: this.reply.bind(this),
              ask: this.ask.bind(this),
              say: this.say.bind(this)
            }
            var handler = new TelegramBotMessageHandler(msg, args, callbacks)
            c.module[c.callback].bind(c.module)
            c.module[c.callback](c.execute, handler)
          } else {
            c.module[c.callback].bind(c.module)
            c.module[c.callback](c.execute, args)
          }
        } else {
          continue
        }
      }
      if (commandFound == 0) {
        var callbacks = {
          reply: this.reply.bind(this),
          ask: this.ask.bind(this),
          say: this.say.bind(this)
        }
        var handler = new TelegramBotMessageHandler(msg, null, callbacks)
        handler.reply("TEXT", this.translate("TELBOT_NOT_REGISTERED_COMMAND"))
      }
    } else {
      // do nothing. This is not command
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

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'MESSAGE':
        this.parseCommand(payload)
        break;
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
      break;
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
        var self = this
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
        break;
      case 'TELBOT_TELL_ADMIN':
        if (typeof payload == 'string') {
          payload += "\nFrom *" + sender.name + "*"
          var r = {
            chat_id : null,
            type : 'TEXT',
            text : payload,
            option : {parse_mode:'Markdown'}
          }
          this.say(r, true)
        }
        break;
    }
  },
})
