var oldTimeout = setTimeout;
var oldClearTimeout = clearTimeout;
var timeouts = {}

window.setTimeout = function (callback, timeout, label) {
	if (!label)
		label = '?';
	//console.log("timeout started");
	var exp = now()+timeout;
	var r =  oldTimeout(function () {
		//console.log('timeout finished');
		delete timeouts[r];
		callback();
	}, timeout);
	timeouts[r]={label, exp};
	return r;
}

window.clearTimeout = function (t){
	oldClearTimeout(t);
	delete timeouts[t];
}

function spotStatusRefresher(onStatusData){
	const PERIOD = 5000;
	var curTimeout, curTimeoutStart, curTimeoutEnd;


	
	function onData(data) {
		$('.statusled').hide();
		curTimeout = null;
		onStatusData(data);
		refresh(PERIOD);
	}

	function onFail(e) {
		console.log('on fail');
		$('.statusled').hide();
		curTimeout = null;
		console.log({getStatusError:arguments});
		refresh(PERIOD);
	}

	function _doRefresh() {
		//log('get spot status');
		$('.statusled').show();
		spotlib.getStatus().then(onData, onFail);
	}

	function refresh(ms) {
		log('spot status refresh '+ms);
		var t = now;


		if (!ms || ms<0) { // immediate
			if (curTimeout) {
				clearTimeout(curTimeout);
				curTimeout = null;
			}	
			return _doRefresh();
		}

		var nextExpiration = t+ms;
		if (curTimeout && (nextExpiration>curTimeoutEnd)) {
			log("è gia pianificato un trigger prima di quanto richiesto: non faccio niente");
			return;
		}

		if (curTimeout) {
			clearTimeout(curTimeout);
			curTimeout = null;
		}

		curTimeoutStart = t;
		curTimeoutEnd = curTimeoutStart+ms;
		curTimeout = setTimeout(_doRefresh, ms, 'st refresh');
		//log("next trigger: "+curTimeoutEnd);
	}



	spotlib.initialized.then(refresh);
	function log(x) {
		//console.log(x);
	}

	function setlog(x) {
		console.log('setlog');
		log = x;
	}

	return {
		refresh
	}
}