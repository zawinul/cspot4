var prova1Initialized = $.Deferred();
var me;
var commands;
var div;
var statusTimer = new Rx.ReplaySubject(1);
var changedPlaylists;
var blacklistMap;
var resetNeeded = false;

function show(x, label) {
	if (!label) 
		label = "---";
	if (typeof(x)!='object' || !x.then)
		console.log({_a_label:label, _b_type:typeof(x), _c_data:x});
	else
		x.then((v)=>{
			var x = {_a_label:label, _b_type:'PROMISE', _c_data:v};
			if ($.isArray(v))
				x._b_len = v.length; 
			console.log(x);
		});
}



function prova1() {

	var _tracks = null, _cursor = 0;
	var loader = true;
	var timer = false, timerPeriod = 5000;
	var statusTimer = new Rx.ReplaySubject(1);
	var playingSongSubject = new Rx.ReplaySubject(1 /* buffer size */);
	var playingStateSubject = new Rx.ReplaySubject(1 /* buffer size */);
	resetNeeded = location.href.indexOf('reset')>=0;

	function initialize() {
		$('.app').fadeOut(1);

		playingSongSubject.subscribe(showSong);
		playingSongSubject.subscribe(x => msg(x.name).css({backgroundColor:'white'}));

		spotlib.init()
			//.then(startNoSleep)
			.then(initializeDevice)
			.then(d => {msg('D=' + d.name);})
			.then(initializeBlacklist)
			.then(spotlib.getProfile)
			.then(u => (me = u))
			.then(loadCss)
			.then(initializeLists)
			.then(initializePage)
			.then(timerFun)
			.then(() => {
				msg('initialize done');
				//nextSong();
				prova1Initialized.resolve();
			});

	}


	function showSong(song) {
		//msg('SID: '+song.id);
		if (song.id == showSong.last)
			return;
		showSong.last = song.id;
		$(".titolo", div).text(song.name);
		$(".artist", div).text(song.artists[0].name);
		$(".album", div).text("from: " + song.album.name);
	
		$('body').css({ backgroundImage: 'url("' + song.album.images[0].url + '")' });
	
		db.getTrackPlaylists(song.id).done(arr => {
			if (arr && arr.length >= 1) {
				var pl = arr[0];
				//$(".playlist", div).text("playlist: " + pl.name + ' (' + (pl.owner.display_name || pl.owner.id) + ')');
				$(".playlist", div).text("playlist: " + pl.name);
			}
			else
				$(".playlist", div).text("playlist: ---");
		});
	}
	
	function silenceTracks() {
		if (!silenceTracks.id1) {
			silenceTracks.id1 = '6ZfRjAcExubAvJFOkZfGtI';
			silenceTracks.id2 = '2EeLn1LGhXQO9uFERlb2gE';
			silenceTracks.p = Promise.all([silenceTracks.id1, silenceTracks.id2].map(spotlib.getTrackById));
		}
		return silenceTracks.p;
	}
	
	function timerFun() {
		if (timer)
			spotlib.getStatus().then(s => {
				statusTimer.next(s);
				setTimeout(timerFun, timerPeriod);
			});
		else
			setTimeout(timerFun, timerPeriod);
	}

	function showCounters() {
		db.getCounters().then(arr =>
			arr.map(t => msg(t.tb + ': ' + t.cnt).css({ fontWeight: 'bold' }))
		);
	}

	function initializeBlacklist() {
		if (typeof(localStorage.blacklist) == "undefined")
		localStorage.blacklist = "";

		var blacklistArray = localStorage.blacklist.split(";").filter(x=>x);
		blacklistMap = _.reduce(blacklistArray, (a,b)=>{a[b]=true; return a;},{});
		return true;
	}

	function initializeLists() {
		var d = $.Deferred();

		var dbPlaylists = db.getPlaylists()
			.map(pl=> ({ id:pl.id, snapshot_id:pl.snapshot_id}))
			.toArray()
			.toPromise();
		
		
		var livePlaylistsRx = Rx.Observable
			.fromPromise(spotlib.getPlaylists())
			.flatMap(x => x.items);

		var livePlaylists = livePlaylistsRx
			.toArray()
			.toPromise()
			.then(db.setPlaylists);


		livePlaylists.then(showCounters);

		var selectedPlaylists = livePlaylists.then(x=>choosePlaylists(x));

		var readyPlaylistsIds = Promise.all([selectedPlaylists, dbPlaylists])
		.then(([selected, stored])=>{
			show(selected, 'selected');
			show(stored, 'stored');
			const changed = x =>
				resetNeeded || !_.some(stored, y => x.id==y.id && x.snapshot_id==y.snapshot_id);
			
			_.each(selected, x=>changed(x)?msg('chg '+x.name):false);

			const r = selected.map(x=>
				changed(x) ? db.updatePlaylist(x).then(()=>x.id) : x.id);
			
			show(r, 'pre-update');
			return Promise.all(r);
		});

		var tracks = readyPlaylistsIds
			.then(lists=>db.getTrackIds(lists))
			.then(arr=>{
				var ok = arr.filter(x=>!blacklistMap[x]);
				var filt = arr.filter(x=>blacklistMap[x]);
				msg ("BL: ok="+ok.length+" no:"+filt.length)
					.css({ backgroundColor:'black', color:'white'});
				return ok;
			});
		
		// show(dbPlaylists, 'dbPlaylists');
		// show(livePlaylists, 'livePlaylists');
		// show(selectedPlaylists, 'selectedPlaylists');
		// show(readyPlaylistsIds, 'readyPlaylistsIds');
		// show(tracks, 'tracks');
		
		tracks.then(x=>{
			_tracks = _.flatten(x);
			scramble(_tracks);
			_cursor = 0;
			commands.doTimer(true);
			commands.doLoader(true);
			d.resolve();
		});

		return d;
	}
	


	
	function initializePage() {
		var d = $.Deferred();
		div = $('<div/>').addClass('prova1-container');
		$('.prova1').hide();
		div.load('prova1.html', {}, onLoad);
		function onLoad() {
			function onResize() {
				$('.play-progress').css({ top: $(window).height() - 30 });
			}

			setTimeout(function () {
				$('.info-container', div).click(nextSong);
				$('.b-prev').click(prevSong);
				$('.b-delete').click(commands.deleteThisSong);
				$('.b-add').click(commands.addThisSong);
				$('.b-pause').click(commands.pause);
				$('.b-resume').click(commands.resume);
				$('.b-album').click(commands.album);
				$('.b-p100').click(commands.doP100);
				$('.b-loop').click(loopSong);
				$('.b-timer').click(commands.doTimer);
				$('.b-loader').click(commands.doLoader);
				$('.b-thumb-up').hide();
				$('.b-thumb-down').hide();
				$('.play-progress', div).click(commands.playProgressClick);
				onResize();
				$(window).resize(onResize);
				d.resolve();
			}, 100);
			div.appendTo('.main-container');
		}
		return d;
	}

	commands = (function() {
		function pause() {
			spotlib.pause();
		}
	
		function album() {
			var status;
			function onAlbum(album) {
				if (loader) {
					var thisSongUri = status.item.uri;
					var k = _cursor;
					var ids = album.tracks.items.map(x => x.id);
					spotlib.getTracksById(ids).done(result => {
						for (var i = 0; i < result.tracks.length; i++) {
							var tr = result.tracks[i];
							if (tr.uri == thisSongUri)
								continue;
							_tracks.splice(k, 0, tr.id);
							console.log('aggiunto in posizione ' + k + ': ' + tr.name);
							msg(k + ' ' + tr.name);
							k++;
						}
	
					});
				}
				else
					spotlib.playUri(album.tracks.items.map(x => x.uri));
			}
			spotlib.getStatus().done(s => {
				status = s;
				spotlib.getAlbum(status.item.album.id).done(onAlbum);
			});
		}
		
		function doP100() {
			console.log('p100');
			var arr = [];
			for (var i = 0; i < 100; i++) {
				var tr = _tracks[(_cursor + i) % _tracks.length];
				arr.push(tr);
			}
			Rx.Observable.from(arr)
				.map(x => db.getTrack(x))
				.map(x => Rx.Observable.fromPromise(x))
				.mergeAll()
				.map(x => x.uri)
				.toArray()
				.subscribe(arr => {
					spotlib.playUri(arr).done(function () { msg('fatto'); });
					doLoader(false);
				});
		}
	
		function doTimer(evt) {
			if (typeof (x) == 'boolean')
				timer = x;
			else
			timer = !timer;
			msg('doTimer ' + timer);
	
			$('.b-timer i').css({ color: (timer) ? "white" : "gray" });
		}
	
		function doLoader(x) {
			if (typeof (x) == 'boolean')
				loader = x;
			else
				loader = !loader;
			
			msg('doLoader ' + loader);
			$('.b-loader i').css({ color: (loader) ? "white" : "gray" });
		}
	
		function resume() {
			// $('.b-resume').hide();
			// $('.b-pause').show();
			spotlib.resume();
		}

		function deleteThisSong() {
			var tr;
			spotlib.getStatus()
				.then(status => db.getTrackPlaylists(trId = (tr = status.item).id))
				.then(arr => arr.map(pl => delFrom(pl)))
				.then(promises => $.when.apply($, promises))
				.then(() => msg('DONE'))
				.always(nextSong);
	
			function delFrom(pl) {
				console.log('DELETE FROM ')
				console.log({ deleteFrom: { pl: pl, tr: tr } });
				var ret = $.Deferred();
				if (me.id != pl.owner.id)
					return blackList(pl, tr);
	
				var question = 'cancella ' + tr.name.toUpperCase() + ' da ' + pl.name.toUpperCase() + ' ?';
				popup.confirm(question).then(reply=>{
					if (!reply) {
						ret.resolve();
					}
					else {
						spotlib.deleteFromPlaylist(pl.id, tr.uri)
							.done(function (result) {
								console.log({ result: result });
								msg('>> del OK');
							})
							.always(() => ret.resolve());
					}
				})
				return ret;
			}
	
			function blackList(pl, tr) {
				var ret = $.Deferred();
				if (blacklistMap[tr.id]) {
					popup.alert(pl.name.toUpperCase()+ " è già in black list");
					return ret;
				}
				else {
					var question = "Non sei l'owner di " + pl.name.toUpperCase() + ".\n\nVuoi mettere " + tr.name.toUpperCase() + " in Black List ?";
					popup.confirm(question).then(reply=>{
						if (reply) {
							blacklistMap[tr.id] = true;
							localStorage.blacklist = _.allKeys(blacklistMap).join(";");
							console.log("BL="+localStorage.blacklist);
						}	
						ret.resolve();
					})
				}
			}
		}
	
		function addThisSong() {
			if (addThisSong.pl)
				return f(addThisSong.pl);
	
			db.getPlaylists().filter(x => x.name == '__/A\\__').subscribe(pl => {
				f(addThisSong.pl = pl.id);
			});
	
			function f(plid) {
				spotlib.getStatus().done(status => {
					if (!status)
						return msg('fail');
	
					var song = status.item;
					spotlib.addToPlaylist(plid, song.uri).done(() => msg('OK'));
				});
			}
		}

		function playProgressClick(evt) {
			spotlib.getStatus().done(status => {
				try {
					showSong(status.item);
					var x = evt.originalEvent.clientX;
					if (!status.is_playing)
						return;
					if (!status.device)
						return;
					var t = status.item.duration_ms * x / $('.play-progress').width();
					console.log('seek ' + t);
					spotlib.seek(t);
				}
				catch (e) { }
			});
		}

		return  {
			pause: pause,
			album: album,
			doP100: doP100,
			doTimer: doTimer,
			doLoader: doLoader,
			resume: resume,
			deleteThisSong: deleteThisSong,
			addThisSong: addThisSong,
			playProgressClick:playProgressClick
		}
	})();

	window.commands = commands;


	function onStatus(status) {
		if (!status|| !status.item)
			return;
		var id = status.item.id;
		if (id != silenceTracks.id1 && id != silenceTracks.id2 && id != onStatus.lastSong) {
			playingSongSubject.next(status.item);
		}
		onStatus.lastSong = status.item.id;
		var play = status.is_playing;
		var active = (status.device) ? status.device.is_active : false;
		var dev = status.device.name;
		var k = !!status.progress_ms;
		var p = status.timestamp - status.progress_ms;

		$('.buttons .b-resume').toggleClass('hidden', play);
		$('.buttons .b-pause').toggleClass('hidden', !play);

		var stato = [play, active, dev].join('');
		if (stato != timerFun.stato) {
			timerFun.stato = stato;
			playingStateSubject.next(status);
		}
		//msg(status.progress_ms+' - '+status.item.duration_ms);

		// certe volte il player rimane in playing anche se il brano è finito
		var fineBrano = status.progress_ms > 0 && status.progress_ms == status.item.duration_ms;

		// se il brano corrente è il "silence" siamo in pausa
		var silence = (status.item.id == silenceTracks.id1) || (status.item.id == silenceTracks.id2);
		
		barra(status);

		// next song
		if (loader && status.device)
			if (silence || fineBrano)
				nextSong();
	};
	statusTimer.subscribe(onStatus);

	function loadCss() {
		$('<link>').appendTo('head').attr({ type: 'text/css', rel: 'stylesheet', href: 'css/prova1.css' });		
	}

	function barra(status) {
		var play = status.is_playing;
		var songstart = status.timestamp;
		var songlen = status.item.duration_ms;
		var active = (status.device) ? status.device.is_active : false;
		var b = $('.play-progress');
		var w = b.width();
		$('.barra-w, .barra-b', b).width(b.width());
		$('.bleft', b).text((play ? 'P' : '!P') + ' ' + (active ? 'A' : '!A'));
		$('.bmiddle', b).text(moment.utc(status.progress_ms).format("mm:ss")
			 + ' ' + Math.floor(status.progress_ms/(songlen+1)*10000)/100+'%' 
		);
			
		$('.bright', b).text(moment.utc(songlen).format("mm:ss"));

		// barra
		var target = status.progress_ms ? status.progress_ms + timerPeriod : 0;
		var barradiv = $('.play-progress .barra-meter');
		if (!play || target <= 0 || status.progress_ms <= 0 || songlen <= 0)
		 	barradiv.stop().animate({ width: 0 }, 100);
		else {
			var bfrom = w * status.progress_ms / songlen
			var bto = w * target / songlen;
			if (bto > w-1)
				bto = w-1;

			if (status.timestamp!=barra.lastTimestamp) {
				msg('TS changed');
				barra.lastTimestamp = status.timestamp;
				barradiv.stop().animate({ width: bfrom }, 100).animate({ width: bto }, timerPeriod-100);
			}
			// if (bto < barradiv.width())
			// 	barradiv.animate({ width: bfrom }, 100).animate({ width: bto }, timerPeriod-100);
			else
				barradiv.stop().animate({ width: bto }, timerPeriod, 'linear');
		}
	}

	function prevSong() {
		spotlib.getStatus().done(status => {
			if (!status.is_playing)
				return;

			if (status.progress_ms > 10000) {
				spotlib.seek(0);
			}
			else {
				_cursor = (_cursor - 2 + _tracks.length) % _tracks.length;
				nextSong();
			}
		});
	}

	function nextSong() {
		console.log('nextSong');
		if (!_tracks || (_tracks.length == 0)) {
			msg('lista tracce vuota');
			return;
		}
		msg('song cursor = ' + _cursor);
		var trId = _tracks[_cursor];
		_cursor = (_cursor + 1) % _tracks.length;
		silenceTracks().then(silences => {
			console.log({getSilenceTracks:silences});
			db.getTrack(trId).done(tr => {
				showSong(tr);
				spotlib.playUri([tr.uri, silences[0].uri, silences[1].uri]);
			});
		});
	}

	var loopSong = function(){
		var state = a;
		var msStart, msEnd, songStart, timeout;

		function a() {
			msStart = (new Date()).getTime();
			songStart = spotlib.getStatus().then(status=>status.progress_ms);
			state = b;
			$('.b-loop').attr('data-state','b');
		}

		function b(){
			msEnd = (new Date()).getTime();
			songStart.then(ms=>spotlib.seek(ms));
			timeout = setTimeout(t, msEnd-msStart);
			state = c;
			$('.b-loop').attr('data-state','c');
		}

		function c() {
			state = a;
			$('.b-loop').attr('data-state','a');
		}

		function t() {
			if (state===c) {
				songStart.then(ms=>spotlib.seek(ms));
				timeout = setTimeout(t, msEnd-msStart);
			}
			else
				timeout = null;
		}

		return function() {
			state.apply(this, arguments);
		}
	}();
	window.loopSong = loopSong;

	initialize();
}


$(() => main.started.done(prova1));

