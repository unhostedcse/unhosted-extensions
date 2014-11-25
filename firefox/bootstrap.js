const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');

var imap=new Array();

function install() {}
 
function uninstall() {}

function startup(data, reason) {
  Services.prompt.alert(null, "Restartless Demo", "Unhosted Starting!"); 
  try{
    watchWindows(main, "navigator:browser");  
  }catch(e){
    Services.prompt.alert(null, "Unhosted Error",e); 
  }  
}

function myListener(evt){
  //Services.prompt.alert(null, "Restartless Demo",evt); 
  
  try{
    //Services.prompt.alert(null, "Restartless Demo", "unhosted got");
    var action=evt.target.getAttribute("action");
    
    if(action=="test_connect"){
      TCP.prototype.sendResult(evt,"value",'test_connect_pass');
      return;
    }
    
    var a=evt.target.getAttribute("command");
    var b=JSON.parse(a);
    var server=evt.target.getAttribute("server");
    var conID=evt.target.getAttribute("conID");

    if (!imap[conID]) {
      imap[conID]=new TCP('IMAP',conID);
    }

    if (action=="connect") {
      var obj=JSON.parse(evt.target.getAttribute("settings"));
      imap[conID].connect(obj,evt,b);
    }else{
      imap[conID].write(b,action);
    }        

  }catch(e){
    Services.prompt.alert(null, "Unhosted Error",e);
  }
}

function main(win) {
  //Services.prompt.alert(null, "Restartless Demo",win); //
  win.document.addEventListener("MyExtensionEvent", function(e) { myListener(e); }, false, true);  
}
 
function shutdown(data, reason) {
   //Services.prompt.alert(null, "Restartless Demo", "Goodbye world.");
}

function watchWindows(callback, winType) {
  // Wrap the callback in a function that ignores failures
  function watcher(window) {
    try {
      callback(window);
    }
    catch(ex) {}
  }

  // Add functionality to existing windows
  runOnWindows(callback, winType);

  // Watch for new browser windows opening then wait for it to load
  function windowWatcher(subject, topic) {
    if (topic == "domwindowopened")
      runOnLoad(subject, watcher, winType);
  }
  Services.ww.registerNotification(windowWatcher);

  // Make sure to stop watching for windows if we're unloading
  //unload(function() Services.ww.unregisterNotification(windowWatcher));
}

function runOnLoad(window, callback, winType) {
  // Listen for one load event before checking the window type
  window.addEventListener("load", function() {
    window.removeEventListener("load", arguments.callee, false);

    // Now that the window has loaded, only handle browser windows
    if (window.document.documentElement.getAttribute("windowtype") == winType)
      callback(window);
  }, false);
}


function runOnWindows(callback, winType) {
  // Wrap the callback in a function that ignores failures
  function watcher(window) {
    try {
      callback(window);
    }
    catch(ex) {}
  }

  // Add functionality to existing windows
  let browserWindows = Services.wm.getEnumerator(winType);
  while (browserWindows.hasMoreElements()) {
    // Only run the watcher immediately if the browser is completely loaded
    let browserWindow = browserWindows.getNext();
    if (browserWindow.document.readyState == "complete")
      watcher(browserWindow);
    // Wait for the window to load before continuing
    else
      runOnLoad(browserWindow, watcher, winType);
  }
}

////////////////////////////////////////////////////////////

function TCP(server,id){
    this.server=server;
    this.response="";
    this.conID=id;
}     
         
TCP.prototype.onStartRequest= function(request, context) {}
TCP.prototype.onStopRequest= function(request, context, status) {}

TCP.prototype.onDataAvailable= function(request, context, inputStream, offset, count) {
            //alert('data');
            this.response+=this.bStream.readBytes(count);
            //Services.prompt.alert(null,"extension response",this.response);
            
            if (this.command){
                var responseEnd=new RegExp(this.command.responseEnd);
                var responseStart=new RegExp(this.command.responseStart);
            }
            
            if (!this.command || !this.response.match(responseEnd)) {
                return;
            }
            
            var response = this.response;
            this.response = "";
            if (response.match(responseStart)) {
                try{
                    this.sendResult(this.evt,"value",response);
                }catch(e){
                    //alert(e);
                    Services.prompt.alert(null,"connection Failed",e);
                }
            }else {
                //alert('error');
                Services.prompt.alert(null,"connection Failed",'error');
            }
}

TCP.prototype.connect = function(obj,evt,command){    
  
    var usrObject=obj;
    var transport;
    this.command=command;
    this.evt=evt;

    var host=usrObject.host;
    var port=usrObject.port;
    
    var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);        
    var ssl=null;
    var sv=1;
          
    if (usrObject.sec=="ssl") {
        ssl=["ssl"];            
    }else if(usrObject.sec=="tls") {
        ssl=["starttls"];
    }else{
        sv=0;
    }
    
    this.transport = transportService.createTransport(ssl,sv, host, port, this.getProxyInfo());
   
    this.outStream = this.transport.openOutputStream(0, 1024*1024, 1);
    this.inStream = this.transport.openInputStream(0, 1024*1024, 1);      
    this.bStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
            
    this.bStream.setInputStream(this.inStream);
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(this.inStream, -1, -1, 0, 0, true);
    pump.asyncRead(this, null);
}

TCP.prototype.getProxyInfo=function() {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);

  if (prefs.getIntPref && prefs.getIntPref("network.proxy.type") == 1) { // Manual proxy configuration
    var proxyHost = prefs.getCharPref("network.proxy.socks");
    var proxyPort = prefs.getIntPref("network.proxy.socks_port");
    if (proxyHost && proxyPort) {
      var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
                         .getService(Components.interfaces.nsIProtocolProxyService);
      return proxyService.newProxyInfo("socks", proxyHost, proxyPort, 0, 30, null);
    }
  }
  
}

TCP.prototype.write=function(cmd,action) {
  
    if (action && action=='authTls') {
      try {
        var sc=this.transport.securityInfo;
        sc.QueryInterface(Components.interfaces.nsISSLSocketControl);
        sc.StartTLS();
      } catch(e) {
        Services.prompt.alert(null,"connection Failed",e); 
      }      
      
    }
    
    this.command=cmd;
    request=cmd.request;
    //alert("request: "+TCP.command.request);
    this.workerThread = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
    try {
        var count = this.outStream.write(request, request.length);
        if (count < request.length) {
          request = request.substr(count);
          this.outStream.QueryInterface(Components.interfaces.nsIAsyncOutputStream);
          this.outStream.asyncWait({ onOutputStreamReady: function() {
                                this.write();
                              }}, 0, 0, this.workerThread); 
        }
        else this.outStream.write("\r\n", 2);
    }catch(e) {
        Services.prompt.alert(null,"connection Failed",e); 
    }
    
    /*try{
      if (request=="STARTTLS") {
        var si = this.transport.securityInfo;
        si.QueryInterface(Components.interfaces.nsISSLSocketControl);
        si.StartTLS();
      }
    }catch(e){
      Services.prompt.alert(null, "Unhosted Error",e); 
    }*/
    
}
  
TCP.prototype.sendResult=function(evt,type,value){
        //evt.target.setAttribute("attribute3", "The extension");               
        var doc = evt.target.ownerDocument;               
        var AnswerEvt = doc.createElement("MyExtensionAnswer");
        
        AnswerEvt.setAttribute("type", type);
        AnswerEvt.setAttribute("server",this.server);
        AnswerEvt.setAttribute("conID",this.conID);
        AnswerEvt.setAttribute("value", value);
        
        doc.documentElement.appendChild(AnswerEvt);                
        var event = doc.createEvent("HTMLEvents");
        event.initEvent("MyAnswerEvent", true, false);
        AnswerEvt.dispatchEvent(event);
}