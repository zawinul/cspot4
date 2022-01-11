
function init() {
	console.log('start'); 
	if (location.href.indexOf('__START__')>=0)
		start();
	else
		receive();

}


function start() {
	var base = location.href.split('?')[0].split('#')[0];
	var scope=["playlist-read-private","playlist-read-collaborative",
		"playlist-modify-public","playlist-modify-private",
		"user-library-read","user-library-modify",
		"user-read-private","user-top-read",
		"user-read-playback-state", "user-modify-playback-state"
	].join(' ');

	var u = "https://accounts.spotify.com/authorize"
		+ "?client_id=5bc49ed38d23431f88c4bf5258814a48"
		+ "&response_type=token"
		+ "&redirect_uri="+base
		+ "&scope="+scope
		+ "&state=jumpback";

		location.href = u;
	}

function receive() {

	var x, pars={};
	console.log(location.href);
	x = location.href.split('#')[1].split('&');

	// estrae pars = {access_token:"...", state: "..."}
	for(var i=0; i<x.length; i++) {
	  var s = x[i], p =x[i].indexOf('=');
	  pars[s.substring(0,p)]=unescape(s.substring(p+1));
	}
	console.log({ params:pars});
	
	if (window.opener && window.opener.postMessage) {
		var msg = { cmd:'onToken', token:pars.access_token, url:location.href };
		window.opener.postMessage(btoa(JSON.stringify(msg)), "*");
	}
	setTimeout(function() {window.close();}, 100, 'win close');

}
