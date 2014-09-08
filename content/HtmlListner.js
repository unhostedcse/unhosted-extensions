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
                    sec: evt.target.getAttribute("smtpsec")
                };
                
                var action= evt.target.getAttribute("action")
                if (action=="imap") {
                    HtmlListner.prototype.mailConnect(usrObjIMAP,evt);    
                }else if (action=="smtp") {                
                    HtmlListner.prototype.mailConnectSMTP(usrObjSMTP,evt);
                }
                
                /* the extension answers the page*/                            
                /*evt.target.setAttribute("attribute3", "The extension");               
                var doc = evt.target.ownerDocument;               
                var AnswerEvt = doc.createElement("MyExtensionAnswer");
                
                AnswerEvt.setAttribute("Part1", "answers this.");
                
                doc.documentElement.appendChild(AnswerEvt);                
                var event = doc.createEvent("HTMLEvents");
                event.initEvent("MyAnswerEvent", true, false);
                AnswerEvt.dispatchEvent(event);*/
    
            }
        }
        document.addEventListener("MyExtensionEvent", function(e) { myExtension.myListener(e); }, false, true);
    }
    
    HtmlListner.prototype.mailConnect=function(obj,evt){
        var mm=new Mail();
        try {
            var com=["tag login "+obj.user+" "+obj.pass,"tag SELECT INBOX","tag LIST \"\" \"*\""];
            mm.connect(obj,evt,com);
        } catch(e) {
            alert(e);
        }
        
    }
    
    HtmlListner.prototype.mailConnectSMTP=function(obj,evt){
        var mm=new Mail();
        try {
            //window.btoa("Hello, world");
            //alert(obj.user+" "+obj.pass);
            var msg=obj.body;
            var com=["EHLO ubuntu","AUTH LOGIN",window.btoa(obj.user),window.btoa(obj.pass),
                     "MAIL FROM: <"+obj.user+">","RCPT TO: <nilushan100@gmail.com>",
                     "DATA",msg+"\r\n.","QUIT" ];
            if (obj.sec=='tls') {                
                com=["EHLO ubuntu","STARTTLS","EHLO ubuntu","AUTH LOGIN",window.btoa(obj.user),window.btoa(obj.pass),
                     "MAIL FROM: <"+obj.user+">","RCPT TO: <nilushan100@gmail.com>",
                     "DATA",msg+"\r\n.","QUIT" ];
            }
            
            
            //var com=["EHLO ubuntu","AUTH LOGIN","bmlsdXNoYW4xMDBAZ21haWwuY29t","bmlsdXNoYW4xNzgwNg=="];
            mm.connect(obj,evt,com);
        } catch(e) {
            alert(e);
        }
        
    }
}