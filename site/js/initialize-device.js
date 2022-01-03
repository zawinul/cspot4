
function initializeDevice() {
	var curdev;

	return spotlib.getStatus()
	.then(status=>{
		curdev=(status) ? status.device : null;
	})
	.then(spotlib.getDevices)
	.then(selectDevice)
	.then(d=>{
		msg('device corrente = ' + d.name);
		if (localStorage)
			localStorage.currDeviceId = d.id;

		if (curdev && (d.id==curdev.id)) 
			return d;

		msg('devo attivare '+d.name);
		var r2 = $.Deferred();
		var data = JSON.stringify({ device_ids: [d.id] });
		var url = "https://api.spotify.com/v1/me/player";
		var opt = {
			dataType: 'text',
			method: 'PUT'
		}
		return spotlib.callSpotify(url, data, opt).then(()=>d);
		
	});

	function selectDevice(devices) {
		var ret = $.Deferred();
		var prevDev = (localStorage) ? localStorage.currDeviceId : null;

		if (!devices || devices.length == 0) {
			popup.alert('non ci sono devices disponibili');
			ret.reject();
		}
		else if (devices.length > 1) {
			var s = "", deflt = 0;
			for (var i = 0; i < devices.length; i++) {
				var d = devices[i];
				if (d.id == curdev.id)
					deflt = i;
				s += '\n  [' + i + '] - ' + d.name;
			}
			var k = prompt("scegli il device\n" + s, '' + deflt);
			if (!devices[k]) {
				popup.alert('non capisco la tua scelta');
				return ko();
			}
			ret.resolve(devices[k]);
		}
		else {
			var d = devices[0];
			var prevDev = (localStorage) ? localStorage.currDeviceId : null;
			if (d.id==prevDev)
				ret.resolve(d);
			else {
				var msg = 'vado su ' + devices[0].name + ' ?';
				popup.confirm(msg).then(x => {
					(x) ? ret.resolve(d) : ret.reject();
				})
			}
		}

		return ret;
	}

}

