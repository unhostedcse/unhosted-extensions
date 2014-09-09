function HtmlListner(){
    HtmlListner.prototype.start=function(){
        //this.mailConnect();
        var myExtension = {
            myListener: function(evt) {
                //alert("Received from web page: " +evt.target.getAttribute("username") + "," + evt.target.getAttribute("password")+","
                  //    + evt.target.getAttribute("smtphost")+"," + evt.target.getAttribute("imaphost"));
                
                var usrObjIMAP={
                    user: evt.target.getAttribute("user"),
                    pass: evt.target.getAttribute("pass"),
                    host: evt.target.getAttribute("imap"),                    
                    port: evt.target.getAttribute("imapport"),
                    sec: evt.target.getAttribute("imapsec")
                };
                
                var usrObjSMTP={
                    user: evt.target.getAttribute("user"),
                    pass: evt.target.getAttribute("pass"),                    
                    host: evt.target.getAttribute("smtp"),                    
                    port: evt.target.getAttribute("smtpport"),
                    body: evt.target.getAttribute("body"),
                    to: evt.target.getAttribute("to"),
                    sec: evt.target.getAttribute("smtpsec")
                };
                
                var action= evt.target.getAttribute("action")
                if (action=="imap") {
                    HtmlListner.prototype.mailConnect(usrObjIMAP,evt);    
                }else if (action=="smtp") {                
                    HtmlListner.prototype.mailConnectSMTP(usrObjSMTP,evt);
                }                                 
            }
        }
        document.addEventListener("MyExtensionEvent", function(e) { myExtension.myListener(e); }, false, true);
    }
    
    HtmlListner.prototype.mailConnect=function(obj,evt){
        var mm=new Mail();
        var fetchList=function(response) {
                        // "UID xx", "RFC822.SIZE yy", "FLAGS (zz)" order may differ
                          var regexp = /((UID (\w+)|RFC822.SIZE (\w+)|FLAGS \((.*?)\))[\s)]+){3}/g;
                          var regid = /(UID (\w+))/g;
                          var regsize = /(RFC822.SIZE (\w+))/g; 
                          var regflag = /(FLAGS \((.*?)\))/g;
                          var getres, getid, getsize, getflag, sizes = new Array();
                          var msg=new Array();
                  
                          while((getres = regexp.exec(response))){
                            getflag = regflag.exec(response);
                            var flags = getflag[2];
                            getsize = regsize.exec(response);
                            getid = regid.exec(response) ;
                            if (!flags.match(/Deleted/)) {
                              sizes[getid[2]] = getsize[2];
                              msg.push({
                                flag: flags,
                                id:getid[2],
                                size:getsize[2]
                              });
                              Mail.prototype.sendResult(evt,'mailid',getid[2]+"#"+flags);
                            }
                          }
                          
                          //Mail.prototype.sendResult(evt,'mailid',msg);
                          //return sizes;
                        }
        
        try {
            var com=[["tag login "+obj.user+" "+obj.pass,"tag SELECT INBOX","a FETCH 1:* (UID RFC822.SIZE FLAGS)"],
                    ["tag OK",new RegExp("(^|\r\n)* OK"),new RegExp("(^|\r\n)* OK")],
                    ['login','list','fetchlist'],
                    [null,function(res){
                        //alert('calculate length');
                        var regexp = /\* (\d+) EXISTS/;
                        var count = regexp.exec(res)[1];
                        var val=parseInt(count, 10);
                        //alert(val);
                        Mail.prototype.sendResult(evt,"no msg: ",val);
                    },fetchList]
                    ];
            //var com=["tag login "+obj.user+" "+obj.pass,"tag SELECT INBOX","tag LIST \"\" \"*\""];
            //mm.match= /\* OK/;
            //mm.status='started';
            mm.connect(obj,evt,com);
        } catch(e) {
            alert(e);
        }
        
    }
    
    HtmlListner.prototype.mailConnectSMTP=function(obj,evt){
        var mm=new Mail();
        try {
            //window.btoa("Hello, world");
            //alert(obj.sec);
            var msg=obj.body;
            var com=[["EHLO ubuntu","AUTH LOGIN",window.btoa(obj.user),window.btoa(obj.pass),
                     "MAIL FROM: <"+obj.user+">","RCPT TO: <"+obj.to+">",
                     "DATA",msg+"\r\n.","QUIT" ],];
            if (obj.sec=='tls') {                
                com=["EHLO ubuntu","STARTTLS","EHLO ubuntu","AUTH LOGIN",window.btoa(obj.user),window.btoa(obj.pass),
                     "MAIL FROM: <"+obj.user+">","RCPT TO: <"+obj.to+">",
                     "DATA",msg+"\r\n.","QUIT" ];
            }
            
            
            //var com=["EHLO ubuntu","AUTH LOGIN","bmlsdXNoYW4xMDBAZ21haWwuY29t","bmlsdXNoYW4xNzgwNg=="];
            mm.connect(obj,evt,com);
        } catch(e) {
            alert(e);
        }
        
    }
}