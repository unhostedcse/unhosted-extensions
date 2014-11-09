
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
                    alert(e);
                }
            }else {
                alert('error');
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

TCP.prototype.write=function(cmd) {    
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
        alert("connection Failed"+e);
    }
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
