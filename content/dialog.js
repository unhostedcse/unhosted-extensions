if ("undefined" == typeof(XULSchoolChrome)) {
  var XULSchoolChrome = {};
};

XULSchoolChrome.dialog = {
    onOK: function(){
        //alert('ok');
        return true;
    },
    alertMe: function(event){
        try {
            var dis=document.getElementById("display");
            var mm=new Mail();
            mm.connect(dis);
        } catch(e) {
            alert(e);
        }
    }
    
};


// Called once if and only if the user clicks OK
