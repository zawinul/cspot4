
var curTimeout, curTimeoutStart, curTimeoutEnd;

function spotStatusRefresher(onStatusData){
	const PERIOD = 5000;


	
	function onData(data) {
		try {
			$('.statusled').hide();
			curTimeout = null;
			onStatusData(data);
		}catch(e) {
			console.log(e);
		}
		refresh(PERIOD);
	}

	function onFail(e) {
		try {
			console.log('on fail');
			$('.statusled').hide();
			curTimeout = null;
			console.log({getStatusError:e});
		}catch(e) {
			console.log(e);
		}
		refresh(PERIOD);
	}

	function _doRefresh() {
		//console.log('_doRefresh()');
		$('.statusled').show();
		spotlib.getStatus()
			//.then(aaa=>{console.log({aaa}); return aaa;})
			.then(onData)
			.catch(onFail);
	}

	function refresh(ms) {
		//console.log('spot status refresh '+ms);
		var t = now();

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

		// devo forzare un refresh anticipato
		if (curTimeout) {
			clearTimeout(curTimeout);
			curTimeout = null;
		}

		curTimeoutStart = t;
		curTimeoutEnd = curTimeoutStart+ms;
		curTimeout = setTimeout(_doRefresh, ms);
		//log("next trigger: "+curTimeoutEnd);
	}



	spotlib.initialized.then(refresh);


	return {
		refresh
	}
}