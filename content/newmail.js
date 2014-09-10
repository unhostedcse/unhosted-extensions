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
      alert(response);
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

