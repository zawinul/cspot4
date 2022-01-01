const {makeObservable, observable, action, autorun, computed, reaction, runInAction,makeAutoObservable,toJS } = mobx;

var asset = (function() {

	var data = {
		// data
		_playlists:{},
		_playlistsTracks:{},
		selectedPlayLists:[],
		blacklist: [],
		spotlibProfile: {},
		updatedFromSpotify: false,
		
		time:0,
		playStatus:{},
		curItemId:null,
		curItem:null,
		setPlayStatus:function(data) {
			if (!data) {
				console.log('caso strano: setPlayStatus(null)');
				return;
			}
			this.playStatus=data;
			this.curItem = data.item;
			this.curItemId = data.item ? data.item.id:null;
			//console.log('asset.setplaystatus '+this.curItemId);
		},

		refreshStatus:function(delay) {
			spotStatus.refresh(delay);
		},

		set playlists(p) {
			this._playlists = p;
		},
		get playlists() {
			console.log(`get playlists`);
			return toJS(this._playlists);
		},
		get playlistsTracks() {
			console.log(`get playlistsTracks`);
			return toJS(this._playlistsTracks);
		},
		set playlistsTracks(t){
			this._playlistsTracks = t;
		},
		get localDbImage() {
			console.log(`get localDbImage`);
			var ret =  {
				playlists: toJS(this.playlists),
				playlistsTracks: toJS(this.playlistsTracks),
				selectedPlayLists: toJS(this.selectedPlayLists),
				blacklist: toJS(this.blacklist)
			};
			console.log(ret);
			return ret;
		},
		get tracks() {
			console.log('compute asset.tracks');
			var ret = [], ll = toJS(this.playlistsTracks);
			for(var plid in ll) 
				for(var tr of ll[plid]) 
					ret.push(tr);
				
			
			return ret;
		},

		get trackPlaylists() {
			console.log(`get trackPlaylists()`);
			var ret = [];
			for(var plId in this.playlistsTracks) {
				for(var trackId in this.playlistsTracks[plId]) {
					if (!ret[trackId])
						ret[trackId] = [];
					ret[trackId].push(plId);
				}
			}
			console.log(`get trackPlaylists DONE`);
			return ret;
		}

	}

	// var asset = makeAutoObservable(data);

	var asset = makeObservable(data, {
		_playlists: observable,
		_playlistsTracks:observable,
		selectedPlayLists: observable.deep,
		time: observable,
		playStatus:observable,
		curItemId:observable,
		curItem:observable.struct,
		blacklist:observable.struct,
		updatedFromSpotify:observable,
		spotlibProfile:observable.struct,

		setPlayStatus:action.bound,
		playlists:computed,
		playlistsTracks:computed,
		trackPlaylists:computed,
		tracks: computed,
		localDbImage:computed.struct
	});

	
	
	var spotStatus = spotStatusRefresher(function(data) {
		asset.setPlayStatus(data);
	});

	spotStatus.refresh();
	
	return asset;
})();

var assetOnCount = {};

asset.on=function(eventname, fun) {
	var cnt = assetOnCount[eventname] 
		? ++assetOnCount[eventname]
		: (assetOnCount[eventname]=1);

	var askfun;
	var id = eventname+cnt;
	console.log('init on '+id);
	if (eventname=='play-status')
		askfun = ()=>asset.playStatus;
	else if (eventname=='track-changed')
		askfun = ()=>asset.curItem;
	else if (eventname=='blacklist-changed')
		askfun = ()=>asset.blacklist;
	else if (eventname=='db-data-changed')
		askfun = ()=>asset.localDbImage;
	else {
		alert('eventname non riconosciuto: ['+eventname+']');
		return;
	}
	return reaction(askfun, function(value, previousValue, reaction) {
		console.log('reaction '+reaction.name_);
		fun(value, previousValue, reaction);
	}, { name: id});
		
}

asset.on('blacklist-changed', computeBlacklistMap);
asset.on('db-data-changed', function(value) {
	console.log('db-data-changed');
	var d = {
		playlists: toJS(asset.playlists),
		playlistsTracks: toJS(asset.playlistsTracks),
		selectedPlayLists: toJS(asset.selectedPlayLists),
		blacklist: toJS(asset.blacklist)
	}
	//debugger;
	db2.set(d);
});

autorun(
	function(reaction) {
		var x=asset;
		console.log({somethingChanged:reaction});
	}
);

// function addPlayStatusListener(fun) {
// 	return reaction(
// 		()=>asset.playStatus, 
// 		function(value, previousValue, reaction) {
// 			//console.log({theReaction: {value, previousValue, reaction}});
// 			fun(value);
// 		}
// 	);	
// }

async function updatePlaylistFromSpotify(pl, shadow) {
	msg('upd '+pl.name);
	var id = pl.id;
	var arr = await spotlib.getPlaylistTracks(pl);
	arr = arr.map(x=>semplifica(x, "id,name"));
	shadow.playlists[id] = pl;
	shadow.playlistsTracks[id] = arr;
}

async function updateAssetFromSpotify() {
	var tmp = await spotlib.getPlaylists(); 
	var spotifyPlaylists = tmp.items; 
	var promises = [];
	var shadow = {
		playlists: toJS(asset.playlists),
		playlistsTracks: toJS(asset.playlistsTracks)
	}
	var changed = false;
	for (var sList of spotifyPlaylists) {
		var aList = shadow.playlists[sList.id];
		if (!aList || (aList.snapshot_id!=sList.snapshot_id)) {
			if (aList)
				msg('OLD '+aList.name+'\n'+aList.snapshot_id);
			else
				msg('OLD'+sList.name+' non presente');
			msg('NEW '+sList.name+'\n'+sList.snapshot_id);
			promises.push(updatePlaylistFromSpotify(sList, shadow));
			changed = true;
		}
	}


	await Promise.all(promises);
	runInAction(function(){
		var deleted = false;		
		for(var id in shadow.playlists) {
			var pl = shadow.playlists[id];
			var present = spotifyPlaylists.filter(x=>x.id==id).length>0;
			if (!present) {
				console.log('cancello la playlist '+pl.name+' perchè non è più presente su spotify');
				delete shadow.playlistsTracks[id];
				delete shadow.playlists[id];
				deleted = true;
			}
		}	

		if (changed || deleted) {
			console.log('aggiorno asset.playlists');
			runInAction(function(){
				asset.playlists = shadow.playlists;
				asset.playlistsTracks = shadow.playlistsTracks;
	
			});
		}
	});
	console.log('updateAssetFromSpotify DONE');
}


async function updateAssetFromDB() {
	var d = await db2.get();
	runInAction(function(){
		if (d && d.playlists) 
			asset.playlists = d.playlists;
		if (d && d.playlistsTracks) 
			asset.playlistsTracks=d.playlistsTracks;
		if (d && d.selectedPlayLists) 
			asset.selectedPlayLists=d.selectedPlayLists;
	});
}

var blacklistMap = {};
function computeBlacklistMap() {
	console.log('compute blacklist map');
	blacklistMap = {};
	for(var t of asset.blacklist)
	blacklistMap[t] = true;
	return blacklistMap;
}

//findAssetDbData();

