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
    var tcp=new TCP();
    }catch(e){
      alert(e);
    }
    
  
    document.addEventListener("MyExtensionEvent", function(e) { myListener(e); }, false, true);
    function myListener(evt) {
      try{
        var action=evt.target.getAttribute("action");
        var a=evt.target.getAttribute("command");
        var b=JSON.parse(a);
        
        if (action=="connect") {
          tcp.connect(obj,evt,b);
        }else{
          tcp.write(b);
        }
        
      }catch(e){
        alert(e);
      }
    }
  },
  
  load : function(){
    alert('started');
  }
  
};
