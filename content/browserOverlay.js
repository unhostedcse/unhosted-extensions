/**
 * XULSchoolChrome namespace.
 */
if ("undefined" == typeof(XULSchoolChrome)) {
  var XULSchoolChrome = {};
};

/**
 * Controls the browser overlay for the Hello World extension.
 */
XULSchoolChrome.BrowserOverlay = {
  /**
   * Says 'Hello' to the user.
   */
    
  sayHello : function(aEvent) {
    let stringBundle = document.getElementById("xulschoolhello-string-bundle");
    let message = stringBundle.getString("xulschoolhello.greeting.label");
   
   try{               
    //this.connect();
    //this.startServer();   
    
    //var mm=new Mail();
    //mm.connect();
    
    //var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
    //var win = ww.openWindow(null, "chrome://xulschoolhello/content/dialog.xul","aboutMyExtension", "chrome,centerscreen", null);
    
    var ser=new HtmlListner();
    ser.start();
   
    
    //window.openDialog("chrome://xulschoolhello/content/dialog.xul", "MAIL prototype","chrome, dialog, modal, resizable=yes", "").focus();
   }catch(e){
      alert(e);
   }
   //alert('started');
  },
  
  startServer : function(){
      // create an nsIFile for the executable
    //var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    //file.initWithPath("/home/rukshan/Downloads/node-v0.10.31/out/Release/node");
    
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    var file = FileUtils.getFile("ProfD", ["extensions"]);
    
    var node = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    node.initWithPath(file.path+"/node/node");    
    var args=[file.path+"/node/ws_server.js"];
    
    var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    process.init(node);
       
    
    Components.utils.import("resource://gre/modules/Services.jsm");
    var ObserverHandler = {
    // subject refers to the process nsIProcess object
    observe: function(subject, topic, data) {
        switch (topic) {
            // Process has finished running and closed
            case "process-finished":
                break;
            // Process failed to run
            case "process-failed":
                break;
            case "quit-application-granted":
                // Shut down any Node.js processes
                process.kill();
                break;
        };
    }
    };
    //var args = ["/home/rukshan/Desktop/node/ss.js"];
    Services.obs.addObserver(ObserverHandler, "quit-application-granted", false);
    process.runAsync(args, args.length, ObserverHandler);
    
  },
  
  connect : function() {
    
    var listener = {
      response: "",
      onStartRequest: function(request, context) {},
      onStopRequest: function(request, context, status) {
        bStream.close();
        inStream.close();
        outStream.close();
        //if (status) self.error("connectionFailed");
        //if (onClose) onClose(status | errors);
      },
      onDataAvailable: function(request, context, inputStream, offset, count) {
        //this.response += bStream.readBytes(count);
        alert(bStream.readBytes(count));
        
        //if (!this.command || !this.response.match(this.command.responseEnd)) {
          // No command to handle response or response hasn't been read fully, wait
          //return;
        //}
        //var response = this.response;
        //this.response = "";
        
        //if (response.match(this.command.responseStart)) {
        //  if (this.command.onResponse) {
        //    this.command.onResponse(response);
        //  }
        //}
        //else {
        //  self.error("invalidResponse", [response.replace(/\r\n$/, "")]);
        //  self.close();
        //}
      }
    };
    
    var host="imap.gmail.com";
    var port=993;
    
    var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
    technalxs.simplemail.SimpleMailSocks.SimpleMailTransport = transportService.createTransport(["ssl"],1, host, port, this.getProxyInfo());  
    var outStream = technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.openOutputStream(0, 1024*1024, 1);
    var inStream = technalxs.simplemail.SimpleMailSocks.SimpleMailTransport.openInputStream(0, 1024*1024, 1);
  
    var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
    bStream.setInputStream(inStream);
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(inStream, -1, -1, 0, 0, true);
    pump.asyncRead(listener, null);
  },
  
   getProxyInfo : function() {
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
};
