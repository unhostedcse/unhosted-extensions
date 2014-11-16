/*
   Copyright 2012 Google Inc

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var socketId;
var _tls;
var _tlsOptions;
var _buffer;
var _requiredBytes = 0;

onload = function() { 

	// console.log(chrome.sockets.tcp);
	// console.log(forge);
  create();
};

create = function() {
  chrome.sockets.tcp.create({},on_create);
}

on_create = function (createInfo){
  socketId=createInfo.socketId;
  console.log('Socket id: ' + socketId);
  chrome.sockets.tcp.setPaused(socketId, true);
  connect();
}

connect = function(){
  chrome.sockets.tcp.connect(socketId,'imap.gmail.com',993,on_connect);
  // chrome.sockets.tcp.connect(socketId,'localhost',143, on_connect);
  // chrome.sockets.tcp.connect(socketId,'Smtp-mail.outlook.com',587, on_connect);
  // chrome.sockets.tcp.onReceive.addListener(on_listen);
}

on_listen =function(receiveInfo){
  var msg=String.fromCharCode.apply(null, new Uint8Array(receiveInfo.data));
  console.log(msg);
  // console.log('sending-- '+"tag LOGIN rukshan 17806");
  // send("tag LOGIN rukshan 17806");

  // arrayBuffer2String(receiveInfo.data, function (data) {
  //     _buffer += data;
  //     console.log(_buffer);
  //     if (_buffer.length >= _requiredBytes) {
  //       _requiredBytes = _tls.process(_buffer);
  //       _buffer = '';
  //     }
  //   });

}

on_listen_error =function(info){
}

on_connect = function (a2){
  console.log('connected '+a2);   
  var tls = forge.tls.createConnection({});
  initializeTls({});

try{
  _tls.handshake(_tlsOptions.sessionId || null);
}catch(e){
 console.log(e);  
}

  chrome.sockets.tcp.onReceive.addListener(on_listen);
  chrome.sockets.tcp.onReceiveError.addListener(on_listen_error);
  chrome.sockets.tcp.setPaused(socketId, false);

}

initializeTls = function(options) {
    var _this = this;
    _tlsOptions = options;
    _tls = forge.tls.createConnection({
        server: false,
        sessionId: options.sessionId || null,
        caStore: options.caStore || [],
        sessionCache: options.sessionCache || null,
        cipherSuites: options.cipherSuites || [
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
          forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA],
        virtualHost: options.virtualHost,
        verify: options.verify || function() { return true },
        getCertificate: options.getCertificate,
        getPrivateKey: options.getPrivateKey,
        getSignature: options.getSignature,
        deflate: options.deflate,
        inflate: options.inflate,
        connected: function(c) {
          // first handshake complete, call handler
//          if(c.handshakes === 1) {
            console.log('TLS socket connected');
            // _this.emit('connect');
//          }
        },
        tlsDataReady: function(c) {
          // send TLS data over socket
          var bytes = c.tlsData.getBytes();
          string2ArrayBuffer(bytes, function(data) {
            chrome.sockets.tcp.send(socketId, data, function(sendInfo) {
              if (sendInfo.resultCode < 0) {
                console.error('SOCKET ERROR on write: ' +
                    chrome.runtime.lastError.message + ' (error ' + (-sendInfo.resultCode) + ')');
              }
              if (sendInfo.bytesSent === data.byteLength) {
                console.log('drain');
                // _this.emit('drain');
              } else {
                if (sendInfo.bytesSent >= 0) {
                  console.error('Can\'t handle non-complete writes: wrote ' +
                      sendInfo.bytesSent + ' expected ' + data.byteLength);
                }
                //_this.emit('error', 'Invalid write on socket, code: ' + sendInfo.resultCode);
                console.log('error', 'Invalid write on socket, code: ' + sendInfo.resultCode);
              }
            });
          });
        },
        dataReady: function(c) {
          // indicate application data is ready
          var data = c.data.getBytes();
          irc.util.toSocketData(forge.util.decodeUtf8(data), function(data) {
            //_this.emit('data', data);
            console.log('data', data);
          });
        },
        closed: function(c) {
          // close socket
          // _this._close();
          console.log('_close');
        },
        error: function(c, e) {
          // send error, close socket
          // _this.emit('error', 'tlsError: ' + e.message);
          // _this._close();
          console.log('error', 'tlsError: ' + e.message);
          // console.log('data', data);
        }
      });
  };

  var string2ArrayBuffer = function(string, callback) {
    var buf = new ArrayBuffer(string.length);
    var bufView = new Uint8Array(buf);
    for (var i=0; i < string.length; i++) {
      bufView[i] = string.charCodeAt(i);
    }
    callback(buf);
  };

  var arrayBuffer2String = function(buf, callback) {
    var bufView = new Uint8Array(buf);
    var chunkSize = 65536;
    var result = '';
    for (var i = 0; i < bufView.length; i += chunkSize) {
      result += String.fromCharCode.apply(null, bufView.subarray(i, Math.min(i + chunkSize, bufView.length)));
    }
    callback(result);
  };


send = function (str){

  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }

  chrome.sockets.tcp.send(socketId, buf, on_send);
};

on_send = function (sendInfo){
  console.log('sent ' +sendInfo);
};