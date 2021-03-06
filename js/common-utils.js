
(function rotellaTitolo() {
	var provarot = ['|','/','-','\\'], provarotc=0;
	setInterval(function(){
		document.title='CSPOT4 '+provarot[(provarotc++)%4];
	}, 1000);	
})();

Math.seed = function (s) {
	s = s || new Date().getTime() * .0000000001;
	return function () {
		s = Math.sin(s) * 10000;
		//console.log('s='+s);
		return s - Math.floor(s);
	};
};


function scramble(arr) {
	const rnd1 = Math.seed();

	function swap(a, b) {
		var temp = arr[a];
		arr[a] = arr[b];
		arr[b] = temp;
	}

	for (var i = 0; i < arr.length; i++) {
		var b = Math.floor(rnd1() * arr.length);
		swap(i, b)
	}
	const rnd2 = Math.seed(1/rnd1());

	for (var i = arr.length - 1; i >= 0; i--) {
		var b = Math.floor(rnd2() * arr.length);
		swap(i, b)
	}

}


function singleton(factory) {
	var singletonObject = null;
	return function () {
		if (!singletonObject)
			singletonObject = factory();
		return singletonObject;
	}
}



var getSilenceTracks = singleton(function () {
	return Promise.all([silence1Id, silence2Id].map(spotlib.getTrackById))
});



