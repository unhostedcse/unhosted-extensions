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
      var obj={
        host : "localhost",
        port : 143,
        sec : "no"
      };
    //var tcp=new TCP();
    //var imap=new IMAP_TCP('IMAP');
    //var smtp=new IMAP_TCP('SMTP');
    var imap=new Array();
    var smtp=new Array();
    //imap.connect(obj,null,null);
    }catch(e){
      alert(e);
    }
    
  
    document.addEventListener("MyExtensionEvent", function(e) { myListener(e); }, false, true);
    function myListener(evt) {
      try{
        var action=evt.target.getAttribute("action");
        var a=evt.target.getAttribute("command");
        var b=JSON.parse(a);
        var server=evt.target.getAttribute("server");
        var conID=evt.target.getAttribute("conID");
        //alert('conID '+conID);
        
        if (!imap[conID]) {
          imap[conID]=new IMAP_TCP('IMAP',conID);
        }
        
        //if (server=='IMAP') {        
          if (action=="connect") {
            var obj=JSON.parse(evt.target.getAttribute("settings"));
            //tcp.connect(obj,evt,b);
            imap[conID].connect(obj,evt,b);
          }else{
            //tcp.write(b);
            imap[conID].write(b);
          }        
        //}
        
        /*else if (server=='SMTP') {        
          if (action=="connect") {
            var obj=JSON.parse(evt.target.getAttribute("settings"));
            //tcp.connect(obj,evt,b);
            smtp[conID].connect(obj,evt,b);
          }else{
            //tcp.write(b);
            smtp[conID].write(b);
          }        
        }*/
        
      }catch(e){
        alert(e);
      }
    }
  },
  
  load : function(){
    alert('started');
  }
  
};
