var db2 = (function () {

	var dbReady = $.Deferred()
	var db2;
	var version = 101;

	function init() {
		window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: "readwrite" }; // This line should only be needed if it is needed to support the object's constants for older browsers
		window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

		msg('indexedDB: '+!!window.indexedDB);
		var request = window.indexedDB.open("cspot4v2", version);
		request.onerror = gestioneErrori;
		request.onsuccess = function (event) {
			db2 = event.target.result;
			if (!db2) 
				alert('NOT DB2');
			else
				dbReady.resolve();
			console.log(event);
		};
		request.onupgradeneeded = function (event) {
			alert('onupgradeneeded '+version);
			db2 = event.target.result;

			if (!db2.objectStoreNames.contains('global')) {
				msg('DB2 create global');
				objectStore = db2.createObjectStore("global", { keyPath: "id" });
			}
		};
	}



	
	async function set(data) {
		if (!data)
			return null;

		await dbReady;
		if (!data.id)
			data.id=0;

		var p = new Promise(function(resolve, reject) {
			function err(event) {
				gestioneErrori(event);
				reject(event);
			}
			var transaction = db2.transaction(["global"], "readwrite");
			var objectStore = transaction.objectStore("global");
			transaction.oncomplete = function (event) {
				console.log('db2 set ok');
				resolve();
			};	
			transaction.onerror = err;
			var request = objectStore.put(data);
			request.onerror = err;

		});
		await p;
	}

	
	async function get(id) {
		await dbReady;
		if (!id)
			id=0;

		var p = new Promise(function(resolve, reject) {
			function err(event) {
				gestioneErrori(event);
				reject(event);
			}

			var transaction = db2.transaction(["global"], "readonly");
			transaction.onerror = err;
			var request = transaction.objectStore("global").get(id);
			request.onsuccess = function (event) {
				resolve(request.result);
			};
			request.onerror = err;
		});
		var v = await p;
		return v;
	}


	
	var _ge = 0;
	function gestioneErrori(event) {
		var tag = "db2Error" + (_ge++);
		alert(tag);
		var log = {};
		log[tag] = event;
		console.log(log);
	}

	init();

	return {
		set,
		get,
		isReady: dbReady
	};
})();