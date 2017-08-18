'use strict'
/* Magic Mirror
 * Module: MMM-TelegramBot
 *
 * By eouia
 */



var defaultCommands = [
  {
    command: 'help',
    description: 'Show description of commands.',
    TLGBOT_callee : 'TLGBOT_help',
    TLGBOT_callee_cammand : 'HELP',
    TLGBOT_description : "Show description of commands.\ne.g)`/help commands`.",
    TLGBOT_args_pattern : /([^\s]+)/,
  },
  {
    command: 'commands',
    description: 'List of available commands.',
    TLGBOT_callee : 'TLGBOT_list_commands'
  },
  {
    command: 'modules',
    description: 'List of current installed modules.',
    TLGBOT_callee : 'TLGBOT_list_modules'
  },
  {
    command : 'mychatid',
    description: 'Show chatId of this chat room.',
    TLGBOT_callee : 'TLGBOT_mychatid'
  },
  {
    command : 'allowed',
    description: 'List of allowed users',
    TLGBOT_callee : 'TLGBOT_allowed'
  },
  {
    command : 'allowuser',
    description : 'Allow user for using this bot.',
    TLGBOT_description: 'Allow user temporally. This user will lost permission after restart. You can put this user into `allowedUser` in `config.js` for permanent permission.',
    TLGBOT_callee : 'TLGBOT_allowuser',
    TLGBOT_args_pattern : /([^\s]+)/,
  },
]


var tempSpace = {}
tempSpace.session = []

Module.register("MMM-TelegramBot", {
  defaults: {
    allowedUser: []
  },
  requiresVersion: "2.1.2", // Required version of MagicMirror

  start: function() {
    this.commands = []
    this.askSession = new Set()
    this.sendSocketNotification('INIT', this.config)
    this.registerCommands(this, defaultCommands)
    this.allowed = new Set(this.config.allowedUser)
    console.log(this.allowed)
  },

  registerCommands: function(module, commandsArray) {
    if (!Array.isArray(commandsArray)) return

    for(var i in commandsArray) {
      var c = commandsArray[i]
      var command = c.command
      var moduleName = module.name

      if (typeof module[c.TLGBOT_callee] !== 'function') continue

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

      var callee = ((c.TLGBOT_callee) ? (c.TLGBOT_callee) : 'notificationReceived')

      var cObj = {
        command : command,
        execute : (c.TLGBOT_callee_command) ? c.TLGBOT_callee_command : c.command,
        moduleName : module.name,
        module : module,
        description: (c.TLGBOT_description)
          ? (c.TLGBOT_description) : ((c.description) ? c.description : ""),
        callee : callee,
        argsPattern : c.TLGBOT_args_pattern
      }
      this.commands.push(cObj)
    }
  },

  getCommands: function(requester=null) {
  },



  TLGBOT_allowed: function(command, handler) {
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

  TLGBOT_allowuser: function(command, handler) {
    var text = ""
    if (handler.message.chat.id !== this.config.adminChatId) {
      text = "Only Admin in his private chat with me can command this."
    } else if (handler.args !== null) {
      var user = handler.args[1]
      this.allowed.add(user)
      this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
      text = "User is registered. \n Try `/allowed` for check. \nThis user will lost permission after restart. You can put this user into `allowedUser` in `config.js` for permanent permission."
    } else {
      text = "I cannot register this user. check the spell or username missing."
    }

    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TLGBOT_mychatid: function(command, handler) {
    //handler.tell, handler.reply, handler.ask
    var text = "Your `chatId` is `" + handler.message.chat.id + "`."
    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },



  TLGBOT_list_modules: function(command, handler) {
    var text = ""

    MM.getModules().enumerate((m) => {
      text += "`" + m.name + "`"
      text += ((m.hidden) ? " _hidden_" : " _showing_")
      text += "\n"
    })

    if (!text) {
      text = "I cannot find any module. hmmm... weird."
    }

    handler.reply('TEXT', text, {parse_mode:'Markdown'})
  },

  TLGBOT_list_commands: function(command, handler) {
    var text = ""

    this.commands.forEach((c) => {
      text += "`/" + c.command + "`"
      text += ((c.moduleName) ? (" - _" + c.moduleName + "_"): "")
      text += "\n"
    })

    if (!text) {
      text = "I cannot find any command. hmmm... weird."
    }

    handler.reply("TEXT", text, {parse_mode:'Markdown'})
  },

  TLGBOT_help: function(command, handler) {
    var target
    var text = ""
    console.log("help??", handler.args)
    if (handler.args !== null) {
      target = handler.args[1]
      this.commands.forEach(function(c){
        if (c.command == target) {
          text += "`/" + c.command + "`\n"
          text += (c.description) ? c.description : "-"
          text += "\n"
          text += ((c.moduleName) ? ("_Served by " + c.moduleName + "_"): "")
          text += "\n"
        }
      })
    }

    if (!text) {
      text = "What can I do for you? try `/help help`"
    }

    var result = handler.reply("TEXT", text, {parse_mode:'Markdown'})
    console.log('help_result', result)
  },

  parseCommand: function(msg) {
    var response = null
    var chatId = msg.chat.id
    if (typeof msg.text == 'undefined') return
    var msgText = msg.text

    var matched = msgText.match(new RegExp("^\/([0-9a-zA-Z-_]+)(.*)$"))

    if (matched) { // This is something like command
      for (var i in this.commands) {
        var c = this.commands[i]
        if (c.command == matched[1]) { // Proper command found!
          var ap = (c.argsPattern) ? c.argsPattern : null
          ap = (ap instanceof RegExp) ? ap : ((typeof ap == 'string') ? ap.toRegexp() : /.*/)
          var args = ap.exec(matched[2].trim())

          var callbacks = {
            reply: this.reply.bind(this),
            ask: this.ask.bind(this),
            say: this.say.bind(this)
          }
          var handler = new TLGBotMessageHandler(msg, args, callbacks)
          c.module[c.callee].bind(c.module)
          c.module[c.callee](c.execute, handler)

        } else {
          continue;
        }
      }
    } else {

    }
  },

  reply: function(response) {
    console.log("SN_REPLY:", response)
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
/*
  replyFunc: function(response, adminMode=false) {
    MM.getModules().enumerate(function(m) {
      if (m.name == 'MMM-TelegramBot') {
        m.sayTelegram(response, adminMode)
      }
    })
  },
  tellFunc: function(response, adminMode=false) {
    this.sayTelegram(response, adminMode)
  },
  askFunc: function(response, adminMode=false) {
    this.askTelegram(response, adminMode)
  },

  sayTelegram: function(response, adminMode=false) {
    if (adminMode) {
      this.sendSocketNotification('SAY_ADMIN', response)
    } else {
      this.sendSocketNotification('SAY', response)
    }
  },
  askTelegram: function(response, adminMode=false) {
    if (adminMode) {
      this.sendSocketNotification('ASK_ADMIN', response)
    } else {
      this.sendSocketNotification('ASK', response)
    }
  },
*/
  socketNotificationReceived: function (notification, payload) {
    console.log('NOTI', notification, payload)
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
            var handler = new TLGBotMessageHandler(payload, payload.text, callbacks)
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

  notificationReceived: function (notification, payload) {
    switch(notification) {
      case 'ALL_MODULES_STARTED':
        console.log("???", this.allowed)
        this.sendSocketNotification('ALLOWEDUSER', [...this.allowed])
        var commands = []
        var self = this
        MM.getModules().enumerate((m) => {
          if (typeof m.getCommands == 'function') {
            this.registerCommands(m, m.getCommands(this))
          }
        })
        break;
      case 'TLGBOT_TELL':
        this.sayTelegram(payload, false)
        break;
      case 'TLGBOT_TELL_ADMIN':
        this.sayTelegram(payload, true)
        break;
    }
  },
})

String.prototype.toRegexp = function() {
  var lastSlash = this.lastIndexOf("/")
  if(lastSlash > 1) {
    var restoredRegex = new RegExp(
      this.slice(1, lastSlash),
      this.slice(lastSlash + 1)
    )
    return (restoredRegex) ? restoredRegex : this
  } else {
    return this
  }
}

function TLGBotMessageHandler (message, args, callbacks) {
  this.args = args

  this.message = message
  this.chatId = message.chat.id
  this.userId = message.from.id
  this.messageId = message.message_id
  this.callbacks = callbacks
  this.sessionId = message.sessionId

}
/*
TLGBotMessageHandler.prototype.createMessage = function(type) {
  switch(type) {
    case 'LOCATION':
      return TLGMessage.create(LOCAT)
      new TLGLLocationMessage()
    case 'CONTACT':
      return new TLGLContactMessage()
    case 'VENUE':
      return new TLGVenueMessage()
    case 'PHOTO':
      return new TLGLPhotoMessage()
    case 'AUDIO':
      return new TLGLAudioMessage()
    case 'TEXT':
    default:
      return new TLGTextMessage()
  }
}
*/
TLGBotMessageHandler.prototype.say = function(type, reqs, opts) {
  var messageObject = TLGMessage.createMessage(type, reqs, opts)
  if (!messageObject) return false
  if(messageObject.class !== 'TLGBOT') return false
  messageObject.chat_id = this.chatId
  this.callbacks.say(messageObject)
}


TLGBotMessageHandler.prototype.reply = function(type, reqs, opts) {
  console.log(type)
  var messageObject = TLGMessage.createMessage(type, reqs, opts)
  console.log('here!!!', messageObject)
  if (!messageObject) return false
  if(messageObject.class !== 'TLGBOT') return false
  messageObject.chat_id = this.chatId
  messageObject.user_id = this.userId
  messageObject.option.reply_to_message_id = this.messageId
  console.log('here?????', messageObject)
  this.callbacks.reply(messageObject)
}

TLGBotMessageHandler.prototype.ask = function(type, reqs, opts, sessionId, callback) {
  var messageObject = TLGMessage.createMessage(type, reqs, opts)
  if (!messageObject) return false
  if(messageObject.class !== 'TLGBOT') return false
  messageObject.chat_id = this.chatId
  messageObject.option.reply_to_message_id = this.messageId

  this.callbacks.ask(messageObject, sessionId, callback)
}

class TLGMessage {
  constructor() {
    this.class = 'TLGBOT'
    this.type = null
    this.chat_id = null
    this.user_id = null
    this.message_id = null
    this.reply_to_message_id = null
    this.option = {}
  }
  optionAssign(option) {
    for(var i in option) {
      if (i in this.option) {
        this.option[i] = option[i]
      }
    }
  }
  static createMessage(type, reqs, opts) {
    switch(type) {
      case 'LOCATION':
        new TLGLLocationMessage(reqs, opts)
      case 'CONTACT':
        return new TLGLContactMessage(reqs, opts)
      case 'VENUE':
        return new TLGVenueMessage(reqs, opts)
      case 'PHOTO':
        return new TLGLPhotoMessage(reqs, opts)
      case 'AUDIO':
        return new TLGLAudioMessage(reqs, opts)
      case 'TEXT':
      default:
        return new TLGTextMessage(reqs, opts)
    }
  }
}

class TLGTextMessage extends TLGMessage {
  constructor(text, option={}) {
    console.log("TEXT?", text, option)
    if (!text) text = ""
    super()
    this.option = {
      parse_mode : null,
      disable_web_page_preview : false,
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (typeof text == 'string' && text.trim().length > 0 ) {
      this.type = 'TEXT'
      this.text = text.substring(0, 4000)
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}

class TLGLocationMessage extends TLGMessage {
  constructor(geo={}, option={}) {
    super()
    this.option = {
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (geo.hasOwnProperty(latitude) && geo.hasOwnProperty(longitude)) {
      this.type = 'LOCATION'
      this.latitude = geo.latitude
      this.longitude = geo.longitude
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}
class TLGVenueMessage extends TLGMessage {
  constructor(venue={}, option={}) {
    super()
    this.option = {
      foursquare_id : null,
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    var req = ['latitude', 'longitude', 'title', 'address']
    var fail = 0
    req.forEach((p)=>{
      if (venue.hasOwnProperty(p)) {
        this[p] = venue[p]
      } else {
        fail = 1
      }
    })

    if (fail == 1) return {}

    this.type = 'TEXT'
    this.text = text
    this.optionAssign(option)
  }
}
