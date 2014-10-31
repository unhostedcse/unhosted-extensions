
function TCP(){}     
          
TCP.prototype.connect = function(obj,evt,command){    
  
    var usrObject=obj;
    //var command = comm;        
    var transport;
    TCP.command=command;
    
    var listener = {
        response: "",            
        
        onStartRequest: function(request, context) {},
        onStopRequest: function(request, context, status) {            
        },
        
        onDataAvailable: function(request, context, inputStream, offset, count) {
            this.response+=bStream.readBytes(count);
            var res=this.response;
            if (!TCP.command || !this.response.match(TCP.command.responseEnd)) {
                // No command to handle response or response hasn't been read fully, wait
                return;
            }
            
            var response = this.response;
            this.response = "";
            if (response.match(TCP.command.responseStart)) {
                //if (TCP.command.onResponse) {
                    //alert("onResponse "+ TCP.command.onResponse);
                  //  try{
                    //    TCP.command.onResponse(response);
                    //}catch(e){
                      //  alert(e);
                    //}
                //}
                try{
                    TCP.prototype.sendResult(evt,"value",res);
                }catch(e){
                    alert(e);
                }
            }
           
        }
    };              

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
    
    TCP.transport = transportService.createTransport(ssl,sv, host, port, this.getProxyInfo());
   
    var outStream = TCP.transport.openOutputStream(0, 1024*1024, 1);
    var inStream = TCP.transport.openInputStream(0, 1024*1024, 1);      
    var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
            
    TCP.outStream=outStream;
    TCP.request="Ruksan req";
    
    bStream.setInputStream(inStream);
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(inStream, -1, -1, 0, 0, true);
    pump.asyncRead(listener, null);
   
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
    TCP.command=cmd;
    request=cmd.request;
    //alert("request: "+TCP.command.request);
    this.workerThread = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
    try {
        var count = TCP.outStream.write(request, request.length);
        if (count < request.length) {
          request = request.substr(count);
          TCP.outStream.QueryInterface(Components.interfaces.nsIAsyncOutputStream);
          TCP.outStream.asyncWait({ onOutputStreamReady: function() {
                                TCP.write();
                              }}, 0, 0, this.workerThread); 
        }
        else TCP.outStream.write("\r\n", 2);
    }catch(e) {
        alert("connection Failed"+e);
    }
}
  
TCP.prototype.sendResult=function(evt,type,value){
        //evt.target.setAttribute("attribute3", "The extension");               
        var doc = evt.target.ownerDocument;               
        var AnswerEvt = doc.createElement("MyExtensionAnswer");
        
        AnswerEvt.setAttribute("type", type);
        AnswerEvt.setAttribute("value", value);
        
        doc.documentElement.appendChild(AnswerEvt);                
        var event = doc.createEvent("HTMLEvents");
        event.initEvent("MyAnswerEvent", true, false);
        AnswerEvt.dispatchEvent(event);
}
