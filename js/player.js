//alert('V1');
var player = (function () {
	var paused = false;
	var endOfSongCount = -1;
	var token, expire;
	var _status = null;
	var changeStateObservable = new Rx.Subject();
	var songPositionObservable = new Rx.Subject();
	var timer = true;
	function init() {
		if (init.d)
			return init.d;
		init.d = $.Deferred();
		init.d.resolve();
		return init.d;
	}

	var statDef = null;
	var _status;

	var endOfSongDeferred = $.Deferred();
	var _endOfSong = false;

	function endOfSong() {
		startStatusMonitor();
		return endOfSongDeferred;
	}

	var monfun;
	var statusMonitor;

	function startStatusMonitor() {
		if (startStatusMonitor.started)
			return;
		
		var oldp=0, oldts=0;
		statusMonitor = function() {
			if (!timer)
				return;
			var sm = statusMonitor;
			return spotlib.getStatus().done(t=>{
				
				player.status = t;
				var x = t.is_playing;
				var y = (t.device)?t.device.is_active:false;
				var z = t.device.name;
				var k = !!t.progress_ms;
				var p = t.timestamp-t.progress_ms;
				//console.log('p '+p+' '+(p-oldp)+' ts:'+(t.timestamp-oldts)+ ' a='+(t.progress_ms/1000));
				var summary = (x?'P':'!P')+' '
					+(y?'A':'!A')+' '
					+t.progress_ms+' '
					+(k ? Math.floor(t.progress_ms*10000/t.item.duration_ms)/100:0)+'% '
					+t.device.name;
				$('.show-status').text(summary);
				
				
				oldp=p;
				oldts = t.timestamp;
				if ((x!=sm.x)||(y!=sm.y)||(z!=sm.z)||(k!=sm.k)) {
					sm.x = x;
					sm.y = y;
					sm.z = z;
					sm.k = k;
					changeStateObservable.onNext({playing:x,active:y,device:z,song:k});
				}

				if (k && y)
					songPositionObservable.onNext({ pos:t.progress_ms,	len:t.item.duration_ms });
				else
					songPositionObservable.onNext({ pos:0, len:0 });
			});
		}
	
		setInterval(statusMonitor, 5000);
		startStatusMonitor.started = true;	
	}


	return {
		init: init,
		startStatusMonitor: startStatusMonitor,
		refreshStatus: ()=>setTimeout(statusMonitor,100),
		endOfSong: endOfSong,
		setTimerEnabled:x=>(timer=x),
		getTimerEnabled:()=>timer,
		changeStateObservable: changeStateObservable,
		songPositionObservable: songPositionObservable
	};
})();


