
var asset = (function(){
	
	var data = {
		playlists:{},
		playlistsTracks:{},
		selectedPlayLists:[],
		blacklist: [],
		spotlibProfile: {},
		updatedFromSpotify: false,
		status: {},
		curTrack: null,
		profile: {},
		scaletta:null,

	}
	var cache = {
		playlists: null,
		playlistsTracks:null,
		localDbImage: null,
		tracks:{}	
	};


	var eventListener = {};
	var transactionLevel = 0;
	
	function transaction(fun) {
		transactionLevel++;
		try {
			fun();
		} catch(e) {
			console.log(e);
		}
		transactionLevel--;
		if (transactionLevel==0) {
			transactionEnd();
		}
	}

	function transactionEnd() {

	}

	function trigger(event , ...args) {
		// console.log({trigger: {event, args}});
		if (eventListener[event]) {
			for(var fun of eventListener[event]) {
				fun.apply(asset, args);
			}
		}
	}

	var spotStatus = spotStatusRefresher(function(data) {
		asset.status = data;
	});

	spotStatus.refresh();

	return {
		get playlists() {
			return cache.playlists;
		},
		set playlists(p) {
			data.playlists = clone(p);
			cache.playlists = clone(p);
			cache.localDbImage = null;
			trigger('db-data-changed');
		},
		get playlistsTracks() {
			return cache.playlistsTracks;
		},
		set playlistsTracks(p) {
			data.playlistsTracks = clone(p);
			cache.playlistsTracks = clone(p);
			cache.localDbImage = null;
			trigger('db-data-changed');
		},
		setPlaylistsTrack: function(plId, p) {
			data.playlistsTracks[plId] = clone(p);
			cache.playlistsTracks[plId] = clone(p);
			cache.localDbImage = null;
			trigger('db-data-changed');
		},
		set blacklist(v) {
			data.blacklist = clone(v);
			cache.localDbImage = null;
			trigger('db-data-changed');
		},
		get blacklist() {
			return clone(data.blacklist);
		},
		set profile(p) {
			data.profile=clone(p);
		},
		get profile() {
			return clone(data.profile);
		},
		get localDbImage() {
			if (!cache.localDbImage) {
				console.log(`compute localDbImage`);
				cache.localDbImage =  {
					playlists: clone(data.playlists),
					playlistsTracks: clone(data.playlistsTracks),
					selectedPlayLists: clone(data.selectedPlayLists),
					blacklist: clone(data.blacklist),
					scaletta: clone(data.scaletta) 
				};
			}
			return cache.localDbImage;
		},
		get selectedPlayLists() {
			return clone(data.selectedPlayLists);
		},
		set selectedPlayLists(v) {
			data.selectedPlayLists = clone(v);
			cache.localDbImage = null;
		},
		get status()  {
			return data.status;
		},
		set status(s) {
			if (!s)
				return;

			//console.log('set status');
			var oldItemId = (data.status && data.status.item) ? data.status.item.id : null;
			data.status = s;
			data.curItem = s.item;
			trigger('play-status', s);
			if (s.item && s.item.id &&  (oldItemId!=s.item.id))
				trigger('track-changed');			
			

		},
		get curItem() {
			return data.curItem;
		},
		get _debug_data() {
			return data;
		},
		on: function(event, listener) {
			if(!eventListener[event])
				eventListener[event] = [];
			eventListener[event].push(listener);
		},
		refreshStatus: function(delay) {
			return spotStatus.refresh(delay);
		},
		getTrack:async function(id) {
			if (!cache.tracks[id])
				cache.tracks[id] = await spotlib.getTrackById(id);
			return cache.tracks[id];
			
		},
		set scaletta(v) {
			data.scaletta = clone(v);
			cache.localDbImage = null;
			trigger('db-data-changed');
		},
		get scaletta() {
			return data.scaletta;
		},

	}
})();

asset.on('db-data-changed', function(value) {
	db2.set(asset.localDbImage);
	console.log('db-data-changed, db2 written');
});


async function updatePlaylistFromSpotify(pl, shadow) {
	try {
		msg('upd '+pl.name);
		var id = pl.id;
		var arr = await spotlib.getPlaylistTracks(pl);
		arr = arr.filter(x=> x && x.track);
		arr = arr.map(x=>x.track).map(x=>({
			id: x.id,
			name:x.name,
			uri:x.uri,
			artist:x.artists.map(a=>a.name).join(','),
			album:x.album.name
		}));
			

		shadow.playlists[id] = {
			name:pl.name,
			id:pl.id,
			owner: { id:pl.owner.id},
			uri:pl.uri,
			href: pl.href,
			collaborative:pl.collaborative,
			snapshot_id:pl.snapshot_id

		};
		shadow.playlistsTracks[id] = arr;
	}catch(e) {
		debugger;
		console.log(e);
	}
}

async function updateAssetFromSpotify() {
	var tmp = await spotlib.getPlaylists(); 
	var spotifyPlaylists = tmp.items; 
	var promises = [];
	var shadow = {
		playlists: clone(asset.playlists) || {},
		playlistsTracks: clone(asset.playlistsTracks) || {}
	}

	var changed = false;
	for (var sList of spotifyPlaylists) {
		var aList = shadow.playlists[sList.id];
		if (!aList || (aList.snapshot_id!=sList.snapshot_id)) {
			// if (aList) 
			// 	msg('OLD '+aList.name+'\n'+aList.snapshot_id);
			// else
			// 	msg('OLD'+sList.name+' non presente');
			// msg('NEW '+sList.name+'\n'+sList.snapshot_id);
			//msg(sList.name);
			promises.push(updatePlaylistFromSpotify(sList, shadow));
			changed = true;
		}
	}

	await Promise.all(promises);
	var deleted = false;

	for(var id in shadow.playlists) {
		var pl = shadow.playlists[id];
		var present = spotifyPlaylists.filter(x=>x.id==id).length>0;
		if (!present) {
			console.log('cancello la playlist '+pl.name+' '+pl.id+'  perchè non è più presente su spotify');
			delete shadow.playlistsTracks[id];
			delete shadow.playlists[id];
			deleted = true;
		}
	}	

	if (changed || deleted) {
		console.log('aggiorno asset.playlists');
		asset.playlists = shadow.playlists;
		asset.playlistsTracks = shadow.playlistsTracks;
	}
	console.log('updateAssetFromSpotify DONE');
	msg("spotify sync'ed");
}


async function updateAssetFromDB() {
	var d = await db2.get();
	if (d && d.playlists) 
		asset.playlists = clone(d.playlists);
	if (d && d.playlistsTracks) 
		asset.playlistsTracks = clone(d.playlistsTracks);
	if (d && d.selectedPlayLists) 
		asset.selectedPlayLists = clone(d.selectedPlayLists);
	if (d && d.blacklist) 
		asset.blacklist = clone(d.blacklist);
	if (d && d.scaletta) 
		asset.scaletta = clone(d.scaletta);
}

function resetSpotifyData() {
	asset.playlists = {};
	asset.playlistsTracks = {};
	updateAssetFromSpotify();
}