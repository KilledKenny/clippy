
document.getElementById("error").innerText = "error?";
ToBase64 = function (u8) {
    return btoa(String.fromCharCode.apply(null, u8)).replace(/\//g, '_').replace(/\+/g, '-');//.replace(/=+$/,'');
}

FromBase64 = function (str) {
    return new Uint8Array(atob(str.replace(/_/g, '/').replace(/-/g, '+')).split('').map(function (c) { return c.charCodeAt(0); }));
}

var crypt = {};

crypt.Key = function(){
	//if (crypt._key === undefined) {
		crypt._key=window.localStorage["pasteKey"]
		if (crypt._key != undefined){
			crypt._key=FromBase64(crypt._key)
		}else {
			crypt._key = new Uint8Array(32);
			window.crypto.getRandomValues(crypt._key);
			window.localStorage["pasteKey"]=ToBase64(crypt._key);
		}
	//}
	return crypt._key;
};

crypt.Encrypt = function(data){
	var textBytes = aesjs.utils.utf8.toBytes(data);
	var aesCtr = new aesjs.ModeOfOperation.ctr(crypt.Key(), new aesjs.Counter(5));
	var encryptedBytes = aesCtr.encrypt(textBytes);
	return ToBase64(encryptedBytes);
};

crypt.Decrypt = function (data){
	//encryptedBytes = aesjs.utils.utf8.toBytes(data);
	encryptedBytes = FromBase64(data);
	var aesCtr = new aesjs.ModeOfOperation.ctr(crypt.Key(), new aesjs.Counter(5));
	var decryptedBytes = aesCtr.decrypt(encryptedBytes);
	var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
	return decryptedText;
}

crypt.ID = function () {
	return crypt.Encrypt(new Uint8Array(32));	
};
crypt.PrintKey = function (){
	return ToBase64(crypt.Key());
}

function get(){
var xhr = new XMLHttpRequest();

xhr.onreadystatechange = function () {
if (this.readyState === 4) {
console.log(this.responseText);
console.log('Error: ' + this.status);
}
};

xhr.open('GET', '/api/get/?ID=' + crypt.ID(), false);
xhr.send(null);
console.log("block?");
if ( xhr.responseText == "Nothing copied") {
return  null;
}
return crypt.Decrypt(xhr.responseText);
}

function put(data){
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function () {
if (this.readyState === 4) {
console.log(this.responseText);
console.log('Error: ' + this.status);
}
};
xhr.open('PUT', '/api/put/?ID=' + crypt.ID(), false);
//Lie but it think i need a contnet type....
xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
xhr.send(crypt.Encrypt(data));
}



function checkSetup(){
	console.log("check");
	test = get();
	if (test === null) {
	 setTimeout(checkSetup, 1000);
	}else {
		window.localStorage["setup"] = "true";
		alert(test);
	}
}

function dispqr(){
	var qrcode = new QRCode(document.getElementById("qrcode"), {
    text: crypt.PrintKey(),
	title: "a",
    width: 400,
    height: 400,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

	checkSetup();
}


function pollClip(){
		console.log("check");
	test = get();
	if (test){
	document.querySelector('.js-copytextarea').innerText = test;
	}
	
}

function pollClipLoop(){
pollClip();
	setTimeout(pollClipLoop, 10000);
}

function initClibBut(){
var copyTextareaBtn = document.querySelector('.js-textareacopybtn');

copyTextareaBtn.addEventListener('click', function(event) {
  var copyTextarea = document.querySelector('.js-copytextarea');
  copyTextarea.disabled =false;
  copyTextarea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Copying text command was ' + msg);
  } catch (err) {
    console.log('Oops, unable to copy');
  }
  copyTextarea.disabled =true;
});
pollClipLoop();
}

function initClipPaste(){
	function handlePaste (e) {
	console.log(e.clipboardData);
	console.log(e.clipboardData.items);
    var clipboardData, pastedData;

    // Stop data actually being pasted into div
    e.stopPropagation();
    e.preventDefault();

    // Get pasted data via clipboard API
    clipboardData = e.clipboardData || window.clipboardData;
    pastedData = clipboardData.getData('Text');

    // Do whatever with pasteddata
    put(pastedData);
	pollClip();
}

document.addEventListener('paste', handlePaste);
	
	
}


//Why the fuck dose annyone want to use js...
//What you want to read the result of your fuction call?! But i promis to run som random funcion instaed
//Anything beyond and before this point is just going to be ugly spagettie
//Atleast I tryed (but not really)...

var gCtx = null;
var v=null;
var mode="";



function read(a)
{
	alert(a);
	window.localStorage["pasteKey"] = a;
	put("First");
	window.localStorage["setup"] = "true";
	

}
function video(){

	qrcode.debug=true;
    gCtx = document.getElementById("qr-canvas").getContext("2d");
    gCtx.clearRect(0, 0, 800, 600);
	qrcode.callback = read;
	var options = true;
	if(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
	{
	    try{
	        navigator.mediaDevices.enumerateDevices()
	        .then(function(devices) {
	          devices.forEach(function(device) {
	            if (device.kind === 'videoinput') {
	              if(device.label.toLowerCase().search("back") >-1 )
	                options={'deviceId': {'exact':device.deviceId}, 'facingMode': "environment" } ;
	            }
				console.log(device.kind + ": " + device.label +" id = " + device.deviceId);
	          });
	          run(options);
	        });
	    }
	    catch(e)
	    {
	        console.log(e);
	    }
	}
	else{
	    console.log("no navigator.mediaDevices.enumerateDevices" );
	}
}
function run(options){
	v=document.getElementById("v");
	var getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.getUserMedia;
	mode="webkit";
	if (navigator.mozGetUserMedia) {
		mode="moz";
	}
	getUserMedia.call(navigator,{video:options, audio: false}, success, error);
}
function error(error) {
	//alert(error);
	console.log(error);
}
function success(stream) {
    if(navigator.mozGetUserMedia)
    {
        v.mozSrcObject = stream;
        v.play();
    }
    else{
	    v.src = window.URL.createObjectURL(stream);
    }
    setTimeout(captureToCanvas, 500);
}
function captureToCanvas() {
	console.log("captureToCanvas");
	try{
	    gCtx.drawImage(v,0,0);
	    try{
	        qrcode.decode();
	    }
	    catch(e){
			//Usefull for debuging
			//document.getElementById("error").innerText = e;
	        setTimeout(captureToCanvas, 500);
	    };
	}
	catch(e){
	        setTimeout(captureToCanvas, 500);
	};
}

function main(){
	//localStorage.removeItem("setup");
	//localStorage.removeItem("setup");
	//localStorage.removeItem("pasteKey");
	if (window.localStorage["setup"] != "true"){
	document.getElementById("setup").style.visibility = "visible";
	document.getElementById("normal").style.display = 'none';
	video();
	dispqr();
	}else {
		document.getElementById("setup").style.display = 'none';
		document.getElementById("normal").style.visibility = "visible";
		initClibBut();
		initClipPaste();
		
	}
}

// 90% of my js developing is just figuring out when to run my code
document.addEventListener('DOMContentLoaded', main);
if (document.readyState === "complete"  || document.readyState === "loaded" || document.readyState === "interactive" ){
	main();
}