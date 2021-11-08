
var main = (function () {

	var started = $.Deferred();
	var main = {
		started: started
	}

	$(function () {
		popup.alert('CSPOT4\nv1.2', 3000)
			//.then(spotlib.init)
			//.then(startNoSleep)
			.then(() => msg('READY to start'))
			.then(() => main.started.resolve());
	});


	return main;
})();
