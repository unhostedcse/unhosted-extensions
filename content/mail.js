
function Mail(){
    
    
          
    Mail.prototype.connect = function(obj,evt,comm){
        //var display=dis;
        var usrObject=obj;
        var commands = comm;
        var noCommand=0;
        var transport;
        
        var listener = {
            response: "",
            match: /\* OK/,
            status: "started",
            
            //cmd:[/\r\n/,'start'],
            onStartRequest: function(request, context) {},
            onStopRequest: function(request, context, status) {            
            },
            onDataAvailable: function(request, context, inputStream, offset, count) {                
                
                //var cmd=this.cmd;
                var res=bStream.readBytes(count);
                Mail.respond=res;                
                Mail.prototype.sendResult(evt,'res: ',res);                
                //alert(this.match+" "+this.status);
                if (res.match && res.match(this.match) && this.status) {
                    //alert(this.status);
                    Mail.prototype.sendResult(evt,'status',this.status);
                    if (this.fun) {
                        this.fun(res);
                    }
                }                               
                
                //if (noCommand<2) {
                if (commands[0].length>noCommand) {
                    Mail.request=commands[0][noCommand];
                    //Mail.request=commands[noCommand++];
                    if (commands[3]) {                                     
                    this.match=commands[1][noCommand];
                    this.status=commands[2][noCommand];
                    this.fun=commands[3][noCommand];
                    }
                    noCommand++;
                    Mail.prototype.sendResult(evt,"SENT cmd: ",Mail.request);
                    Mail.prototype.write();
                }
            }
        };              
    
        var host=usrObject.host;
        var port=usrObject.port;
        
        var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
        //var ssl=usrObject.sec ? "SSL" : (usrObject.sec ? ["starttls"] : null);
        var ssl=null;
        var sv=1;
              
        if (usrObject.sec=="ssl") {
            ssl=["ssl"];            
        }else if(usrObject.sec=="tls") {
            ssl=["starttls"];
        }else{
            sv=0;
        }
        Mail.transport = transportService.createTransport(ssl,sv, host, port, this.getProxyInfo());
        
                
    
        //ssl ? 1 : (tls ? 1 : 0);
        //transport = transportService.createTransport(ssl,sv, host, port, this.getProxyInfo());  
        //transport = transportService.createTransport(["ssl"],1, host, port, this.getProxyInfo());  
        var outStream = Mail.transport.openOutputStream(0, 1024*1024, 1);
        var inStream = Mail.transport.openInputStream(0, 1024*1024, 1);      
        var bStream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
                
        Mail.outStream=outStream;
        Mail.request="Ruksan req";
        
        bStream.setInputStream(inStream);
        var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
        pump.init(inStream, -1, -1, 0, 0, true);
        pump.asyncRead(listener, null);
       
    }
    
    Mail.prototype.getProxyInfo=function() {
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
    
    Mail.prototype.write=function() {        
          this.workerThread = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager).currentThread;
        try {
            var count = Mail.outStream.write(Mail.request, Mail.request.length);
            if (count < Mail.request.length) {
              Mail.request = Mail.request.substr(count);
              Mail.outStream.QueryInterface(Components.interfaces.nsIAsyncOutputStream);
              Mail.outStream.asyncWait({ onOutputStreamReady: function() {
                                    Mail.write();
                                  }}, 0, 0, this.workerThread); 
            }
            else Mail.outStream.write("\r\n", 2);
        }catch(e) {
            alert("connection Failed"+e);
        }
    }

    Mail.prototype.sendResult=function(evt,type,value){
        evt.target.setAttribute("attribute3", "The extension");               
        var doc = evt.target.ownerDocument;               
        var AnswerEvt = doc.createElement("MyExtensionAnswer");
        
        AnswerEvt.setAttribute("type", type);
        AnswerEvt.setAttribute("value", value);
        
        doc.documentElement.appendChild(AnswerEvt);                
        var event = doc.createEvent("HTMLEvents");
        event.initEvent("MyAnswerEvent", true, false);
        AnswerEvt.dispatchEvent(event);
    }
}


