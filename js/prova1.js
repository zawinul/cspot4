var prova1Initialized = $.Deferred();
var me;
var commands;
var div;
var statusTimer = new Rx.ReplaySubject(1);
//var changedPlaylists;
var blacklistMap;
var resetNeeded = false;
var silenceTrack;
var _tracks = null, _cursor = -1;
var timerPeriod = 5000;
var curTrack; 

function prova1() {

	var statusTimer = new Rx.ReplaySubject(1);
	var playingSongSubject = new Rx.ReplaySubject(1 /* buffer size */);
	var playingStateSubject = new Rx.ReplaySubject(1 /* buffer size */);
	resetNeeded = location.href.indexOf('reset')>=0;
	var playingMyList = false;

	function initialize() {
		$('.app').fadeOut(1);

		playingSongSubject.subscribe(updateSong);
		playingSongSubject.subscribe(x => msg(x.name).css({backgroundColor:'white'}));

		db.isReady
			.then(spotlib.init)
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
			.then(getSilenceTrack)
			.then(() => {
				msg('initialize done');
				prova1Initialized.resolve();
			});

	}

	function updateSong(song) {
		if (song.id == updateSong.last)
			return;
		updateSong.last = song.id;
		if (playingMyList) {
			var found = false;
			msg('search '+song.id);
			for(var i=0; i<_tracks.length; i++) {
				let x = _tracks[i];
				if (x==song.id) {
					_cursor = i;
					msg('synch '+i);
					found = true;
					break;
				}
			}
			if (!found)
				msg('synch not found');
		}
		showSong(song);
	}

	function showSong(song) {

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
	
	function getSilenceTrack() {
		//var id = '6ZfRjAcExubAvJFOkZfGtI';
		var id = '2EeLn1LGhXQO9uFERlb2gE';
		var p = spotlib.getTrackById(id);
		p.then(s=>silenceTrack = s);
		return p;
	}
	// function silenceTracks() {
	// 	if (!silenceTracks.id1) {
	// 		silenceTracks.id1 = '6ZfRjAcExubAvJFOkZfGtI';
	// 		silenceTracks.id2 = '2EeLn1LGhXQO9uFERlb2gE';
	// 		silenceTracks.p = Promise.all([silenceTracks.id1, silenceTracks.id2].map(spotlib.getTrackById));
	// 	}
	// 	return silenceTracks.p;
	// }
	
	function timerFun() {
		spotlib.getStatus().then(s => {
			statusTimer.next(s);
			setTimeout(timerFun, timerPeriod);
		});
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

		var oldDbPlaylists = db.getPlaylists();
		oldDbPlaylists.then(x=>{console.log({oldDbPlaylists_x:x}); });
		// oldDbPlaylists = oldDbPlaylists
		// 	then(plset=>plset.map(pl=>({ id:pl.id, snapshot_id:pl.snapshot_id, name:pl.name})))
		
		var livePlaylists = $.Deferred();
		oldDbPlaylists.then(function() {
			spotlib.getPlaylists()
				.then(resp=> livePlaylists.resolve(resp.items));
		});
		livePlaylists.then(x=>console.log({livePlaylists_x:x}));
		// var dbThenLive = oldDbPlaylists.then(spotlib.getPlaylists);

		// var livePlaylists = Rx.Observable
		// 	.fromPromise(dbThenLive)
		// 	.flatMap(x => x.items)
		// 	.toArray()
		// 	.toPromise();

		//livePlaylists.then(x=>console.log({livePlaylists:x}));
		livePlaylists.then(db.setPlaylists).then(showCounters);

		var selectedPlaylists = livePlaylists.then(choosePlaylists);

		var readyPlaylistsIds = Promise.all([selectedPlaylists, oldDbPlaylists])
		.then(([selected, stored])=>{
			show(selected, 'selected');
			show(stored, 'stored');
			function isChanged(x) {
				for(var i=0; i<oldDbPlaylists.length; i++) {
					let y = oldDbPlaylists[i];
					if (y.id==x.id) 
						return  y.snapshot_id!=x.snapshot_id;
				}
				return false;
			}

			const changed = x =>
				resetNeeded || !_.some(stored, y => x.id==y.id && x.snapshot_id!=y.snapshot_id);
			
			function update(x) {
				if (resetNeeded || isChanged(x)) {
					msg('chg '+x.name);
					return db.updatePlaylist(x);
				}
				else 
					return x;
			}
			_.each(selected, x=>isChanged(x)?msg('chg '+x.name):false);

			r = selected.map(update);
			show(r.map(x=>x.name), 'pre-update');
			return Promise.all(r).then(x=>x.map(pl=>pl.id));
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
			_cursor = -1;
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

			div.on('click', '.button', function() {
				$(this).css('opacity',0).animate({opacity:1}, 500);
			});
			setTimeout(function () {
				$('.info-container', div).click(function() {
					if (playingMyList)
						spotlib.playNext();
					else
						commands.startAt(0,0);
				});
				$('.b-prev').click(commands.gotoPrevious);
				$('.b-delete').click(commands.deleteThisSong);
				$('.b-add').click(commands.addThisSong);
				$('.b-pause').click(commands.pause);
				$('.b-resume').click(commands.resume);
				$('.b-album').click(commands.album);
				//$('.b-p100').click(commands.doP100);
				$('.b-loop').click(loopSong);
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

		function gotoNext() {
			if (playingMyList)
				spotlib.playNext();
			else
				commands.startAt(0,0);
		}

		function gotoPrevious() {
			if (playingMyList)
				spotlib.playPrevious();
			else
				commands.play(0,0);
		}
	

		function pause() {
			spotlib.pause();
		}
	
		function startAt(cur, time) {
			_cursor = (cur>=0) ? cur : 0;
			time = time || 0;
			msg('start@'+_cursor+':'+time).css({color:'yellow', backgroundColor:'black'});

			var arr = [];
			for(var i=0; i<100; i++) 
				arr.push(_tracks[(_cursor+i)%_tracks.length]);
			arr.push(silenceTrack.id);

			msg('getting tracks');
			Rx.Observable.from(arr)
				//.map(x => db.getTrack(x))
				.map(spotlib.getTrackById)
				.map(x => Rx.Observable.fromPromise(x))
				.mergeAll()
				.map(x => x.uri)
				//.map(x => {msg(x); return x})
				.toArray()
				.subscribe(arr => {
					msg("play at"+_cursor+' N='+arr.length).css({backgroundColor:'#c0ffc0'});
					console.log({arr:arr});
					spotlib.playUri(arr, null, time).done(function () { msg('fatto'); });
					playingMyList = true;
				});
		}

		function album() {
			var status;
			var restart_ms;
			var restart_cur;
			function onAlbum(album) { 
				var thisSongUri = status.item.uri;
				var insertPoint = _cursor+1;
				var ids = album.tracks.items.map(x => x.id);
				spotlib.getTracksById(ids).done(result => {
					if (result.tracks.length<=1) {
						msg("nothing to do");
						return;
					}

					var position = -1;
					for (var i = 0; i < result.tracks.length; i++) 
						if (result.tracks[i].uri == thisSongUri)
							position = i;
					
					if (position>=0) {
						msg('track at pos '+i);
						for (var i = 1; i < result.tracks.length; i++) {
							var tp = (i+position) % result.tracks.length;
							var tr = result.tracks[tp];
							_tracks.splice(insertPoint, 0, tr.id);
							msg(insertPoint + '<-' + tp + ' ' + tr.name);
							console.log(insertPoint + '<-' + tp + ' ' + tr.name);
							insertPoint++;
						}
					}
					else {
						msg('traccia non trovata nell\'album');
						for (var i = 0; i < result.tracks.length; i++) {
							var tr = result.tracks[i];
							if (tr.uri == thisSongUri)
								continue;
							_tracks.splice(insertPoint, 0, tr.id);
							console.log('aggiunto in posizione ' + insertPoint + ': ' + tr.name);
							msg(insertPoint + '<-' + i + ' ' + tr.name);
							insertPoint++;
						}
					}
					commands.startAt(restart_cur, restart_ms);
					msg("CURSOR="+_cursor+" INSERT"+insertPoint);
				});
			}
			spotlib.getStatus().done(s => {
				status = s;
				if (_cursor>=0) {
					restart_cur = _cursor;
					restart_ms = s.progress_ms;
				}
				spotlib.getAlbum(status.item.album.id).done(onAlbum);
			});
		}
		
		// function doP100() {
		// 	console.log('p100');
		// 	spotlib.getStatus().done(s => {
		// 		var song = s.item;
		// 		var progress = s.progress_ms;
		// 		updateSong(song);
		// 		if (_cursor>0 && _tracks[_cursor] ==song.id) {
		// 			// sto effettivamente suonando una traccia della mia lista
		// 		}
		// 		else {
		// 			// inserisco la traccia corrente in testa
		// 			if (_cursor<0) {
		// 				_tracks.splice(0,0, song.id);
		// 				_cursor = 0;
		// 			}
		// 			else 
		// 				_tracks.splice(_cursor, 0, song.id);
		// 		}

		// 		var arr = [];
		// 		for (var i = 0; i < 100; i++) {
		// 			var tr = _tracks[(_cursor + i) % _tracks.length];
		// 			arr.push(tr);
		// 		}
		// 		arr.push(silenceTrack.id);

		// 		msg('getting tracks');
		// 		Rx.Observable.from(arr)
		// 			.map(x => db.getTrack(x))
		// 			.map(x => Rx.Observable.fromPromise(x))
		// 			.mergeAll()
		// 			.map(x => x.uri)
		// 			.toArray()
		// 			.subscribe(arr => {
		// 				spotlib.playUri(arr, null, progress).done(function () { msg('fatto'); });
		// 				playingMyList = true;
		// 			});
	
		// 	});

		// }
		
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
				.always(commands.gotoNext);
	
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
					updateSong(status.item);
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
			gotoNext: gotoNext,
			gotoPrevious: gotoPrevious,
			pause: pause,
			album: album,
			//doP100: doP100,
			resume: resume,
			deleteThisSong: deleteThisSong,
			addThisSong: addThisSong,
			playProgressClick:playProgressClick,
			startAt: startAt
		}
	})();

	window.commands = commands;


	function onStatus(status) {
		if (!status|| !status.item)
			return;

		curTrack = status.item;
		var id = status.item.id;
		if (id != onStatus.lastSong) {
			if (id != silenceTrack.id) 
				playingSongSubject.next(status.item);
		}
		onStatus.lastSong = status.item.id;
		var play = status.is_playing;
		var active = (status.device) ? status.device.is_active : false;
		var dev = status.device.name;
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
		var silence = (status.item.id == silenceTrack.id);
		
		barra(status);

		// next song
		if (status.device) {
			if (silence || fineBrano) {
				playingMyList = false;
				commands.gotoNext();
			}
		}
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
		$('.bleft', b).text(
			(play ? 'P' : '!P') + ' ' 
			+ (active ? 'A' : '!A')+ ' '
			+ (playingMyList? 'L:'+_cursor : '')
		);
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


	// function nextSong() {
	// 	console.log('nextSong');
	// 	if (!_tracks || (_tracks.length == 0)) {
	// 		msg('lista tracce vuota');
	// 		return;
	// 	}
	// 	_cursor = (_cursor + 1) % _tracks.length;
	// 	msg('song cursor = ' + _cursor);
	// 	var trId = _tracks[_cursor];
	// 	db.getTrack(trId).done(tr => {
	// 		updateSong(tr);
	// 		spotlib.playUri([tr.uri, silenceTrack.uri]);
	// 		playingMyList = true;
	// 	});
	// }

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

