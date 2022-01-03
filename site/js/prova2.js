var prova2Initialized = $.Deferred();
var me;
var commands;
var div;

var resetNeeded = false;
var silenceTrackId = '1nKY2o8XQG1RvUCpBV5VSK';

var silenceTrack;
var timerPeriod = 5000;
var curTrack;

var songTimeStart, songLength, songPlaying=false;
var selectedTracks = [];

function prova2() {

	resetNeeded = location.href.indexOf('reset') >= 0;

	async function initialize() {
		try {
			$('.app').hide(1);

			await db2.isReady;
			await spotlib.init();
			//.then(startNoSleep)
			var d = await initializeDevice()
			msg('D=' + d.name);

			me = await spotlib.getProfile();
			asset.profile = me;
			loadCss();
			//await initializeLists();

			await updateAssetFromDB();
			await initializePage();
			//timerFun();

			silenceTrack = await asset.getTrack(silenceTrackId);


			//	spotStatus.addListener(onStatus);
			asset.on('play-status', onStatus);
			setTimeout(function(){
				console.log('calling updatePlaylistFromSpotify');
				updateAssetFromSpotify();
			}, 5000);


			asset.on('track-changed', updateSong);
			asset.on('track-changed', function() {
				if (asset.curItem) 
					msg(asset.curItem.name).css({ backgroundColor: 'white' });
			});
			asset.refreshStatus();
			updateSong();
			msg('version "'+CSPOT4_VERSION+'" initialized!');
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
		showSong(song);
	}
	
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

	function getSelectedTracks() {
		var arr = asset.selectedPlayLists;
		selectedTracks = [];
		var pt = asset.playlistsTracks;
		for(plid of arr) 
			for(tr of pt[plid])	
				selectedTracks.push(tr);
	}

	var lastPlayRandomAndSilence = 0;
	async function playRandomAndSilence(n) {
		if (!n)
			n=1;
		var t = now();
		if (t-lastPlayRandomAndSilence < 5000)
			return;
		lastPlayRandomAndSilence = t;
		for(var i=0; i<n; i++) {
			var tr = selectedTracks[Math.floor(Math.random()*selectedTracks.length)];
			await spotlib.addToQueue(tr.uri);
			if (i==0)
				await spotlib.playNext();
		}
		await spotlib.addToQueue(silenceTrack.uri);
		lastPlayRandomAndSilence = t;
		asset.refreshStatus();
	}

	function initializePage() {
		var d = $.Deferred();
		div = $('<div/>').addClass('prova2-container');
		$('.prova2').hide();
		//div.load('prova2.html', {}, onLoad);
		$.get('prova2.html').then(function(txt){
			div.html(txt);
			onLoad();
		});
		function onLoad() {
			function onResize() {
				$('.play-progress').css({ top: $(window).height() - 30 });
			}

			div.on('click', '.button', function () {
				$(this).css('opacity', 0).animate({ opacity: 1 }, 500);
			});
			setTimeout(function () {
				$('.info-container', div).click(function () {
					spotlib.playNext().then(asset.refreshStatus);
				});
				$('.b-prev').click(commands.gotoPrevious);
				$('.b-backward').click(commands.backward);
				$('.b-delete').click(commands.deleteThisSong);
				$('.b-add').click(commands.addThisSong);
				$('.b-pause').click(commands.pause);
				$('.b-resume').click(commands.resume);
				$('.b-album').click(commands.album);
				$('.b-random').click(commands.random);
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
			spotlib.playNext().then(asset.refreshStatus);
		}

		function gotoPrevious() {
			console.log('goto previous');
			var ms = asset.status ? asset.status.progress_ms : 0;
			if (!ms || ms>5000)
				spotlib.seek(0).then(asset.refreshStatus);
			else
				spotlib.playPrevious().then(asset.refreshStatus);
			asset.refreshStatus();
		}

		function backward() {
			if (songPlaying) {
				var pos = now()-songTimeStart;
				var ms = pos>5000 ? pos-5000 : 0;
				spotlib.seek(ms).then(asset.refreshStatus);
			}
		}

		
		function forward() {
			if (songPlaying) {
				var pos = now()-songTimeStart;
				var limit = songLength -1000;
				var ms = pos+5000 <  limit ? pos+5000 : limit;
				spotlib.seek(ms).then(asset.refreshStatus);
			}
		}

		function pause() {
			spotlib.pause();
		}


		function album() {
			// var status;
			// var restart_ms;
			// var restart_cur;
			// function onAlbum(album) {
			// 	var thisSongUri = status.item.uri;
			// 	var insertPoint = _cursor + 1;
			// 	var ids = album.tracks.items.map(x => x.id);
			// 	spotlib.getTracksById(ids).done(result => {
			// 		if (result.tracks.length <= 1) {
			// 			msg("nothing to do");
			// 			return;
			// 		}

			// 		var position = -1;
			// 		for (var i = 0; i < result.tracks.length; i++)
			// 			if (result.tracks[i].uri == thisSongUri)
			// 				position = i;

			// 		if (position >= 0) {
			// 			msg('track at pos ' + i);
			// 			for (var i = 1; i < result.tracks.length; i++) {
			// 				var tp = (i + position) % result.tracks.length;
			// 				var tr = result.tracks[tp];
			// 				scaletta.splice(insertPoint, 0, tr.id);
			// 				msg(insertPoint + '<-' + tp + ' ' + tr.name);
			// 				console.log(insertPoint + '<-' + tp + ' ' + tr.name);
			// 				insertPoint++;
			// 			}
			// 		}
			// 		else {
			// 			msg('traccia non trovata nell\'album');
			// 			for (var i = 0; i < result.tracks.length; i++) {
			// 				var tr = result.tracks[i];
			// 				if (tr.uri == thisSongUri)
			// 					continue;
			// 				scaletta.splice(insertPoint, 0, tr.id);
			// 				console.log('aggiunto in posizione ' + insertPoint + ': ' + tr.name);
			// 				msg(insertPoint + '<-' + i + ' ' + tr.name);
			// 				insertPoint++;
			// 			}
			// 		}
			// 		//commands.startAt(restart_cur, restart_ms);
			// 		msg("CURSOR=" + _cursor + " INSERT" + insertPoint);
			// 	});
			// }
			// spotlib.getStatus().done(s => {
			// 	status = s;
			// 	if (_cursor >= 0) {
			// 		restart_cur = _cursor;
			// 		restart_ms = s.progress_ms;
			// 	}
			// 	spotlib.getAlbum(status.item.album.id).done(onAlbum);
			// });
		}

		async function random() {
			let { arr, ok} = await choosePlaylists();
			if (!ok)
				return;
			if (arr.length==0) {
				alert('non hai selezionato neanche una playlist');
				return;
			}
			asset.selectedPlayLists = arr;
			getSelectedTracks();
			await playRandomAndSilence();
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
				if (asset.blacklist.indexOf(tr.id)>=0) {
					//popup.alert(pl.name.toUpperCase() + " è già in black list");
					return Promise.resolve();
				}
				var question = "Non sei l'owner di " + pl.name.toUpperCase() + ".\n\nVuoi mettere " + tr.name.toUpperCase() + " in Black List ?";
				return popup.confirm(question).then(reply => {
					if (reply) {
						var a = asset.blacklist;
						a.push(tr.id);
						asset.blacklist = a;
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
			gotoNext,
			gotoPrevious,
			pause,
			album,
			random,
			//doP100: doP100,
			resume,
			deleteThisSong,
			addThisSong,
			playProgressClick,
			backward,
			forward
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
		var play = songPlaying = status.is_playing;
		var active = (status.device) ? status.device.is_active : false;
		var dev = status.device.name;
		var p = status.timestamp - status.progress_ms;

		if (songPlaying) {
			songTimeStart = now()-status.progress_ms;
			songLength = status.item.duration_ms;
		}

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
				playRandomAndSilence();
			}
		}
	};

	function loadCss() {
		$('<link>').appendTo('head').attr({ type: 'text/css', rel: 'stylesheet', href: 'css/prova2.css' });
	}

	function updateProgress() {
		var txt = '';
		if (songPlaying) {
			var pos = now()-songTimeStart;
			var txt1 = moment.utc(pos).format("mm:ss");
			var r = pos/songLength;
			r = r>1 ? 1 : (r<0 ? 0 : r);
			var txt2 = (r*100).toFixed(1) + '%';
			txt = txt1+' - '+txt2;
		}
		$('.play-progress .bmiddle').text(txt);
	}
	setInterval(updateProgress, 100);

	function barra(status) {
		var play = status.is_playing;
		var songlen = status.item.duration_ms;
		var active = (status.device) ? status.device.is_active : false;
		var b = $('.play-progress');
		var w = b.width();
		$('.barra-w, .barra-b', b).width(b.width());
		$('.bleft', b).text(
			(play ? 'P' : '!P') + ' '
			+ (active ? 'A' : '!A')
		);
		// $('.bmiddle', b).text(moment.utc(status.progress_ms).format("mm:ss")
		// 	+ ' ' + Math.floor(status.progress_ms / (songlen + 1) * 10000) / 100 + '%'
		// );

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


	var loopState = 0, loopStart, loopEnd, loopTimeout = -1;;

	function loopSong() {
		if (loopState==0) {
			loopStart = now()-songTimeStart;
			loopState = 1;
			$('.button.b-loop').attr('data-state', 'b');
		}
		else if (loopState==1) {
			loopEnd = now()-songTimeStart;
			spotlib.seek(loopStart).then(asset.refreshStatus);
			loopTimeout = setTimeout(t, loopEnd - loopStart);
			loopState = 2;
			$('.button.b-loop').attr('data-state', 'c');
		}
		else if (loopState==2) {
			if (loopTimeout>=0)
				clearTimeout(loopTimeout);
			loopTimeout = -1;
			loopState = 0;
			$('.button.b-loop').attr('data-state', 'a');

		}

		function a() {
			loopStart = now()-songStart;
			state = b;
			$('.b-loop').attr('data-state', 'b');
		}

		function t() {
			if (loopState == 2) {
				spotlib.seek(loopStart).then(asset.refreshStatus);
				loopTimeout = setTimeout(t, loopEnd - loopStart);
			}
			else
				loopTimeout = -1;
		}
	};

	initialize();
}


$(() => main.started.then(prova2));

