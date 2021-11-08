// .
function choosePlaylists(playListsArray) {
	var ret = $.Deferred();
	var autoclick;

	ret.then(function(arr){
		var data = arr.map(pl=>pl.name);
		localStorage.cspot2playlists = JSON.stringify(data);
	})

	var div = $('<div/>').appendTo('body').load('select-playlists.html', onHtmlLoaded);
	
	
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
				autoclick.stop();
				$(this).toggleClass('selected');
			});
			pl.idbottone = id;
			d.toggleClass('selected', x.length == 0 || x.indexOf(pl.name) >= 0);
		});
		autoclick = visibleTimeout(8000);
		autoclick.then(onRefreshClick);
	}

	function onRefreshClick() {
		$('.okbutton,.refreshbutton', '.select-playlist-div').remove();
		var arr = [];
		$('.selected', div).each(function(){
			arr.push($(this).data('pl'));
		})
		ret.resolve(arr);
		div.remove();
	}

	function startAutoClick() {

	}

	function stopAutoClick() {

	}

	
	return ret;
}
