function reloadDBTracks2(selectedPlaylists) {
	msg("RELOAD DB TRACKS");
	var ret = $.Deferred();
	var m = msg('set playlists');
	var mdone = 0;

	function get(pl) {
		changedPLaylists.then(cp=>{
			var changed = cp.filter(cplist=>cplist.id==pl.id).length>0;
			msg('ch:'+changed + ' ' + pl.name);
			var x = (changed) ? db.updatePlaylist(pl) : $.Deferred().resolve(1);
			x.done(()=>$('#'+pl.idbottone).hide());
			return x;
		});
	}

	selectedPlaylists
		.map(x=>x.name)
		.toArray()
		.toPromise()
		.then(x=>console.log('sel:'+x.join(', ')));

	selectedPlaylists
		.flatMap(get)
		.subscribe(
		() => {
			mdone++;
			m.text('set playlists ' + mdone);
			m.delay();
		},
		() => { },
		() => {
			msg('RELOADED!');
			ret.resolve();
		});
	return ret;
}

function choosePlaylists(playListsArray) {
	var ret = new Rx.ReplaySubject();
	var div = $('<div/>').appendTo('body').load('select-playlists.html', onHtmlLoaded);

	ret.map(y => y.name).toArray().map(JSON.stringify).subscribe(x => {
		localStorage.cspot2playlists = x;
	});
	
	function onHtmlLoaded() {
		var template = $('.template', div).removeClass('template');
		var container = template.parent();
		template.detach();
		var x = [];
		if (localStorage && localStorage.cspot2playlists)
			x = JSON.parse(localStorage.cspot2playlists);

		//$('.okbutton', div).click(onOkClick);
		$('.refreshbutton', div).click(onRefreshClick);
		playListsArray.map(pl => {
			var id = 'cpl'+Math.floor(Math.random()*100000000);
			var d = template.clone().appendTo(container).text(pl.name).addClass('item').attr('id',id);
			d.data('pl', pl);
			d.click(function () {
				$(this).toggleClass('selected');
			});
			pl.idbottone = id;
			d.toggleClass('selected', x.length == 0 || x.indexOf(pl.name) >= 0);
		});

	}

	function onRefreshClick() {
		$('.okbutton,.refreshbutton', '.select-playlist-div').remove();

		var s = Rx.Observable.from($('.selected', div)).map(x => $(x).data('pl'));
		reloadDBTracks2(s).done(function(){
			var s = Rx.Observable.from($('.selected', div)).map(x => $(x).data('pl'));
			s.subscribe(ret);
			div.remove();
		});
	}

	// function onOkClick() {
	// 	$('.okbutton,.refreshbutton', '.select-playlist-div').remove();
	// 	var s = Rx.Observable.from($('.selected', div)).map(x => $(x).data('pl'));
	// 	s.subscribe(ret);

	// 	div.remove();
	// };
	return ret.toArray().toPromise();
}
