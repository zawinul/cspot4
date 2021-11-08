function visibleTimeout(time, extraClass) {

	var ret = $.Deferred();
	var stopped = false;
	var inner = $('<div/>').addClass('visible-timeout-inner');
	var outer = $('<div/>').addClass('visible-timeout-outer').append(inner).appendTo('body');

	if (extraClass)
		outer.addClass(extraClass);

	inner.css({width:'100%'});
	time = time||5000;
	inner.animate({width:'0%'}, time, 'linear', function() {
		outer.remove();
		if (!stopped)
			ret.resolve(true);
	});

	ret.stop=function(){
		outer.remove();
		stopped = true;
	}

	return ret;
}

