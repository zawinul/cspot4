// .
async function choosePlaylists() {
	var playlists = asset.playlists;
	if (!asset.updatedFromSpotify)
		playlists = await spotlib.getPlaylists();
	
	var promResolve;
	var prom = new Promise(function(resolve, reject){
		promResolve = resolve;
	});

	var div = $('<div/>').appendTo('body')
	$.get('select-playlists.html').then(function(txt){
		div.html(txt);
		onHtmlLoaded();
	});
	
	function onHtmlLoaded() {
		var template = $('.template', div).removeClass('template');
		var container = $('.pl-container', div);
		$('.pl-all', div).click(function(){
			$('.item', div).addClass('selected');
		});
		$('.pl-none', div).click(function(){
			$('.item', div).removeClass('selected');
		});
		$('.item', div).remove();
		template.detach();
		var x = asset.selectedPlayLists;
		$('.okbutton', div).click(()=>close(true));
		$('.cancelbutton', div).click(()=>close(false));
		var l = clone(asset.playlists);
		for(var plId in l) {
			var pl = l[plId];
			var id = 'cpl'+Math.floor(Math.random()*100000000);
			var plButton = template.clone().appendTo(container).text(pl.name).addClass('item').attr('id',id);
			plButton.data('pl', plId);
			plButton.click(function () {
				$(this).toggleClass('selected');
			});
			plButton.toggleClass('selected', x.length == 0 || x.indexOf(plId) >= 0);
		}
	}

	function close(ok) {
		$('.okbutton', '.select-playlist-div').remove();
		var arr = [];
		$('.selected', div).each(function(){
			arr.push($(this).data('pl'));
		})
		promResolve({ arr, ok });
		div.remove();
	}

	var ret = await prom;
	return ret;
}
