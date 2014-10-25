if(!technalxs) var technalxs = {};
if(!technalxs.simplemail) technalxs.simplemail = {};

technalxs.simplemail.SimpleMailSocks = function(){
  var pub = {};
  
  pub.SimpleMailTransport,
  pub.request,
  
  pub.SimpleMailSocket = function(host, port, ssl, onClose, tls) {

    var self = this;
    var errors = false;
  
    this.error = function(message, params) {
      var errors = true;
      var hostInfo = "[" + host + ":" + port + (ssl ? ",SSL" : (tls ? ",StartTLS" : "")) + "]";
      technalxs.simplemail.SimpleMailUtils.error(message, params ? [hostInfo].concat(params) : [hostInfo]);
    }
  
    var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
                           .getService(Components.interfaces.nsISocketTransportService);
    technalxs.simplemail.SimpleMailSocks.SimpleMailTransport = transportService.createTransport(ssl ? ["ssl"] : (tls ? ["starttls"] : null), ssl ? 1 : (tls ? 1 : 0), host, port, getProxyInfo());
  
    var outStream = technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.openOutputStream(0, 1024*1024, 1);
    var inStream = technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.openInputStream(0, 1024*1024, 1);
  
    var bStream = Components.classes["@mozilla.org/binaryinputstream;1"]
                  .createInstance(Components.interfaces.nsIBinaryInputStream);
    bStream.setInputStream(inStream);
  
    function getProxyInfo() {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Components.interfaces.nsIPrefService);
  
      if (prefs.getIntPref("network.proxy.type") == 1) { // Manual proxy configuration
        var proxyHost = prefs.getCharPref("network.proxy.socks");
        var proxyPort = prefs.getIntPref("network.proxy.socks_port");
        if (proxyHost && proxyPort) {
          var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
                             .getService(Components.interfaces.nsIProtocolProxyService);
          return proxyService.newProxyInfo("socks", proxyHost, proxyPort, 0, 30, null);
        }
      }
    }

    var listener = {
      response: "",
      onStartRequest: function(request, context) {},
      onStopRequest: function(request, context, status) {
        bStream.close();
        inStream.close();
        outStream.close();
        if (status) self.error("connectionFailed");
        if (onClose) onClose(status | errors);
      },
      onDataAvailable: function(request, context, inputStream, offset, count) {
        this.response += bStream.readBytes(count);
  
        if (!this.command || !this.response.match(this.command.responseEnd)) {
          // No command to handle response or response hasn't been read fully, wait
          return;
        }
        var response = this.response;
        this.response = "";
  
        if (response.match(this.command.responseStart)) {
          if (this.command.onResponse) {
            this.command.onResponse(response);
          }
        }
        else {
          self.error("invalidResponse", [response.replace(/\r\n$/, "")]);
          self.close();
        }
      }
    }; 
  
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
               .createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(inStream, -1, -1, 0, 0, true);
    pump.asyncRead(listener, null);
  
    // "responseStart" - regexp for matching correct response status
    // "responseEnd" - regexp for matching response end (to identify whether response is read fully)
    this.Command = function(request, onResponse, responseStart, responseEnd) {
      this.request = request;
      this.onResponse = onResponse;
      this.responseStart = responseStart;
      this.responseEnd = responseEnd;
    }
  
    this.execute = function(command) {
      listener.command = command;
      if (command.request) {
        technalxs.simplemail.SimpleMailSocks.request = command.request;
         function write () {
          this.workerThread = Components.classes["@mozilla.org/thread-manager;1"]
                                        .getService(Components.interfaces.nsIThreadManager)
                                        .currentThread;
          try {
            var count = outStream.write(technalxs.simplemail.SimpleMailSocks.request, technalxs.simplemail.SimpleMailSocks.request.length);
            if (count < technalxs.simplemail.SimpleMailSocks.request.length) {
              technalxs.simplemail.SimpleMailSocks.request = technalxs.simplemail.SimpleMailSocks.request.substr(count);
              outStream.QueryInterface(Components.interfaces.nsIAsyncOutputStream);
              outStream.asyncWait({ onOutputStreamReady: function() {
                                    write();
                                  }}, 0, 0, this.workerThread); 
            }
            else outStream.write("\r\n", 2);
            }
          catch(e) { self.error("connectionFailed"); }
        } 

        write();      
      }
    }


  
    this.close = function(error) {
      technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.close(error);
    }
  }
  return pub;
}();

technalxs.simplemail.SimpleMailVar = function(){
  var pub = {};
  pub.changeFlags = new Array(),
  pub.uid = new Array();
  return pub;
}();

  // TODO: SimpleMailPOP3, SimpleMailSMTP and technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP should not be inherited from SimpleMailSocket

technalxs.simplemail.SimpleMailSocks.SimpleMailPOP3 = function(host, port, ssl, onClose) {
  var self = this;
  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailSocket;
  this.inheritFrom(host, port, ssl, onClose);

  this.POP3Command = function(request, onResponse, responseStart, responseEnd) {
    this.inheritFrom = self.Command;
    this.inheritFrom(request, onResponse, responseStart || /^\+OK/,
                                          responseEnd || /\r\n$/);
  }

  this.timestamp;

  this.start = function() {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom(null, function(response) {
      self.timestamp = response.match(/<.*>/);
    });
  }

  this.apop = function(login, password) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("APOP " + login + " " + technalxs.simplemail.SimpleMailUtils.md5(self.timestamp + password));
  }

  this.user = function(login) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("USER " + login);
  }

  this.pass = function(password) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("PASS " + password);
  }

  this.stat = function() {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("STAT", function(response) {
      var regexp = /^\+OK\s+(\d+)\s+(\d+)/;
      var count = regexp.exec(response)[1];
      return parseInt(count, 10);
    });
  }

  function GetInfo(request) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom(request, function(response) {
      var regexp = /\r\n(\S+)\s+(\S+)/g;
      var value, values = new Array();
      while((value = regexp.exec(response))) {
        values[value[1]] = value[2];
      }
      return values;
    },
    null,
    /\r\n\.\r\n$/);
  }

  this.uidl = function() {
    this.inheritFrom = GetInfo;
    this.inheritFrom("UIDL");
  }

  this.list = function() {
    this.inheritFrom = GetInfo;
    this.inheritFrom("LIST");
  }

  function Retrieve(request) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom(request, function(response) {
      return response.replace(/^.*\r\n|\r\n\.\r\n$/g, "");
    },
    null,
    /\r\n\.\r\n$/);
  }

  this.top = function(id, lines) {
    this.inheritFrom = Retrieve;
    this.inheritFrom("TOP " + id + " " + lines);
  }

  this.retr = function(id) {
    this.inheritFrom = Retrieve;
    this.inheritFrom("RETR " + id);
  }

  this.dele = function(id) {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("DELE " + id);
  }

  this.quit = function() {
    this.inheritFrom = self.POP3Command;
    this.inheritFrom("QUIT");
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMailSMTP = function(host, port, ssl, onClose, tls) {
  var self = this;
  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailSocket;
  this.inheritFrom(host, port, ssl, onClose, tls);
  this.SMTPCommand = function(request, onResponse, responseStart, responseEnd) {
    this.inheritFrom = self.Command;
    this.inheritFrom(request, onResponse, responseStart || /^2/,
                                          responseEnd || /\r\n$/);
  }

  this.SMTPAuthCommand = function(request, onResponse, responseStart, responseEnd) {
    var command = this;
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom(request, function(response) {
      return response.match(/^504|^554/) ? self.SMTPAuthCommand.NOT_SUPPORTED :
             response.match(command.responseStart) ? self.SMTPAuthCommand.OK :
                                                     self.SMTPAuthCommand.ERROR;
    }, /^/);
  }
  this.SMTPAuthCommand.OK = 1;
  this.SMTPAuthCommand.NOT_SUPPORTED = 2;
  this.SMTPAuthCommand.ERROR = 3;

  this.start = function() {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom();
  }

  function getHostName() {
    var dns = Components.classes["@mozilla.org/network/dns-service;1"]
              .getService(Components.interfaces.nsIDNSService);
    return dns.myHostName;
  }

  this.ehlo = function() {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("EHLO " + getHostName(), null, null, /2\d* .*\r\n$/);
  }

  this.authTls = function() {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("STARTTLS");
  }

  this.authPlain = function(login, password) {
    this.inheritFrom = self.SMTPAuthCommand;
    this.inheritFrom("AUTH PLAIN " + btoa("\0" + login + "\0" + password));
  }

  this.authLogin = function() {
    this.inheritFrom = self.SMTPAuthCommand;
    this.inheritFrom("AUTH LOGIN", null, /^334/);
  }

  this.authLoginLogin = function(login) {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom(btoa(login), null, /^334/);
  }

  this.authLoginPassword = function(password) {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom(btoa(password));
  }

  this.mail = function(email) {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("MAIL FROM:" + email);
  }

  this.rcpt = function(email) {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("RCPT TO:" + email);
  }

  this.data = function() {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("DATA", null, /^354/);
  }

  this.dataSend = function(text) {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom(text + "\r\n.");
  }

  this.quit = function() {
    this.inheritFrom = self.SMTPCommand;
    this.inheritFrom("QUIT");
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP = function(host, port, ssl, onClose) {
  var self = this;
  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailSocket;
  this.inheritFrom(host, port, ssl, onClose);

  var tag = 1;

  this.IMAPCommand = function(request, onResponse, responseStart, responseEnd) {
    this.inheritFrom = self.Command;
    this.inheritFrom(tag + " " + request, onResponse,
                     new RegExp("(^|\r\n)" + tag + " OK"),
                     new RegExp("(^|\r\n)" + tag + " "));
    tag++;
  }

  this.start = function() {
    this.inheritFrom = self.Command;
    this.inheritFrom(null, null, /\* OK/, /\r\n/);
  }

  this.login = function(login, password) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("LOGIN " + login + " " + password);
  }

  this.select = function(folder) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("SELECT " + folder, function(response) {
      var regexp = /\* (\d+) EXISTS/;
      var count = regexp.exec(response)[1];
      return parseInt(count, 10);
    });
  }

  this.fetchList = function() {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("FETCH 1:* (UID RFC822.SIZE FLAGS)",
      function(response) {
      // "UID xx", "RFC822.SIZE yy", "FLAGS (zz)" order may differ
        var regexp = /((UID (\w+)|RFC822.SIZE (\w+)|FLAGS \((.*?)\))[\s)]+){3}/g;
        var regid = /(UID (\w+))/g;
        var regsize = /(RFC822.SIZE (\w+))/g; 
        var regflag = /(FLAGS \((.*?)\))/g;
        var getres, getid, getsize, getflag, sizes = new Array();

        while((getres = regexp.exec(response))){
          getflag = regflag.exec(response);
          var flags = getflag[2];
          getsize = regsize.exec(response);
          getid = regid.exec(response) ;
          if (!flags.match(/Deleted/)) {
            sizes[getid[2]] = getsize[2];
          }
        }
        return sizes;
      });
  }

  this.fetchListFlags = function() {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("FETCH 1:* (UID RFC822.SIZE FLAGS)",
      function(response) {
      // "UID xx", "RFC822.SIZE yy", "FLAGS (zz)" order may differ
        var regexp = /((UID (\w+)|RFC822.SIZE (\w+)|FLAGS \((.*?)\))[\s)]+){3}/g;
        var regid = /(UID (\w+))/g;
        var regsize = /(RFC822.SIZE (\w+))/g; 
        var regflag = /(FLAGS \((.*?)\))/g;
        var getres, getid, getsize, getflag, Flags = new Array();
        while((getres = regexp.exec(response))){
          getflag = regflag.exec(response);
          var flags = getflag[2];
          getsize = regsize.exec(response);
          getid = regid.exec(response) ;
          if (!flags.match(/Deleted/)) {
            Flags[getid[2]] = getflag[2];
          }
        }
        return Flags;
      });
  }

  this.fetchBody = function(uid, headersOnly) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("UID FETCH " + uid + (headersOnly ? " BODY[HEADER]" : " BODY[]"),
      function(response) {
        return response.replace(/^.*\r\n|\)?\r\n.*\r\n.*\r\n$/g, "");
      });
  }

  this.storeFlags = function(uids, flags) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("UID STORE " + uids.join(",") + " +FLAGS ("+ flags + ")",
                     function(response) {
                       var regexp = /UID ([^\s)]+)/g;
                       var match, uids = new Array();
                       while((match = regexp.exec(response))) {
                         uids.push(match[1]);
                       }
                       return uids;
                     });
  }

    this.unstoreFlags = function(uids, flags) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("UID STORE " + uids.join(",") + " -FLAGS ("+ flags + ")",
                     function(response) {
                       var regexp = /UID ([^\s)]+)/g;
                       var match, uids = new Array();
                       while((match = regexp.exec(response))) {
                         uids.push(match[1]);
                       }
                       return uids;
                     });
  }

  this.appendSent = function(message) {
    var msg = message.toString()
    var msgSize = msg.length;
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("APPEND " + "Sent " + " (\\Seen) " + "{" + msgSize + "}" + "\r\n"+ msg + "\r\n");
  }

  this.expunge = function(uids, flags) {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("EXPUNGE");
  }

  this.logout = function() {
    this.inheritFrom = self.IMAPCommand;
    this.inheritFrom("LOGOUT");
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMailScenario = function(socket) {
  var today = new Date().getTime();
  var date = technalxs.simplemail.SimpleMailDate.toString(today);
  var date = date.replace(/\//g,"-");

  if (technalxs.simplemail.SimpleMailPrefs.getBool("enableLog")) {
    var logFile = technalxs.simplemail.SimpleMailFile.createLogFile();
  }
  var self = this;
  this.scenario = new Array();
  this.executeNextCommand = function() {
    var action = this.scenario.shift();
    if (action) {
      var command = action[0];
      var processResult = action[1];
      var onResponse = command.onResponse;
      // Write log file
      if (technalxs.simplemail.SimpleMailPrefs.getBool("enableLog")) {
        var out = technalxs.simplemail.SimpleMailFile.createOutputStream2(logFile);
        var dataLog = command.request;
        if (typeof(dataLog) == 'undefined' || dataLog == null){
          dataLog = "Start connection";
        }
        if (dataLog !== 'Start connection' && dataLog.match(/^(1 LOGIN)/i)) {
          dataLog = "1 LOGIN : Logging suppressed for this command (contain authentication information)";
        }
        if (dataLog !== 'Start connection' && dataLog.match(/^(PASS)/i)) {
          dataLog = "PASS : Logging suppressed for this command (contain authentication information)";
        }
        if (dataLog !== 'Start connection' && dataLog.match(/^(AUTH PLAIN)/i)) {
          dataLog = "AUTH PLAIN : Logging suppressed for this command (contain authentication information)";
        }

        out.write(date + " Client: " + dataLog);
        out.write("\r\n");
        out.close();
      }
      
      command.onResponse = function(response) {
        var result = onResponse ? onResponse(response) : null;
        if (processResult) processResult(result, response);
        // Write log file
          if (technalxs.simplemail.SimpleMailPrefs.getBool("enableLog")) {
            var out = technalxs.simplemail.SimpleMailFile.createOutputStream2(logFile);
            out.write(date + " Server: " + response);
            out.write("\r\n");
            if (command.request == "4 LOGOUT" | command.request == "QUIT") {
              out.write("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              out.write("\r\n");
            }
            out.close();
          }
        self.executeNextCommand();
      };
      socket.execute(command);
    }
  }

  this.execute = function() {
    this.executeNextCommand();
    return self;
  }

  this.stop = function() {
    socket.close(-1);
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMailGetMail = function(account, listener, headersOnly) {
  this.inheritFrom = account.pop3.isImap ? technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_GetMail : technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_GetMail;
  this.inheritFrom(account, listener, headersOnly);
}

technalxs.simplemail.SimpleMailSocks.SimpleMailDeleteMail = function(account, listener, messages) {
  this.inheritFrom = account.pop3.isImap ? technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_DeleteMail : technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_DeleteMail;
  this.inheritFrom(account, listener, messages);
}

technalxs.simplemail.SimpleMailSocks.SimpleMailGetMailBody = function(account, listener, messages) {
  this.inheritFrom = account.pop3.isImap ? technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_GetMailBody : technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_GetMailBody;
  this.inheritFrom(account, listener, messages);
}

technalxs.simplemail.SimpleMailSocks.SimpleMailSynchroMail = function(account, listener, messages, folder, flag) {
  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_SynchroMail;
  this.inheritFrom(account, listener, messages, folder, flag);
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_GetMail = function(account, listener, headersOnly) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var pop3 = new technalxs.simplemail.SimpleMailSocks.SimpleMailPOP3(account.pop3.host,
                        account.pop3.port, 
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(pop3);

  this.uids;
  this.sizes;
  this.ids = new Array();

  this.scenario = [ [ new pop3.start(), authenticate ],
                    [ new pop3.stat(),  processStat ],
                    [ new pop3.quit(),  null ] ];

  function authenticate() {
    if (account.pop3.auth) {
      self.scenario.unshift([ new pop3.apop(account.pop3.login, password), null ]);
    } else {
      self.scenario.unshift([ new pop3.user(account.pop3.login), null ],
                            [ new pop3.pass(password),           null ]);
    }
  }

  function processStat(count) {
    if (count) {
      self.scenario.unshift([ new pop3.list(), processList ],
                            [ new pop3.uidl(), processUidl ]);
    }
  }

  function processList(sizes) {
    self.sizes = sizes;
  }

  var deleteOnReceive = !headersOnly && account.deleteMode == technalxs.simplemail.SimpleMailModel.SimpleMailAccount.ON_RECEIVE;

  function processUidl(uids) {
    self.uids = uids;

    for(id in technalxs.simplemail.SimpleMailUtils.reverse(uids)) {
      if (listener.messageExists(account.id, uids[id])) continue;

      self.ids.unshift(id);
      if (deleteOnReceive) self.scenario.unshift([ new pop3.dele(id), null ]);
      self.scenario.unshift([ headersOnly ? new pop3.top(id, 0)
                                          : new pop3.retr(id),
                              function(text, response) {
                                processRetr(text, response, headersOnly);
                              } ]);
    }
  }

  function processRetr(text, response, partial) {
    var id = self.ids.shift();
    var message = technalxs.simplemail.SimpleMailModel.SimpleMailMessage.parse(text);
    message.accountId = account.id;
    message.uid = deleteOnReceive ? "" : self.uids[id];
    message.size = self.sizes[id];
    message.partial = partial;

    var MailInterface = {
      delete: function() {
        self.scenario.unshift([ new pop3.dele(id), null ]);
      },
      getBody: function() {
        self.ids.unshift(id);
        self.scenario.unshift([ new pop3.retr(id), processRetr ]);
      }
    }
    listener.onMessage(message, MailInterface);
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_DeleteMail = function(account, listener, messages) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var pop3 = new technalxs.simplemail.SimpleMailSocks.SimpleMailPOP3(account.pop3.host,
                        account.pop3.port,
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status, self.deleted);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(pop3);

  this.deleted;

  this.scenario = [ [ new pop3.start(), authenticate ],
                    [ new pop3.uidl(),  processUidl ],
                    [ new pop3.quit(),  processQuit ] ];

  function authenticate() {
    if (account.pop3.auth) {
      self.scenario.unshift([ new pop3.apop(account.pop3.login, password), null ]);
    } else {
      self.scenario.unshift([ new pop3.user(account.pop3.login), null ],
                            [ new pop3.pass(password),           null ]);
    }
  }

  function processUidl(uids) {
    var notFound = false;

    function getId(uid) {
      for (var id in uids) {
        if (uids[id] == uid) return id;
      }
    }

    for(var i in messages) {
      var message = messages[i];
      var id = getId(message.uid);
      if (id) {
        self.scenario.unshift([ new pop3.dele(id), null ]);
      }
      else notFound = true;
    }
    if (notFound) pop3.error("messagesNotFound");
  }

  function processQuit() {
    for(var i in messages) {
      var message = messages[i];
      message.uid = null;
    }
    self.deleted = messages;
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_POP3_GetMailBody = function(account, listener, messages) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var pop3 = new technalxs.simplemail.SimpleMailSocks.SimpleMailPOP3(account.pop3.host,
                        account.pop3.port,
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(pop3);

  this.ids = new Array();

  this.scenario = [ [ new pop3.start(), authenticate ],
                    [ new pop3.uidl(),  processUidl ],
                    [ new pop3.quit(),  null ] ];

  function authenticate() {
    if (account.pop3.auth) {
      self.scenario.unshift([ new pop3.apop(account.pop3.login, password), null ]);
    } else {
      self.scenario.unshift([ new pop3.user(account.pop3.login), null ],
                            [ new pop3.pass(password),           null ]);
    }
  }

  var deleteOnReceive = account.deleteMode == technalxs.simplemail.SimpleMailModel.SimpleMailAccount.ON_RECEIVE;

  function processUidl(uids) {
    var notFound = false;

    function getId(uids, uid) {
      for (var id in uids) {
        if (uids[id] == uid) return id;
      }
    }

    for(var i in technalxs.simplemail.SimpleMailUtils.reverse(messages)) {
      var message = messages[i];
      var id = getId(uids, message.uid);
      if (id) {
        self.ids.unshift(message.id);
        if (deleteOnReceive) self.scenario.unshift([ new pop3.dele(id), null ]);
        self.scenario.unshift([ new pop3.retr(id), processRetr ]);
      }
      else notFound = true;
    }
    if (notFound) pop3.error("messagesNotFound");
  }

  function processRetr(text) {
    var message = technalxs.simplemail.SimpleMailModel.SimpleMailMessage.parse(text);
    message.id = self.ids.shift();
    message.partial = false;
    if (deleteOnReceive) message.uid = "";
    listener.onMessage(message);
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMailSendMail = function(account, listener, message) {
  var password = account.smtp.getPassword() ||
                 account.smtp.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.smtp.setPassword);

  var self = this;

  var smtp = new technalxs.simplemail.SimpleMailSocks.SimpleMailSMTP(account.smtp.host,
                        account.smtp.port,
                        account.smtp.ssl,
                        function(status) {
                          listener.onFinish(status);
                        },
                        account.smtp.tls
                        );

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(smtp);

  var data = message.toString();
  if (message.bcc) data = data.replace(/Bcc:.*\r\n/i, ""); // Do not send BCC header

  this.scenario = [ [ new smtp.start(),                         null ],
                    [ new smtp.ehlo(),                          tryAuth ],
                    [ new smtp.mail("<" + account.email + ">"), prepareRcpt ],
                    [ new smtp.data(),                          null ],
                    [ new smtp.dataSend(data),                  null ],
                    [ new smtp.quit(),                          null ] ];

  function tryAuth() {
    if (account.smtp.login) {
      if (account.smtp.tls == 1) {
        self.scenario.unshift([ new smtp.authTls(), tryAuthTls ]);
      }
      else if (account.smtp.auth == 1) {
        self.scenario.unshift([ new smtp.authLogin(), processAuthLogin ]);
      }
      else {
        self.scenario.unshift([ new smtp.authPlain(account.smtp.login,password), processAuthPlain ]);
      }
    }
  }

  function tryAuthTls () {
    var si = technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.securityInfo;
    si.QueryInterface(Components.interfaces.nsISSLSocketControl);
    si.StartTLS();
    self.scenario.unshift([ new smtp.ehlo(), processAuthTls ]);
  }

  function processAuthTls(status, response) {
    if (response) {
      if (account.smtp.auth == 1) {
        self.scenario.unshift([ new smtp.authLogin(), processAuthLogin ]);
      }
      else {
        self.scenario.unshift([ new smtp.authPlain(account.smtp.login,password), processAuthPlain ]);
      } 
    } else {
     smtp.error("invalidResponse", [response]);
     smtp.close();
    }
  }

  function processAuthPlain(status, response) {
    switch(status) {
      case smtp.SMTPAuthCommand.NOT_SUPPORTED: return tryAuthLogin();
      case smtp.SMTPAuthCommand.ERROR: smtp.error("invalidResponse", [response]);
                                       return smtp.close();
    }
  }

  function tryAuthLogin() {
        self.scenario.unshift([ new smtp.authLogin(), processAuthLogin ]);
  }

  function processAuthLogin(status, response) {
    if (status == smtp.SMTPAuthCommand.OK) {
      self.scenario.unshift([ new smtp.authLoginLogin(account.smtp.login), null ],
                            [ new smtp.authLoginPassword(password),        null ]);
    } else {
     smtp.error("invalidResponse", [response]);
     smtp.close();
    }
  }

  function prepareRcpt() {
    var to = technalxs.simplemail.SimpleMailModel.SimpleMailAddress.parseList(message.to + "," + message.cc + "," + message.bcc);
    for(var i in technalxs.simplemail.SimpleMailUtils.reverse(to)) {
      self.scenario.unshift([ new smtp.rcpt("<" + to[i].email + ">"), null ]);
    }
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_GetMail = function(account, listener, headersOnly) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var imap = new technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP(account.pop3.host,
                        account.pop3.port, 
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(imap);

  this.sizes;
  this.uids = new Array();
  //var changeFlags = new Array();

  this.scenario = [ [ new imap.start(),                                      null ],
                    [ new imap.login(account.pop3.login, password),          null ],
                    [ new imap.select("Inbox"),                     processSelect ],
                    [ new imap.expunge(),                                    null ],
                    [ new imap.logout(),                                     null ] ];

  function processSelect(count) {
    if (count) {
      self.scenario.unshift([ new imap.fetchList(), processFetchList ]);
    }
  }

  if (account.deleteMode == technalxs.simplemail.SimpleMailModel.SimpleMailAccount.ON_RECEIVE) {
    account.deleteMode = technalxs.simplemail.SimpleMailModel.SimpleMailAccount.NEVER;
    technalxs.simplemail.SimpleMailOverlay.storage.saveAccount(account);
  }

  function processFetchList(sizes) {
    self.sizes = sizes;
    for(technalxs.simplemail.SimpleMailVar.uid in technalxs.simplemail.SimpleMailUtils.reverse(sizes)) {
      if (listener.messageExists(account.id, technalxs.simplemail.SimpleMailVar.uid)) continue;
      self.uids.unshift(technalxs.simplemail.SimpleMailVar.uid);
      self.scenario.unshift([ new imap.fetchBody(technalxs.simplemail.SimpleMailVar.uid, headersOnly),
                              function(text, response) {
                                processFetchBody(text, response, headersOnly);
                              }]);
      self.scenario.unshift([ new imap.fetchListFlags(), getFlags ]);
    }
  }

  function getFlags (Flags) {
    technalxs.simplemail.SimpleMailVar.uid = self.uids.shift();
    var exist = listener.messageExists(account.id, technalxs.simplemail.SimpleMailVar.uid);

    if (Flags[technalxs.simplemail.SimpleMailVar.uid].match(/\\Seen/) && !exist) {
      technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid] = "1";    // Mark read
    }
    if (Flags[technalxs.simplemail.SimpleMailVar.uid].match(/^\\Answered/)) {
        technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid] = "2";   // Mark replied
    }
    else {
      technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid] = "0";
    }
    return technalxs.simplemail.SimpleMailVar.changeFlags;
  }

  function processFetchBody(text, response, partial, changeFlags) {
    var message = technalxs.simplemail.SimpleMailModel.SimpleMailMessage.parse(text);
    message.accountId = account.id;
    message.uid = technalxs.simplemail.SimpleMailVar.uid;
    message.size = self.sizes[technalxs.simplemail.SimpleMailVar.uid];
    message.partial = headersOnly;
    if (technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid].match(/1/)){
      message.read = true;
      technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
    }
    if (technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid].match(/2/)){
      message.replied = true;
      technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
    }

    if (technalxs.simplemail.SimpleMailVar.changeFlags[technalxs.simplemail.SimpleMailVar.uid].match(/0/)){
      self.scenario.unshift([ new imap.unstoreFlags([technalxs.simplemail.SimpleMailVar.uid], "\\Seen"), null ]);
      message.read = false;
      technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
    }

    var MailInterface = {
      delete: function() {
        self.scenario.unshift([ new imap.storeFlags([technalxs.simplemail.SimpleMailVar.uid], "\\Deleted"), null ]);
      },
      getBody: function() {
        self.uids.unshift(technalxs.simplemail.SimpleMailVar.uid);
        self.scenario.unshift([ new imap.fetchBody(technalxs.simplemail.SimpleMailVar.uid), processFetchBody ]);
      }
    }
    listener.onMessage(message, MailInterface);
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_DeleteMail = function(account, listener, messages) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var imap = new technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP(account.pop3.host,
                        account.pop3.port,
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status, self.deleted);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(imap);

  this.deleted;
  this.uids = new Array();
  for(var i in messages) this.uids.push(messages[i].uid);

  this.scenario = [ [ new imap.start(),                                      null ],
                    [ new imap.login(account.pop3.login, password),          null ],
                    [ new imap.select("Inbox"),                              null ],
                    [ new imap.storeFlags(self.uids, "\\Deleted"), processDeleted ],
                    [ new imap.expunge(),                                    null ],
                    [ new imap.logout(),                            processLogout ] ];

  function processDeleted(uids) {
    function contains(uid) {
      for (var i in self.uids) {
        if ((self.uids[i]) == uid) return true;
      }
    }

    for(var i in messages) {
      if (!contains(messages[i].uid)) {
        return imap.error("messagesNotFound");
      }
    }
  }

  function processLogout() {
    for(var i in messages){
      var message = messages[i];
      message.uid = null;
    }
    self.deleted = messages;
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_GetMailBody = function(account, listener, messages) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var imap = new technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP(account.pop3.host,
                        account.pop3.port,
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(imap);

  this.ids = new Array();

  this.scenario = [ [ new imap.start(),                             null ],
                    [ new imap.login(account.pop3.login, password), null ],
                    [ new imap.select("Inbox"),                     null ],
                    [ new imap.fetchList,               processFetchList ],
                    [ new imap.expunge(),                           null ],
                    [ new imap.logout(),                            null ] ];

  if (account.deleteMode == technalxs.simplemail.SimpleMailModel.SimpleMailAccount.ON_RECEIVE) {
    account.deleteMode = technalxs.simplemail.SimpleMailModel.SimpleMailAccount.NEVER;
    technalxs.simplemail.SimpleMailOverlay.storage.saveAccount(account);
  }

  function processFetchList(sizes) {
    var notFound = false;
    for(var i in technalxs.simplemail.SimpleMailUtils.reverse(messages)) {
      var message = messages[i];
      if (sizes[message.uid]) {
        self.ids.unshift(message.id);
        var flags = "\\Seen";
        self.scenario.unshift([ new imap.fetchBody(message.uid), processFetchBody ],
                              [ new imap.storeFlags([message.uid], flags), null ]);
      }
      else notFound = true;
    }
    if (notFound) imap.error("messagesNotFound");
  }

  function processFetchBody(text) {
    var message = technalxs.simplemail.SimpleMailModel.SimpleMailMessage.parse(text);
    message.id = self.ids.shift();
    message.partial = false;
    listener.onMessage(message);
  }
}

technalxs.simplemail.SimpleMailSocks.SimpleMail_IMAP_SynchroMail = function(account, listener, messages, folder, flag) {
  var password = account.pop3.getPassword() ||
                 account.pop3.login &&
                 technalxs.simplemail.SimpleMailUtils.promptPassword(account.email, account.pop3.setPassword);

  var self = this;
  var imap = new technalxs.simplemail.SimpleMailSocks.SimpleMailIMAP(account.pop3.host,
                        account.pop3.port, 
                        account.pop3.ssl,
                        function(status) {
                          listener.onFinish(status);
                        });

  this.inheritFrom = technalxs.simplemail.SimpleMailSocks.SimpleMailScenario;
  this.inheritFrom(imap);

  this.sizes;
  this.uids = new Array();
  for(var i in messages) this.uids.push(messages[i].uid);
  
  this.scenario = [ [ new imap.start(),                                      null ],
                    [ new imap.login(account.pop3.login, password),          null ],
                    [ new imap.select("Inbox"),                     processSelect ],
                    [ new imap.expunge(),                                    null ],
                    [ new imap.logout(),                                     null ] ];

  function processSelect(count) {
    if (count) {
      self.scenario.unshift([ new imap.fetchList(), processFetchList ]);
    }
  }

  function processFetchList(sizes) {
    self.sizes = sizes;
    for(uid in technalxs.simplemail.SimpleMailUtils.reverse(sizes)) {
      if (listener.messageExists(account.id, uid)) {
        self.uids.unshift(uid);  
        self.scenario.unshift([ new imap.fetchListFlags(), getFlags ]);
      }
    }
  }
  
  function getFlags (Flags) {
    var uid = self.uids.shift();
    var exist = listener.messageExists(account.id, uid);
    for(var i in messages) {
      var message = messages[i];
      if (uid == message.uid) {
        if (flag) {
          // synchro from SimpleMail
          if (flag == "Seen"){
            if (!Flags[uid].match(/^\\Seen/) && exist && message.read) {
              self.scenario.unshift([ new imap.storeFlags([uid], "\\Seen"), null ]);
            }
            if (Flags[uid].match(/\\Answered$/) && exist && message.read) {
              self.scenario.unshift([ new imap.storeFlags([uid], "\\Answered \\Seen"), null ]);
            }  
          }
          if (flag == "UnSeen"){
            if (Flags[uid].match(/^\\Seen/) && exist && !message.read) {
              self.scenario.unshift([ new imap.unstoreFlags([uid], "\\Seen"), null ]);
            }
            if (Flags[uid].match(/\\Answered \\Seen/) && exist && !message.read) {
              self.scenario.unshift([ new imap.unstoreFlags([uid], "\\Seen"), null ]);
            }
          }
          
          if (flag == "Answered"){
            if (!Flags[uid].match(/\\Answered \\Seen/) && exist && message.replied) {
              self.scenario.unshift([ new imap.storeFlags([uid], "\\Answered \\Seen"), null ]);
            }
          }
        } else {
          // synchro from Server
          if (Flags[uid].match(/\\Answered \\Seen/) && exist && (!message.replied || !message.read)) {
            message.replied = true;
            message.read = true;
            technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
          }
          else if (Flags[uid].match(/\\Answered$/) && exist && message.read) {
            message.replied = true;
            message.read = false;
            technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
          }
          else if (Flags[uid].match(/^\\Seen/) && exist && !message.read) {
             message.read = true;
            technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
          }
          else if (!Flags[uid].match(/\w/) && exist && message.read) {
            message.read = false;
            technalxs.simplemail.SimpleMailOverlay.storage.saveMessageState(message);
          }
        }
      }
      var mainWindow = technalxs.simplemail.SimpleMailOverlay.getMainWindow(true);
      if (mainWindow) mainWindow.technalxs.simplemail.messageTreeView.onMessageUpdated(message);
    }
    listener.onMessage(message);
  }
}