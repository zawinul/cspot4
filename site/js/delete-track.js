// .
async function deleteTrack(trid) {
	var promResolve;
	var prom = new Promise(function(resolve, reject){
		promResolve = resolve;
	});


	var playlists = _.values(asset.getPlaylists()).filter(function(pl) {
		try {
			if (pl.owner.id!=spotlib.getProfile().id)
				return false;
			var ptracks = asset.getPlaylistsTracks()[pl.id];
			if (!ptracks)
				return false;
			ptracks = ptracks.map(tr=>tr.id);
			if (ptracks.indexOf(trid)<0)
				return false;
			return true;	
		} catch(e) {
			debugger;
			console.log(e);
			return false;
		}
	});
	if (playlists.length==0)
		playlists.push({id: 'blacklist', name:""});

	var div = $('<div/>').appendTo('body')
	$.get('site/delete-track.html').then(function(txt){
		div.html(txt);
		onHtmlLoaded();
	});


	function onHtmlLoaded() {
		var template = $('.template', div).removeClass('template');
		var container = $('.pl-container', div);
		$('.item', div).remove();
		template.detach();
		//$('.okbutton', div).click(()=>close(true));
		$('.cancelbutton', div).click(()=>close(false, []));
		for(let pl of playlists) {
			let id = pl.id;
			let msg = id=='blacklist' ?  'Insert in blacklist' : 'Delete from '+pl.name;
			var pldiv = template.clone().appendTo(container).addClass('item selected').attr('id',id).text(msg);
			pldiv.click(function () {
				close([id]);
			});
		}
	}

	function close(arr) {
		$('.okbutton', '.delete-track-div').remove();
		promResolve({ arr, ok:true });
		div.remove();
	}

	var ret = await prom;
	return ret;
}
