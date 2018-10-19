function show(x, label) {
	if (!label) 
		label = "---";
	if (typeof(x)!='object' || !x.then)
		console.log({_a_label:label, _b_type:typeof(x), _c_data:x});
	else
		x.then((v)=>{
			var x = {_a_label:label, _b_type:'PROMISE', _c_data:v};
			if ($.isArray(v))
				x._b_len = v.length; 
			console.log(x);
		});
}

