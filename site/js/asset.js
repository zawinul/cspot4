
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
		scaletta:null,
	}

	var readOnlyCache = {
	};

	function readOnlyCopy(key) {
		if (!readOnlyCache[key])
			readOnlyCache[key] = clone(data[key]);
		return readOnlyCache[key];
	}

	window.assetData = data;
	window.assetRep = readOnlyCache;

	var eventListener = {};
	
	function trigger(event , ...args) {
		// console.log({trigger: {event, args}});
		if (eventListener[event]) {
			for(var fun of eventListener[event]) {
				fun.apply(asset, args);
			}
		}
	}

	var spotStatus = spotStatusRefresher(function(data) {
		asset.setStatus(data);
	});

	spotStatus.refresh();

	return {
		getPlaylists: function() {
			return readOnlyCopy('playlists');
		},
		setPlaylists(p) {
			let j = JSON.stringify(p);
			data.playlists = JSON.parse(j);
			delete readOnlyCache.playlists;
			trigger('db-data-changed');
		},
		getPlaylistsTracks: function() {
			return readOnlyCopy('playlistsTracks');
		},
		setPlaylistsTracks: function(p) {
			data.playlistsTracks = clone(p);
			delete readOnlyCache.playlistsTracks;
			trigger('db-data-changed');
		},
		setPlaylistsTrack: function(plId, p) {
			data.playlistsTracks[plId] = clone(p);
			delete readOnlyCache.playlistsTracks;
			trigger('db-data-changed');
		},
		setBlacklist: function(v) {
			data.blacklist = clone(v);
			delete readOnlyCache.blacklist;
			trigger('db-data-changed');
		},
		getBlacklist: function() {
			return readOnlyCopy('blacklist');
		},
		getSelectedPlayLists: function() {
			return readOnlyCopy('selectedPlayLists');
		},
		setSelectedPlayLists: function(v) {
			data.selectedPlayLists = clone(v);
			delete readOnlyCache.selectedPlayLists;
		},
		getStatus: function()  {
			return readOnlyCopy('status');
		},
		setStatus: function(s) {
			if (!s)
				return;

			//console.log('set status');
			var oldItemId = (data.status && data.status.item) ? data.status.item.id : null;
			data.status = s;
			data.curItem = s.item;
			delete readOnlyCache.status;
			delete readOnlyCache.curItem;

			trigger('play-status', s);
			if (s.item && s.item.id &&  (oldItemId!=s.item.id))
				trigger('track-changed');			
			
		},
		get curItem() {
			return readOnlyCopy('curItem');
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
		// getTrack:async function(id) {
		// 	if (!representation.tracks[id])
		// 		representation.tracks[id] = await spotlib.getTrackById(id);
		// 	return representation.tracks[id];
		// },
		setScaletta: function(v) {
			data.scaletta = clone(v);
			delete readOnlyCache.scaletta;
			trigger('db-data-changed');
		},
		getScaletta: function() {
			return readOnlyCopy('scaletta');
		},

	}
})();

let clouddata = {};
function cloudsend() {
	cloud.write(spotlib.profile.id, clouddata);
}
debouncedCloudSend = _.debounce(cloudsend, 3000);

var lastdbdata = {}, lastclouddata = {};
asset.on('db-data-changed', function(value) {
	//debugger;
	let pl = clone(asset.getPlaylists());
	let pt = asset.getPlaylistsTracks();
	let spl =  clone(asset.selectedPlayLists);
	let blacklist = asset.getBlacklist();
	let scaletta = clone(asset.scaletta); 

	let dbdata = {
		playlists: pl,
		playlistsTracks: pt,
		selectedPlayLists: spl,
		blacklist,
		scaletta 
	};
	if (!_.isEqual(dbdata, lastdbdata)) {
		lastdbdata = dbdata;
		db2.set(dbdata);
		console.log('db-data-changed, db2 written');
	}

	clouddata = {
		playlists: pl,
		selectedPlayLists: spl,
		blacklist,
		scaletta
	};
	if (!_.isEqual(clouddata, lastclouddata)) {
		lastclouddata = clouddata;
		debouncedCloudSend();
		console.log('db-data-changed, cloud written');
	}
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

async function updatePlaylistCache(playlists) {

	for (var sList of playlists) {
		oldsnap = await db2.getPlaylistCurrSnapshot(sList.id);
		if (oldsnap && oldsnap.snapshot_id==sList.snapshot_id) {
			console.log('playlist '+sList.name+' is up to date');
			continue;
		}
		var arr = await spotlib.getPlaylistTracks(sList);
		arr = arr.filter(x=> x && x.track);
		arr = arr.map(x=>x.track).map(x=>({
			id: x.id,
			name:x.name,
			uri:x.uri,
			artist:x.artists.map(a=>a.name).join(','),
			album:x.album.name
		}));
		db2.setPlaylistCurrSnapshot({	id:sList.id, snapshot_id:sList.snapshot_id });
		db2.setPlaylistTracks({ id:sList.id, tracks:arr });
	}


}
async function updateAssetFromSpotify() {
	var tmp = await spotlib.getPlaylists();
	updatePlaylistCache(tmp); 
	var spotifyPlaylists = tmp; 
	var promises = [];
	var shadow = {
		playlists: clone(asset.getPlaylists()) || {},
		playlistsTracks: asset.getPlaylistsTracks() || {}
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
		console.log('aggiorno asset playlists');
		asset.setPlaylists(shadow.playlists);
		asset.setPlaylistsTracks(shadow.playlistsTracks);
	}
	console.log('updateAssetFromSpotify DONE');
	msg("spotify sync'ed");
}


async function updateAssetFromDB(profile) {
	debugger;
	var d = await db2.get();
	if (d && d.playlists) 
		asset.setPlaylists(d.playlists);
	if (d && d.playlistsTracks) 
		asset.setPlaylistsTracks(d.playlistsTracks);
	if (d && d.selectedPlayLists) 
		asset.selectedPlayLists = d.selectedPlayLists;
	if (d && d.blacklist) 
		asset.setBlacklist(d.blacklist);
	if (d && d.scaletta) 
		asset.scaletta = clone(d.scaletta);
}

function resetSpotifyData() {
	asset.setPlaylists({});
	asset.setPlaylistsTracks({});
	updateAssetFromSpotify();
}