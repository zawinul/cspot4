function spotStatusRefresher(onStatusData){
	const PERIOD = 5000;
	var curTimeout, curTimeoutStart, curTimeoutEnd;


	
	function onData(data) {
		$('.statusled').hide();
		curTimeout = null;
		onStatusData(data);
		refresh(PERIOD);
		return data;
	}

	function onFail(e) {
		console.log('on fail');
		$('.statusled').hide();
		curTimeout = null;
		console.log({getStatusError:arguments});
		refresh(PERIOD);
		return e;
	}

	function _doRefresh() {
		log('get spot status');
		$('.statusled').show();
		nextPromise = spotlib.getStatus().then(onData, onFail);
		return nextPromise;
	}

	function refresh(ms) {
		log('spot status refresh '+ms);

		if (!ms || ms<0)
			return _doRefresh();

		var nextExpiration = now()+ms;
		if (curTimeout && (nextExpiration>curTimeoutEnd)) {
			log("è gia pianificato un trigger prima di quanto richiesto: non faccio niente");
			return;
		}

		if (curTimeout) {
			clearTimeout(curTimeout);
			curTimeout = null;
		}

		var nextExpiration = now()+ms;
		curTimeoutStart = now();
		curTimeoutEnd = nextExpiration;
		curTimeout = setTimeout(_doRefresh, ms);
		log("next trigger: "+curTimeoutEnd);
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