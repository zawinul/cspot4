var db = (function () {

	var dbReady = $.Deferred()
	var db;
	var version = 23;

	function afterReady(f) {
		return function() {
			var t = this;
			var a = arguments;
			const f2 = () => f.apply(t,a);
			return dbReady.then(f2);
		}
	}

	function init() {
		window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: "readwrite" }; // This line should only be needed if it is needed to support the object's constants for older browsers
		window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
		msg('indexedDB: '+!!window.indexedDB);
		var request = window.indexedDB.open("cspot4", version);
		request.onerror = gestioneErrori;
		request.onsuccess = function (event) {
			db = event.target.result;
			if (!db) 
				alert('NOT DB');
			else
				dbReady.resolve();
			console.log(event);
		};
		request.onupgradeneeded = function (event) {
			msg('onupgradeneeded '+version);
			db = event.target.result;

			if (!db.objectStoreNames.contains('playlists')) {
				msg('DB create playlists');
				db.createObjectStore("playlists", { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains('tracks')) {
				msg('DB create tracks');
				db.createObjectStore("tracks", { keyPath: "id" });
			}
			// if (!db.objectStoreNames.contains('tr-pl')) 
			//  	db.deleteObjectStore('tr-pl');
			if (!db.objectStoreNames.contains('tr-pl')) {

				msg('DB create tr-pl');
				var trpl = db.createObjectStore("tr-pl", { autoIncrement : true });
				trpl.createIndex('tr', 'tr');
				trpl.createIndex('pl', 'pl');
			}
			if (!db.objectStoreNames.contains('userxp')) {
				msg('DB create userxp');
				db.createObjectStore("userxp", { keyPath: "id" });
			}
		};
	}

	function count(table) {
		var ret = $.Deferred();
		var cnt = 0;
		var transaction = db.transaction([table], "readonly");
		var objectStore = transaction.objectStore(table);
		transaction.oncomplete = function (event) {
			ret.resolve(cnt);
		};
		transaction.onerror = gestioneErrori;
		var request = objectStore.openCursor();
		request.onsuccess = function (event) {
			var cursor = event.target.result;
			if (cursor) {
				cnt++;
				cursor.continue();
			} 
		}
		return ret;
	}

	function getCounters() {
		var tables = ["playlists", "tracks", "tr-pl", "userxp"];
		const doCount = tb=> count(tb).then(cnt=>({tb:tb, cnt:cnt}));
		var counters = tables.map(doCount);
		return Promise.all(counters);
	}

	

	function getUserTrack(id, transaction) {
		var ret = $.Deferred();
		if (!transaction) {
			transaction = db.transaction(["userxp"], "readwrite");
			transaction.oncomplete = transaction.onerror = function(event) {
			};
		}
		var objectStore = transaction.objectStore("userxp");
		var req = objectStore.get(id)
		req.onsuccess = function(event) {
			if (req.result) 
				ret.resolve(req.result);
			else {
				var obj = { id:id, insertedOn: new Date().getTime(), like:0 };
				var req2 = objectStore.put(obj);

				req.onsuccess = function(event) {
					ret.resolve(obj);				
				}
			}
		}
	}

	function updatePlaylist(pl) {
		var cntdel = 0;
		function deletePlaylist(){
			var ret = $.Deferred();
			var transaction = db.transaction(["playlists"], "readwrite");
			var objectStore = transaction.objectStore("playlists");
			var request = objectStore.delete(pl.id);
			transaction.oncomplete = transaction.onerror = function(event) {
				ret.resolve();
			};
			return ret;
		}

		function deleteAssociations(){
			var ret = $.Deferred();
			var transaction = db.transaction(["tr-pl"], "readwrite");
			var objectStore = transaction.objectStore("tr-pl");
			var request = objectStore.openCursor();
			transaction.oncomplete = transaction.onerror = function(event) {
				//msg('del2 resolve '+pl.name)
				ret.resolve();
			};
			request.onsuccess = function (event) {
				var cursor = event.target.result;
				if (cursor) {
					if (cursor.value.pl==pl.id) {
						cursor.delete();
						cntdel++;
					}
					cursor.continue();
				} 
			};
			return ret;
		}

		function insertPlaylist() {
			var ret = $.Deferred()
			var transaction = db.transaction(["playlists"], "readwrite");
			transaction.oncomplete = transaction.onerror = function(event) {
				//msg('insert1 resolve '+pl.name)
				ret.resolve();
			};
			var plists = transaction.objectStore("playlists");
			plists.put(pl);
			return ret;
		}

		function updateTracksAndAssociations() {
			var ret = $.Deferred()
			spotlib.getPlaylistTracksObservable(pl).toArray().subscribe(arr=>{
				var cnt=0;
				var transaction = db.transaction(["tracks", "playlists", "tr-pl", "userxp"], "readwrite");
				transaction.oncomplete = transaction.onerror = function(event) {
					ret.resolve(cnt);
				};
				var tracks = transaction.objectStore("tracks");
				var trpl = transaction.objectStore("tr-pl");
				for(var i=0;i<arr.length;i++) {
					var tr = arr[i];
					trpl.put({tr:tr.id, pl:pl.id});
					//console.log({tr:tr.id, pl:pl.id});
					if (!tr.id) {
						debugger;
						console.log(tr);
					}
					tracks.put(tr);
					getUserTrack(tr.id, transaction);
					cnt++;
				}
			});
			return ret;
		}

		return deletePlaylist()
			.then(deleteAssociations)
			.then(insertPlaylist)
			.then(updateTracksAndAssociations)
			//.done((cnt)=>{if (cntdel!=cnt)msg('U '+cntdel+' '+cnt+' '+pl.name);})
			.then(()=>pl);
	}

	function setPlaylists(arr) {
		var ret = $.Deferred();
		
		var transaction = db.transaction(["playlists"], "readwrite");
		var objectStore = transaction.objectStore("playlists");
		transaction.oncomplete = function (event) {
			console.log('setPlaylists ok');
			ret.resolve(arr);
		};	
		transaction.onerror = gestioneErrori;
		for(var i=0; i<arr.length; i++) {
			var request = objectStore.put(arr[i]);
			request.onerror = gestioneErrori;
		}				
		return ret;
	}

	function setPlaylist(playlist) {
		var ret = $.Deferred();
		var transaction = db.transaction(["playlists"], "readwrite");
		transaction.oncomplete = function (event) {
			ret.resolve(playlist);
		};

		transaction.onerror = gestioneErrori;

		var objectStore = transaction.objectStore("playlists");
		var request = objectStore.put(playlist);
		request.onsuccess = function (event) {
		};
		request.onerror = gestioneErrori;
		return ret;
	}

	function getPlaylists() {
		return Rx.Observable.create(observer => {
			console.log({theObserver:observer});
			var transaction = db.transaction(["playlists"], "readonly");
			transaction.onerror = gestioneErrori;
			transaction.oncomplete = function (event) {
				observer.complete();
			};
			var request = transaction.objectStore("playlists").openCursor();
			request.onsuccess = function (event) {
				var cursor = event.target.result;
				if (cursor) {
					observer.next(cursor.value);
					cursor.continue();
				} 
			};
		});
	}

	function getPlaylist(id) {
		var ret = $.Deferred();
		var transaction = db.transaction(["playlists"], "readonly");
		transaction.onerror = gestioneErrori;
		var objectStore = transaction.objectStore("playlists");
		var req = objectStore.get(id);
		req.onsuccess = function(event) {
			if (req.result) 
				ret.resolve(req.result);
			else
				ret.resolve(null);
		}
		return ret;
	}


	function setTrack(track) {
		var ret = $.Deferred();
		var transaction = db.transaction(["tracks"], "readwrite");
		transaction.oncomplete = function (event) {
			console.log("setTrack done!");
			ret.resolve();
		};

		transaction.onerror = gestioneErrori;

		var objectStore = transaction.objectStore("tracks");
		var request = objectStore.put(track);
		request.onsuccess = function (event) {
			console.log('ok ' + track.name);
		};
		request.onerror = gestioneErrori;
		return ret;
	}



	function setTracks(tracks) {
		var ret = $.Deferred();
		var p=0,n=0;
		tracks.toArray().subscribe(g);	
		var ret = $.Deferred();

		function g(array) {
			var transaction = db.transaction(["tracks"], "readwrite");
			transaction.onerror = x=>{
				console.log({TRANSACTIONERROR:x})
				alert('TRANSACTIONERROR');
			};
			transaction.oncomplete = function (event) {
				ret.resolve(p+n);
				//msg("setTracks V2 done!").css({backgroundColor:'yellow'});
				msg("T="+(p+n)+' O='+p+ ' N='+n).css({backgroundColor:'yellow'});
				ret.resolve();
			};
			
			var objectStore = transaction.objectStore("tracks");
			for (var i = 0; i < array.length; i++)
				f(array[i]);

			function f(track) {
				//console.log('f ' + track.id);
				var req = objectStore.get(track.id);
				req.onsuccess = function(event) {
					if (req.result) {
						//msg('P ' + track.name);
						p++;
					}
					else {
						var request2 = objectStore.put(track);
						request2.onsuccess = function (event) {
							//msg('N ' + track.name);
							n++;
						};
						request2.onerror = console.log;
					}
				}
			}
		}
		return ret;
	}

	function getTrackPlaylists(trId) {
		var ret = $.Deferred();
		var transaction = db.transaction(["playlists", "tr-pl"], "readonly");
		var playlists = transaction.objectStore('playlists');
		var index = transaction.objectStore('tr-pl').index("tr");
		var singleKeyRange = IDBKeyRange.only(trId);
		var arr = [];
		transaction.onerror = gestioneErrori;
		transaction.oncomplete = function (event) {
			console.log("getTrackPlaylists done!");
			ret.resolve(arr);
		};
		index.openCursor(singleKeyRange).onsuccess = function(event) {
			var cursor = event.target.result;
			if (cursor) {
				var plId = event.target.result.value.pl;
				pushPl(plId);
				cursor.continue();
			}
		};

		function pushPl(plId) {
			var req = playlists.get(plId);
			req.onsuccess = function (event) {
				arr.push(req.result);
			};
		}

		return ret;
	}

	function getTrackIds(playlistIds) {
		var transaction = db.transaction("tr-pl", "readonly");
		var objectStore = transaction.objectStore("tr-pl");
		var request = objectStore.openCursor();
		var arr=[];
		var ret = $.Deferred();
		ret.readme='getTrackIds';
		request.onsuccess = function (event) {
			var cursor = event.target.result;
			if (cursor) {
				if (playlistIds.indexOf(cursor.value.pl)>=0)
					arr.push(cursor.value.tr);
				cursor.continue();
			} else {
				ret.resolve(arr);
			}
		};
		return ret;
	}

	function getTrack(id) {
		console.log('GET __TRACK');
		var ret = $.Deferred();
		ret.readme='get-track';
		var transaction = db.transaction(["tracks"], "readonly");
		transaction.onerror = gestioneErrori;
		transaction.oncomplete = function (event) {
			console.log('GET __TRACK transaction.oncomplete');
		};
		var objectStore = transaction.objectStore("tracks");
		var req = objectStore.get(id);
		req.onsuccess = function(event) {
			console.log('GET __TRACK: esito '+!!req.result);
			if (req.result) 
				ret.resolve(req.result);
			else
				ret.resolve(null);
		}
		req.onerror = function(event) {
			console.log('GET __TRACK red.error');
			console.log(event);
			
		}
		return ret;
	}

	var _ge = 0;
	function gestioneErrori(event) {
		var tag = "dbError" + (_ge++);
		alert(tag);
		var log = {};
		log[tag] = event;
		console.log(log);
	}

	init();

	return {
		setPlaylist: afterReady(setPlaylist),
		setPlaylists: afterReady(setPlaylists),
		getPlaylist: afterReady(getPlaylist),
		getPlaylists: getPlaylists,
		setTrack: afterReady(setTrack),
		setTracks: afterReady(setTracks),
		getTrack: afterReady(getTrack),
		getTrackIds: afterReady(getTrackIds),
		getTrackPlaylists:afterReady(getTrackPlaylists),
		updatePlaylist:afterReady(updatePlaylist),
		getCounters:afterReady(getCounters)
	};
})();