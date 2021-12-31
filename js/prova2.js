var prova2Initialized = $.Deferred();
var me;
var commands;
var div;

var resetNeeded = false;
var silenceTrackId = '1nKY2o8XQG1RvUCpBV5VSK';

var silenceTrack;
var _tracks = null, _cursor = -1;
var timerPeriod = 5000;
var curTrack;

function prova2() {

	resetNeeded = location.href.indexOf('reset') >= 0;
	var playingMyList = false;

	async function initialize() {
		try {
			$('.app').hide(1);

			await db2.isReady;
			await spotlib.init();
			//.then(startNoSleep)
			var d = await initializeDevice()
			msg('D=' + d.name);

			me = await spotlib.getProfile();
			asset.spotlibProfile = me;
			loadCss();
			//await initializeLists();

			updateAssetFromDB();
			await initializePage();
			//timerFun();

			await getSilenceTrack();

			//	spotStatus.addListener(onStatus);
			asset.on('play-status', onStatus);
			setTimeout(function(){
				console.log('calling updatePlaylistFromSpotify');
				updateAssetFromSpotify();
			}, 5000);


			asset.on('track-changed', updateSong);
			asset.on('track-changed', x => msg(x.name).css({ backgroundColor: 'white' }));
			updateSong();
			msg('initialize done');
			prova2Initialized.resolve();

		}catch(e) {
			debugger;
			console.log({initError: e});
		}
	}

	function updateSong() {
		var song = asset.curItem;
		if (!song) {
			console.log('waiting for status');
			return setTimeout(updateSong, 1000);
		}
		if (playingMyList) {
			var found = false;
			msg('search ' + song.id);
			for (var i = 0; i < _tracks.length; i++) {
				let x = _tracks[i];
				if (x == song.id) {
					_cursor = i;
					msg('' + i).css({ fontSize: 24, textAlignment: 'center', fontWeight: 'bold' });
					found = true;
					break;
				}
			}
			if (!found)
				msg('synch not found');
		}
		showSong(song);
	}
	window.updateSong = updateSong;
	
	function showSong(song) {

		$(".titolo", div).text(song.name);
		$(".artist", div).text(song.artists[0].name);
		$(".album", div).text("from: " + song.album.name);

		$('body').css({ backgroundImage: 'url("' + song.album.images[0].url + '")' });

		var arr = asset.trackPlaylists[song.id];
		if (arr && arr.length >= 1) {
			var pl = arr[0];
			//$(".playlist", div).text("playlist: " + pl.name + ' (' + (pl.owner.display_name || pl.owner.id) + ')');
			$(".playlist", div).text("playlist: " + pl.name);
		}
		else
			$(".playlist", div).text("playlist: ---");
	}

	function getSilenceTrack() {
		var p = spotlib.getTrackById(silenceTrackId);
		return p.then(s => silenceTrack = s);
	}

	// async function initializeLists() {

	// 	var d = $.Deferred();
	// 	var oldDbPlaylists = asset.playlists;
	// 	//show(oldDbPlaylists, 'oldDbPlaylists');


	// 	var livePlaylists = await spotlib.getPlaylists();
	// 	livePlaylists = livePlaylists.items;
	// 	//show(livePlaylists, 'livePlaylists');

	// 	//livePlaylists.then(x=>console.log({livePlaylists_x:x})); 
	// 	asset.setPlaylists(livePlaylists);

	// 	var selectedPlaylists = await choosePlaylists(livePlaylists);
	// 	//show(selectedPlaylists, 'selectedPlaylists');

	// 	//var readyPlaylistsIds = Promise.all([selectedPlaylists, oldDbPlaylists])
	// 	async function p(selected, stored) {
	// 		//show(selected, 'selected');
	// 		//show(stored, 'stored');
	// 		function isChanged(x) {
	// 			var found = _.find(stored, y => y.id == x.id);
	// 			if (!found)
	// 				return true;
	// 			x.old_snapshot_id = found.snapshot_id;
	// 			var ret = (found) ? x.old_snapshot_id != x.snapshot_id : true;
	// 			if (ret)
	// 				console.log('CHANGED ' + !!found + ' ' + x.name + ' [' + x.old_snapshot_id + '] [' + x.snapshot_id + ']');
	// 			return ret;
	// 		}

	// 		var r = [];
	// 		for (var i = 0; i < selected.length; i++) {
	// 			let list = selected[i];
	// 			let changed = isChanged(list);
	// 			if (resetNeeded || changed) {
	// 				msg('chg ' + list.name);
	// 				r[i] = await db.updatePlaylist(list);
	// 			}
	// 			else {
	// 				msg('NOT chg ' + list.name);
	// 				r[i] = list;
	// 			}
	// 		}

	// 		//show(r.map(x=>x.name), 'pre-update');
	// 		//return Promise.all(r).then(x=>x.map(pl=>pl.id));
	// 		var idList = r.map(pl => pl.id);
	// 		return idList;
	// 	}
	// 	//debugger;
	// 	var readyPlaylistsIds = await p(selectedPlaylists, oldDbPlaylists);
	// 	//show(readyPlaylistsIds, 'readyPlaylistsIds');
	// 	var trackIdArrays = readyPlaylistsIds.map(x=>asset.playlistsTracks[x]);
	// 	var arr = [];
	// 	trackIdArrays.map(array=>array.map(x=>arr.push(x)));

	// 	var ok = arr.filter(x => !blacklistMap[x]);
	// 	var filt = arr.filter(x => blacklistMap[x]);
	// 	msg("BL: ok=" + ok.length + " no:" + filt.length)
	// 		.css({ backgroundColor: 'black', color: 'white' });

	// 	_tracks = _.flatten(ok);
	// 	scramble(_tracks);
	// 	_cursor = -1;
	// 	d.resolve();

	// 	return d;
	// }




	function initializePage() {
		var d = $.Deferred();
		div = $('<div/>').addClass('prova2-container');
		$('.prova2').hide();
		div.load('prova2.html', {}, onLoad);
		function onLoad() {
			function onResize() {
				$('.play-progress').css({ top: $(window).height() - 30 });
			}

			div.on('click', '.button', function () {
				$(this).css('opacity', 0).animate({ opacity: 1 }, 500);
			});
			setTimeout(function () {
				$('.info-container', div).click(function () {
					//debugger;
					if (playingMyList)
						spotlib.playNext();
					else
						commands.startAt(0, 0);
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

	commands = (function () {

		function gotoNext() {
			if (playingMyList)
				spotlib.playNext();
			else
				commands.startAt(0, 0);
		}

		function gotoPrevious() {
			if (playingMyList)
				spotlib.playPrevious();
			else
				commands.play(0, 0);
		}


		function pause() {
			spotlib.pause();
		}

		function startAt(cur, time) {
			_cursor = (cur >= 0) ? cur : 0;
			time = time || 0;
			msg('start@' + _cursor + ':' + time).css({ color: 'yellow', backgroundColor: 'black' });

			var arr = [];
			for (var i = 0; i < 100; i++)
				arr.push(_tracks[(_cursor + i) % _tracks.length]);
			arr.push(silenceTrackId);

			//msg('getting tracks');

			// Rx.Observable.from(arr)
			// 	.map(spotlib.getTrackById)
			// 	.map(x => Rx.Observable.fromPromise(x))
			// 	.mergeAll()
			// 	.map(x => x.uri)
			// 	//.map(x => {msg(x); return x})
			// 	.toArray()
			// 	.subscribe(arr => {
			// 		msg("play at" + _cursor + ' N=' + arr.length).css({ backgroundColor: '#c0ffc0' });
			// 		console.log({ arr: arr });
			// 		spotlib.playUri(arr, null, time).done(function () { msg('fatto'); });
			// 		playingMyList = true;
			// 	});
		}

		function album() {
			var status;
			var restart_ms;
			var restart_cur;
			function onAlbum(album) {
				var thisSongUri = status.item.uri;
				var insertPoint = _cursor + 1;
				var ids = album.tracks.items.map(x => x.id);
				spotlib.getTracksById(ids).done(result => {
					if (result.tracks.length <= 1) {
						msg("nothing to do");
						return;
					}

					var position = -1;
					for (var i = 0; i < result.tracks.length; i++)
						if (result.tracks[i].uri == thisSongUri)
							position = i;

					if (position >= 0) {
						msg('track at pos ' + i);
						for (var i = 1; i < result.tracks.length; i++) {
							var tp = (i + position) % result.tracks.length;
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
					msg("CURSOR=" + _cursor + " INSERT" + insertPoint);
				});
			}
			spotlib.getStatus().done(s => {
				status = s;
				if (_cursor >= 0) {
					restart_cur = _cursor;
					restart_ms = s.progress_ms;
				}
				spotlib.getAlbum(status.item.album.id).done(onAlbum);
			});
		}


		function resume() {
			// $('.b-resume').hide();
			// $('.b-pause').show();
			spotlib.resume();
		}

		async function deleteThisSong() {
			var tr, trId;
			var status = await spotlib.getStatus();
			tr = status.item;
			trId = tr.id;

			commands.gotoNext();

			var plists = asset.trackPlaylists[trId];
			var delPromises = plists.map(pl => delFrom(pl));
			await  $.when.apply($, delPromises);
			msg('DONE');
			commands.gotoNext();
			var nDeleted=0;
			var nFound=0;
			function delFrom(pl) {
				console.log('DELETE FROM ')
				console.log({ deleteFrom: { pl: pl, tr: tr } });
				var ret = $.Deferred();
				if (me.id != pl.owner.id)
					return insertInBlacklist(pl, tr);
				nFound++;
				var question = 'cancella ' + tr.name.toUpperCase() + ' da ' + pl.name.toUpperCase() + ' ?';
				popup.confirm(question).then(reply => {
					if (!reply) {
						ret.resolve();
					}
					else {
						spotlib.deleteFromPlaylist(pl.id, tr.uri)
							.done(function (result) {
								console.log({ result: result });
								msg('>> del OK');
								nDeleted++;

							})
							.always(() => ret.resolve());
					}
				})
				return ret;
			}

			function insertInBlacklist(pl, tr) {
				if (asset.blacklistMap[tr.id]) {
					//popup.alert(pl.name.toUpperCase() + " è già in black list");
					return Promise.resolve();
				}
				var question = "Non sei l'owner di " + pl.name.toUpperCase() + ".\n\nVuoi mettere " + tr.name.toUpperCase() + " in Black List ?";
				return popup.confirm(question).then(reply => {
					if (reply) {
						mob.runInAction(()=>asset.blacklist.push(tr.id) = true);
					}
				});
			
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
					//updateSong();
					var x = evt.originalEvent.clientX;
					if (!status.is_playing)
						return;
					if (!status.device)
						return;
					var t = status.item.duration_ms * x / $('.play-progress').width();
					console.log('seek ' + t);
					spotlib.seek(t).then(function () {
						asset.refreshStatus(100);
					});
				}
				catch (e) { }
			});
		}

		return {
			gotoNext: gotoNext,
			gotoPrevious: gotoPrevious,
			pause: pause,
			album: album,
			//doP100: doP100,
			resume: resume,
			deleteThisSong: deleteThisSong,
			addThisSong: addThisSong,
			playProgressClick: playProgressClick,
			startAt: startAt
		}
	})();

	window.commands = commands;
	function statuslog(x) {
		//console.log(x);
	}

	function onStatus(status) {
		statuslog("O N   S T A T U S");
		if (!status || !status.item)
			return;

		//console.log(JSON.stringify(status));
		curTrack = status.item;
		var id = status.item.id;

		onStatus.lastSong = status.item.id;
		var play = status.is_playing;
		var active = (status.device) ? status.device.is_active : false;
		var dev = status.device.name;
		var p = status.timestamp - status.progress_ms;

		$('.buttons .b-resume').toggleClass('hidden', play);
		$('.buttons .b-pause').toggleClass('hidden', !play);


		// certe volte il player rimane in playing anche se il brano è finito
		var fineBrano = status.progress_ms > 0 && status.progress_ms == status.item.duration_ms;

		// se il brano corrente è il "silence" siamo in pausa
		var silence = (status.item.id == silenceTrackId);

		barra(status);

		// next song
		if (status.device) {
			if (silence || fineBrano) {
				playingMyList = false;
				commands.gotoNext();
			}
		}
	};

	function loadCss() {
		$('<link>').appendTo('head').attr({ type: 'text/css', rel: 'stylesheet', href: 'css/prova2.css' });
	}

	function barra(status) {
		var play = status.is_playing;
		var songlen = status.item.duration_ms;
		var active = (status.device) ? status.device.is_active : false;
		var b = $('.play-progress');
		var w = b.width();
		$('.barra-w, .barra-b', b).width(b.width());
		$('.bleft', b).text(
			(play ? 'P' : '!P') + ' '
			+ (active ? 'A' : '!A') + ' '
			+ (playingMyList ? 'L:' + _cursor : '')
		);
		$('.bmiddle', b).text(moment.utc(status.progress_ms).format("mm:ss")
			+ ' ' + Math.floor(status.progress_ms / (songlen + 1) * 10000) / 100 + '%'
		);

		$('.bright', b).text(moment.utc(songlen).format("mm:ss"));

		// barra
		var barradiv = $('.play-progress .barra-meter');
		if (!play || status.progress_ms <= 0 || songlen <= 0)
			barradiv.stop().animate({ width: 0 }, 100);
		else {
			var bfrom = w * status.progress_ms / songlen
			var bto = w;
			var curwidth = barradiv.width()
			statuslog({ bfrom, bto, curwidth, prog: status.progress_ms, len: songlen });
			var anTime = songlen - status.progress_ms;
			if (Math.abs(bfrom - curwidth) > 10) {
				statuslog('necessario aggiustamento ' + anTime / 1000);
				barradiv.stop();
				barradiv.css({ width: bfrom, backgroundColor: '#ff0000' })
				barradiv.animate({ width: bto, backgroundColor: '#000000' }, { duration: anTime, easing: 'linear' });
			}
			else {
				statuslog('liscio');
				barradiv.stop().animate({ width: bto }, { duration: anTime, easing: 'linear' });
			}
		}
	}


	var loopSong = function () {
		var state = a;
		var msStart, msEnd, songStart, timeout;

		function a() {
			msStart = (new Date()).getTime();
			songStart = spotlib.getStatus().then(status => status.progress_ms);
			state = b;
			$('.b-loop').attr('data-state', 'b');
		}

		function b() {
			msEnd = (new Date()).getTime();
			songStart.then(ms => spotlib.seek(ms));
			timeout = setTimeout(t, msEnd - msStart);
			state = c;
			$('.b-loop').attr('data-state', 'c');
		}

		function c() {
			state = a;
			$('.b-loop').attr('data-state', 'a');
		}

		function t() {
			if (state === c) {
				songStart.then(ms => spotlib.seek(ms));
				timeout = setTimeout(t, msEnd - msStart);
			}
			else
				timeout = null;
		}

		return function () {
			state.apply(this, arguments);
		}
	}();
	window.loopSong = loopSong;

	initialize();
}


$(() => main.started.then(prova2));

