function IMAP_TCP(server,id){
    this.tcp=new TCP(server,id);
}

IMAP_TCP.prototype.connect = function(obj,evt,command){
    try {
     this.tcp.connect(obj,evt,command);   
    } catch(e) {
        alert(e);
    }
    

}

IMAP_TCP.prototype.write=function(cmd) {
    this.tcp.write(cmd);
}