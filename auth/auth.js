
const mode = 'code';
//const mode='token';

function init() {
	console.log('start');
	if (location.href.indexOf('__START__') >= 0)
		start();
	else
		receive();

}


function start() {
	var base = location.href.split('?')[0].split('#')[0];
	var scope = ["playlist-read-private", "playlist-read-collaborative",
		"playlist-modify-public", "playlist-modify-private",
		"user-library-read", "user-library-modify",
		"user-read-private", "user-top-read",
		"user-read-playback-state", "user-modify-playback-state"
	].join(' ');

	var u = "https://accounts.spotify.com/authorize"
		+ "?client_id=5bc49ed38d23431f88c4bf5258814a48"
		+ "&response_type=" + mode
		+ "&redirect_uri=" + base
		+ "&scope=" + scope
		+ "&state=jumpback";
	window.u = u;
	console.log(u);

	location.href = u;
}

function receive() {

	var x, pars = {};
	console.log(location.href);
	if (location.href.indexOf('#') >= 0)
		receiveHash();
	else
		receiveParams();

}

function receiveParams() {
	var x, pars = {};
	console.log(location.href);
	x = location.href.split('?')[1].split('&');

	// estrae pars = {access_token:"...", state: "..."}
	for (var i = 0; i < x.length; i++) {
		var s = x[i], p = x[i].indexOf('=');
		pars[s.substring(0, p)] = unescape(s.substring(p + 1));
	}
	console.log({ params: pars });
	var base = location.href.split('?')[0].split('#')[0];

	let data = {
		code: pars.code,
		redirect_uri: base,
		grant_type: 'authorization_code'
	};
	var formBody = [];
	for (var property in data) {
		var encodedKey = encodeURIComponent(property);
		var encodedValue = encodeURIComponent(data[property]);
		formBody.push(encodedKey + "=" + encodedValue);
	}
	formBody = formBody.join("&");
	console.log(formBody);
	const client_id = '5bc49ed38d23431f88c4bf5258814a48';
	const client_secret = '15471e935b2d41f2aecf4d6ba7807b2d';
	fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': 'Basic ' + btoa(client_id + ':' + client_secret)
		},
		body: formBody
	}).then(res => {
		console.log("Request complete! response:", res);
		res.json().then(function(pars) {
			console.log({pars})
			if (window.opener && window.opener.postMessage) {
				var msg = { 
					cmd: 'onToken', 
					token: pars.access_token, 
					refresh_token: pars.refresh_token, 
					url: location.href 
				};
				window.opener.postMessage(btoa(JSON.stringify(msg)), "*");
			}
		});	
	},err=> {
		console.log({err})
	});
}

function receiveHash() {
	var x, pars = {};
	console.log(location.href);
	x = location.href.split('#')[1].split('&');

	// estrae pars = {access_token:"...", state: "..."}
	for (var i = 0; i < x.length; i++) {
		var s = x[i], p = x[i].indexOf('=');
		pars[s.substring(0, p)] = unescape(s.substring(p + 1));
	}
	console.log({ params: pars });

	if (window.opener && window.opener.postMessage) {
		var msg = { cmd: 'onToken', token: pars.access_token, url: location.href };
		window.opener.postMessage(btoa(JSON.stringify(msg)), "*");
	}
	setTimeout(function () { window.close(); }, 100, 'win close');

}

