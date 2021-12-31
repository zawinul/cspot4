// .
async function choosePlaylists() {
	var playlists = asset.playlists;
	if (!asset.updatedFromSpotify)
		playlists = await spotlib.getPlaylists();
	
	var promResolve;
	var prom = new Promise(function(resolve, reject){
		promResolve = resolve;
	});

	var div = $('<div/>').appendTo('body').load('select-playlists.html', onHtmlLoaded);
	
	function onHtmlLoaded() {
		var template = $('.template', div).removeClass('template');
		var container = template.parent();
		template.detach();
		var x = asset.selectedPlayLists;
		$('.okbutton', div).click(onRefreshClick);
		$('.refreshbutton', div).click(onRefreshClick);
		for(var plId in asset.playlists) {
			var pl = asset.playlists[plId];
			var id = 'cpl'+Math.floor(Math.random()*100000000);
			var d = template.clone().appendTo(container).text(pl.name).addClass('item').attr('id',id);
			d.data('pl', plId);
			d.click(function () {
				$(this).toggleClass('selected');
			});
			d.toggleClass('selected', x.length == 0 || x.indexOf(plId) >= 0);
		}
	}
	
	function onRefreshClick() {
		$('.okbutton,.refreshbutton', '.select-playlist-div').remove();
		var arr = [];
		$('.selected', div).each(function(){
			arr.push($(this).data('pl'));
		})
		promResolve(arr);
		div.remove();
	}

	var ret = await prom;
	mobx.runInAction(()=>asset.selectedPlayLists=ret);
	return ret;
}
