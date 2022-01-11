var spotlib = {
	profile: null,
	playlists: null,
	playlist: {},
	initialized: $.Deferred()
};

(function () {
	var led = $('<div/>');
	led.css({position:'absolute', zIndex:9999,top:4, left:4, width:6, height:6, borderRadius:3, backgroundColor:'red', opacity:0})
	var ledcnt = 0;

	setTimeout(function(){ led.appendTo('body');}, 2000, 'led append');
	
	function ledOn() {
		if (++ledcnt ==1)
			led.stop(true, true).fadeIn(5);
		//console.log('led '+ledcnt);
	}
	function ledOff() {
		if (--ledcnt == 0)
			led.stop(true, true).fadeOut(100);
		//console.log('led '+ledcnt);
	}

	function sendReq(req) {
		ledOn();

		function onToken(token) {
			if (!req.myNoLog)
				if (req.url!='https://api.spotify.com/v1/me/player')
					console.log('calling '+req.method+' '+req.url+' '+(req.data||""));
			if (!req.headers)
				req.headers={};
			req.headers.Authorization = 'Bearer '+token;
			req.dataType = req.dataType || 'json';
			req.jsonp = false;
			req.cache = false;
			req.error = function(jqXHR, textStatus, errorThrown ){
				console.log({reqError:arguments});
				console.log("%cFAIL "+req.method+" "+req.url,"background-color:red;color:white");
				//console.log({sendReqFail:{req:req, args:arguments, t:this}});
				msg("Err: "+req.method+" "+req.url).css({backgroundColor:'yellow'});
				msg(jqXHR.status+' '+jqXHR.statusText).css({backgroundColor:'yellow'});
				ledOff();
			}
			var d = $.ajax(req);
			d.done(ledOff);
			return d;
		}

		return getToken().then(onToken);
	} 

	function callSpotify(url, data, opts) {
		var d;
	
		var opt = {
			method: 'get',
			dataType: 'json',
			url:url,
			jsonp: false,
			cache: false
		};
		if (data)
			opt.data = data;
		if (opts)
			$.extend(opt, opts);
		
		d = sendReq(opt);
		return d;
	}


	function deleteFromPlaylist(playlistId, songUri) {
		var url = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + playlistId + "/tracks";
		var opts = {
			method: 'delete'
		};
		var data = JSON.stringify({	tracks: [{ uri: songUri }] });
		return callSpotify(url, data, opts);
	}

	function addToPlaylist(playlistId, songUri) {
		var url = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + playlistId + "/tracks";
		url += "?uris=" + escape(songUri);
		var opts = {
			method: 'post'
		};
		return callSpotify(url, null, opts);
	}

	
	function addToQueue(songUri) {
		var url = "https://api.spotify.com/v1/me/player/queue";
		url += "?uri=" + escape(songUri);
		var opts = {
			method: 'post'
		};
		return callSpotify(url, null, opts);
	}

	function getProfile() {
		console.log('getProfile');
		return callSpotify("https://api.spotify.com/v1/me").then(function (x) {
			spotlib.profile = x;
			return x;
		});
	}

	function getPlaylists() {
		console.log('getPlaylists');
		return callSpotify("https://api.spotify.com/v1/me/playlists", { limit: 50 }).done(function (x) {
			spotlib.playlists = x;
		});
	}

	function getPlaylistIds() {
		console.log('getPlaylistIds');
		return callSpotify("https://api.spotify.com/v1/me/playlists", { limit: 50 }).done(function (x) {
			spotlib.playlists = x;
		}).then(x=>{
			return x.items.map(y=>y.id);
		});
	}

	function getFeaturedPlaylists() {
		var opt = {
			limit: 50,
			//timestamp:'2015-12-28T12:05:00',
			country: 'IT'
		};
		var u = 'https://api.spotify.com/v1/browse/featured-playlists';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.featuredPlaylists = x.playlists;
		});
		return d;
	}

	function getGenres() {
		var opt = {
			limit: 100
		};
		var u = 'https://api.spotify.com/v1/recommendations/available-genre-seeds';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.genres = x.genres;
		});
		return d;

	}


	function getRecommendations() {
		var opt = {
			limit: 100
		};
		var u = 'https://api.spotify.com/v1/recommendations/recommendations';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.recommendations = x.genres;
		});
		return d;

	}

	function getTopArtists() {

		var u = 'https://api.spotify.com/v1/me/top/artists?limit=100';
		var d = callSpotify(u);
		d.done(function (x) {
			spotlib.topArtists = x.items;
		});
		return d;
	}

	function getTopTracks() {

		var u = 'https://api.spotify.com/v1/me/top/tracks?limit=100';
		var d = callSpotify(u);
		d.done(function (x) {
			spotlib.topTracks = x.items;
		});
		return d;
	}

	
	function setShuffle(s) {
		var u = 'https://api.spotify.com/v1/me/player/shuffle'
		if(typeof(s)!='undefined')
			u += '?state='+(!!arguments[0]);
		return callSpotify(u, null, {method:'put'});
	}

	function getCategories() {
		var opt = {
			limit: 50,
			country: 'IT',
			locale: 'it_IT'
		};
		var u = 'https://api.spotify.com/v1/browse/categories';
		var d = callSpotify(u, opt);
		d.done(function (x) {
			spotlib.categories = x.categories;
		});
		return d;
	}


	function getStatus() {
		var req = {
			method:'GET',
			dataType: 'text',			
			url:"https://api.spotify.com/v1/me/player"
		};
		var ret = $.Deferred();
		callSpotify(null, null, req).done(x=>{
			if (!x||x.trim()=='') 
				spotlib.status = null;
			else
				spotlib.status = JSON.parse(x);
			ret.resolve(spotlib.status)
		});
		return ret;
	}


	function getDevices() {
		var req = {
			method:'GET',
			url:"https://api.spotify.com/v1/me/player/devices"
		};
		return sendReq(req).then(resp=>{
			msg('resp '+!!resp.device+' '+!!resp.devices);
			if (resp.device)
				return [resp.device];
			else
				return resp.devices;
		});
	}

	

	function getPlayers() {
		var req = {
			method: 'GET',
			url:'https://api.spotify.com/v1/me/player/devices'
		}
		var ret = sendReq(req);
		ret.done(x=>console.log({getPlayers:x}));
		return ret;
	}
	
	function getDeviceId() {
		if (!getDeviceId.v) {
			getDeviceId.v = new $.Deferred();
			getPlayers().then(x=>{
				console.log({getDeviceId:x});
				var id = x.devices[0].id;
				getDeviceId.v.resolve(id);
			});
		}
		return getDeviceId.v;
	}
		
	function playNext() {
		var opt = {
			url:"https://api.spotify.com/v1/me/player/next",
			method:'POST'
		};
		return spotlib.sendReq(opt);	
	}

	function playPrevious() {
		var opt = {
			url:"https://api.spotify.com/v1/me/player/previous",
			method:'POST'
		};
		return spotlib.sendReq(opt);	
	}

	function playUri(uri, device_id, position_ms) {
		console.log({playUri:{uri:uri, device_id:device_id}});

		if (!$.isArray(uri))
			return playUri([uri], device_id, position_ms);
		var data = { uris:uri };
		if (position_ms)
			data.position_ms = position_ms;
	
			var opt = {
			url:(device_id)
				? 'https://api.spotify.com/v1/me/player/play?device_id='+device_id
				: 'https://api.spotify.com/v1/me/player/play',
			method:'PUT',
			data: JSON.stringify(data)
		};
		return spotlib.sendReq(opt);	
	}

	async function getPlaylistTracks(plist) {
		console.log('getPlaylistTracks ' + plist.name);
		var limit = 100;
		var offsetbase = 0;
		var offset = offsetbase;
		var ret = [];
		var total='?';
		return new Promise(function(resolve, reject){
			function f() {
				console.log('get offset=' + offset+ ' (total='+total+')');
				var u = plist.href;
				u += "/tracks?offset=" + offset + "&limit=" + limit;
				callSpotify(u).done(onData);
			}
			function onData(x) {
				total = x.total;
				for (var tr of x.items)
					ret.push(tr);
				offset = ret.length;
				if (offset < x.total)
					f();
				else
					resolve(ret);
			}
			f();
		});
	}


	// function OLD_getPlaylistTracks(plist) {
	// 	console.log('getPlaylistTracks ' + plist.name);
	// 	var limit = 100;
	// 	var offsetbase = 0;
	// 	var offset = offsetbase;
	// 	var ret = $.Deferred();

	// 	function f() {
	// 		console.log('get offset=' + offset);
	// 		var u = plist.href;
	// 		u += "/tracks?offset=" + offset + "&limit=" + limit;
	// 		callSpotify(u).done(onData);
	// 	}

	// 	function onData(x) {
	// 		if (offset === 0)
	// 			plist.tracks = x;
	// 		else
	// 			for (var i = 0; i < x.items.length; i++)
	// 				plist.tracks.items.push(x.items[i]);
	// 		//console.log("act="+plist.tracks.items.length+" of "+x.total);
	// 		offset = plist.tracks.items.length;
	// 		if (offset < x.total)
	// 			f();
	// 		else
	// 			ret.resolve(plist);
	// 	}
	// 	f();
	// 	return ret;
	// }

	function getAlbum(id) {
		var req = {
			method: 'GET',
			url:'https://api.spotify.com/v1/albums/'+id
		}
		return sendReq(req);
	}

	function getPlaylistById(id, full) {
		console.log('getPlaylistById ' + id);
		var found = null;
		for (var i = 0; i < spotlib.playlists.items.length; i++) {
			if (spotlib.playlists.items[i].id == id)
				found = spotlib.playlists.items[i];
		}
		var ret = $.Deferred();
		var u = found.href;
		callSpotify(u).done(function (x) {
			spotlib.playlist[id] = x;
			if (full)
				getPlaylistTracks(x).done(function () { ret.resolve(x); })
			else
				ret.resolve(x);
		});
		return ret;
	}

	function getPlaylistByName(name, full) {
		console.log('getPlaylistByName ' + name);
		for (var i = 0; i < spotlib.playlists.items.length; i++) {
			if (spotlib.playlists.items[i].name == name)
				return getPlaylistById(spotlib.playlists.items[i].id, full);
		}
		return null;
	}

	function getTrackById(id) {
		var req = {
			method: 'GET',
			url:'https://api.spotify.com/v1/tracks/'+id
		};

		return sendReq(req);
	}

	// function getTrackById(id) {
	// 	var ret = $.Deferred();
	// 	console.log('get from db '+id);
	// 	if (!id)
	// 		debugger;
	// 	db.getTrack(id).then(tr=> {
	// 		if (tr!=null) {
	// 			ret.resolve(tr);
	// 			return;
	// 		}
	// 		var req = {
	// 			method: 'GET',
	// 			url:'https://api.spotify.com/v1/tracks/'+id
	// 		};
	// 		sendReq(req).then(tr=>{
	// 			ret.resolve(tr);
	// 			console.log("ottenuta traccia "+id);
	// 		});
	// 	});
	// 	return ret;
	// }

	function getTracksById(ids) {
		var req = {
			method: 'GET',
			url:'https://api.spotify.com/v1/tracks/?ids='+ids.join(',')
		}
		return sendReq(req);
	}

	function setPlaylistTracks(pl, arr) {
		console.log({ a: 'setPlaylistTracks', pl: pl, arr: arr });
		var offset = 0;
		var ret = $.Deferred();
		function f() {
			console.log('setPlaylistTracks f: offset=' + offset);
			if (offset >= arr.length) {
				ret.resolve();
				return;
			}
			var arr1 = [];
			var m = (offset == 0) ? 'put' : 'post';
			for (var i = 0; i < 50; i++ , offset++)
				if (offset < arr.length)
					arr1.push(arr[offset]);
			console.log('setPlaylistTracks f: len=' + arr1.length);
			var u = "https://api.spotify.com/v1/users/" + spotlib.profile.id + "/playlists/" + pl.id + "/tracks";
			console.log('url=' + u);
			var j = JSON.stringify({ uris: arr1 });
			var d = callSpotify(u, j, { method: m, contentType: 'application/json' });
			d.done(f);
		}
		f();
		return ret;
	}


	function sequence(funarray) {
		var ret = $.Deferred();
		console.log('sequence ' + funarray.length);
		var i = 0;
		function f(x) {
			if (i >= funarray.length) {
				console.log('end of sequence');
				ret.resolve();
				return;
			}
			$.when(funarray[i++]()).done(f);
		}
		f();
		return ret;
	}

	function init() {
		var d = $.Deferred();

		sequence([getProfile /*, getPlaylists, getCategories, getFeaturedPlaylists*/]).done(function () {
			msg('spotlib initialized');
			spotlib.initialized.resolve();
			d.resolve();
		});
		return d;
	}

	function sample() {
		var da = getPlaylistByName('temp', true);
		var db = getPlaylistByName('temp2', false);
		$.when(da, db).done(onData);

		function onData(a, b) {
			console.log({ a: a, b: b });
			var arr = [];
			for (var i = 0; i < a.tracks.items.length; i++)
				arr.push(a.tracks.items[i].track.uri);
			console.log({ arr: arr });

			for (var i = 0; i < 3000; i++) { //scramble
				var i1 = Math.floor(Math.random() * arr.length);
				var i2 = Math.floor(Math.random() * arr.length);
				var t1 = arr[i1];
				var t2 = arr[i2];
				arr[i1] = t2;
				arr[i2] = t1;
			}
			console.log('sorted');
			setPlaylistTracks(b, arr);
		}
	}

	function getToken() {
		//console.log('getToken');
		// abbiamo una promessa di token valido in memoria?
		var d = getToken.d;
		if (d) {
			if (getToken.expire && (new Date().getTime()+60000<getToken.expire)) {
				//console.log('promessa di token già presente');
				return d;
			}
		}

		// abbiamo un token valido in localStorage ?
		var x = (localStorage && localStorage.cspot4Token) ? localStorage.cspot4Token : null;
		var y = (localStorage && localStorage.cspot4TokenExpire) ? localStorage.cspot4TokenExpire : 0;
		if (x && y && ((y-0)>new Date().getTime())) {
			getToken.expire = y;
			getToken.d = new $.Deferred().resolve(x);
			//console.log('token già presente');
			return getToken.d;
		}

		// generazione nuovo token
		d = getToken.d = $.Deferred();
		getToken.expire = new Date().getTime()+3600*1000;
		console.log('creata promessa di token');

		if (!getToken.listenerAdded) {
			window.addEventListener("message", function (event){
				console.log(JSON.stringify({messageArrived:{event:event}},null,2));
				try {
					var msg = JSON.parse(atob(event.data));
					console.log(JSON.stringify({msg:msg},null,2));
					localStorage.cspot4Token = msg.token;
					getToken.expire = new Date().getTime()+3600*1000;
					localStorage.cspot4TokenExpire = ""+getToken.expire;
					d.resolve(msg.token);
				}catch(e){ }
			}, false);
			getToken.listenerAdded = true;
		}
		window.open('../auth/index.html?__START__=1');
		return d;
	}


	function pause() {
		var opt = {
			url:'https://api.spotify.com/v1/me/player/pause',
			method:'put'
		};
		
		return sendReq(opt).then(x=>{
			console.log('paused');
		});
	}

	function resume() {
		var opt = {
			url:'https://api.spotify.com/v1/me/player/play',
			method:'put'
		};
		return sendReq(opt).then(x=>{
			console.log('resumed');
		});
	}

	function seek(ms) {
		var opt = {
			url:'https://api.spotify.com/v1/me/player/seek?position_ms='+Math.floor(ms),
			method:'put'
		};
		return sendReq(opt).then(x=>{
			console.log('seeked to '+ms);
		});

	}

	$.extend(spotlib, {
		init: init,
		sendReq:sendReq,
		callSpotify:callSpotify,
		
		getProfile: getProfile,
		deleteFromPlaylist: deleteFromPlaylist,
		addToPlaylist: addToPlaylist,
		addToQueue: addToQueue,
		getPlaylists: getPlaylists,
		getPlaylistIds: getPlaylistIds,
		getFeaturedPlaylists: getFeaturedPlaylists,
		getCategories: getCategories,
		getPlaylistTracks: getPlaylistTracks,
		getPlaylistById: getPlaylistById,
		getPlaylistByName: getPlaylistByName,
		setPlaylistTracks: setPlaylistTracks,
		getGenres: getGenres,
		getTopArtists: getTopArtists,
		getTopTracks: getTopTracks,
		getStatus: getStatus,
		getDevices: getDevices,
		getToken:getToken,
		getPlayers:getPlayers,
		getDeviceId:getDeviceId,
		getAlbum: getAlbum,
		getTrackById:getTrackById,
		getTracksById:getTracksById,
		playUri:playUri,
		playNext: playNext,
		playPrevious: playPrevious,
		pause:pause,
		resume:resume,
		seek:seek,
		setShuffle:setShuffle
	});






})();

