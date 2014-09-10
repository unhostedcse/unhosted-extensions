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
                }else if (action=="getbody") {
                    var id=evt.target.getAttribute("msgid");
                    HtmlListner.prototype.getBody(id,evt);
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
                          var i=0,j=0;
                          
                          while((getres = regexp.exec(response))){
                            getflag = regflag.exec(response);
                            var flags = getflag[2];
                            getsize = regsize.exec(response);
                            getid = regid.exec(response) ;
                            if (!flags.match(/Deleted/)) {
                              sizes[getid[2]] = getsize[2];
                                //i++;    
                              //Mail.prototype.sendResult(evt,'mailid',getid[2]+"#"+flags);
                                //j++;
                              commands=com;
                              //commands[0].push("4 uid fetch "+getid[2]+" body[header]");
                              //HEADER.FIELDS (<list>)
                              commands[0].push("4 uid fetch "+getid[2]+" body[HEADER.FIELDS (from subject)]");
                              commands[1].push(new RegExp("(^|\r\n)4 OK"));
                              commands[2].push('mailhead#'+getid[2]+"#"+flags);
                              commands[3].push(function(response,sta) {
                                            var s=response.replace(/^.*\r\n|\)?\r\n.*\r\n.*\r\n$/g, "");
                                            var from="";
                                            Mail.prototype.sendResult(evt,'mailids',sta+"#"+s);
                                            //alert(s);
                                        });
                              commands[4].push(new RegExp("(^|\r\n)"+ "4"+" "));
                            }                            
                          }
                          //alert(i+" "+j);
                        }
        
        try {
            //,"a uid fetch 812 body[header]"
            var end=new RegExp("(^|\r\n)*"+ " ");
            var com=[["1 login "+obj.user+" "+obj.pass,"2 SELECT INBOX","3 FETCH 1:* (UID RFC822.SIZE FLAGS)"],
                    [new RegExp("(^|\r\n)1 OK"),new RegExp("(^|\r\n)2 OK"),new RegExp("(^|\r\n)3 OK")],
                    ['login','list','fetchlist'],
                    [null,function(res){
                        //alert('calculate length');
                        var regexp = /\* (\d+) EXISTS/;
                        var count = regexp.exec(res)[1];
                        var val=parseInt(count, 10);
                        //alert(val);
                        Mail.prototype.sendResult(evt,"no msg: ",val);
                    },fetchList]
                    ,[new RegExp("(^|\r\n)"+ "1"+" "),new RegExp("(^|\r\n)"+ "2"+" "),new RegExp("(^|\r\n)"+ "3"+" ")]
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
                     "MAIL FROM: <"+obj.user+">",
                     "RCPT TO: <"+obj.to+">",
                     "DATA",
                     msg+"\r\n.",
                     "QUIT" ],
                     [],
                     ['connected',,,,,,,'Sent','finished'],
                     [],
                     []
                     ];
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
    HtmlListner.prototype.getBody=function(id,evt){
        //alert("get body "+id);
        Mail.request="tag UID FETCH " + id + " BODY[]";
        Mail.fun=function(res){
            var r=res.replace(/^.*\r\n|\)?\r\n.*\r\n.*\r\n$/g, "");
            Mail.prototype.sendResult(evt,'gotbody',r);
            //alert(r);
        }
        Mail.prototype.write();
    }
}













