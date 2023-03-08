
// nap: function(representation) => boolean noRender
// action;  free json data
// acceptor: function(action, model), can modify the model
// reactor: function(model), can modify the model, decoupled from actions
// representer: function(model), return a representation of the model with no link to the original model 
// render: function(representation)


function statemanager(cfg) {
	let actions = [];
	let acceptors = [];
	let reactors = [];
	let naps = [];
	let model = {};
	const defaultRepresenter = model=>JSON.parse(JSON.stringify(model));
	let representer = defaultRepresenter;

	const defaultRender = representation=>console.log({default_render:representation});
	let render = defaultRender;

	function setModel(m) {
		model = m;
	}

	function setRender(r) {
		render = r;
	}


	function setRepresenter(r) {
		representer = r;
	}

	let _stepArmed = false;

	function propose(act, immediate) {
		//console.log(JSON.stringify({propose:act}));
		actions.push(act);
		if (immediate)
			_step();
		else {
			_stepArmed = true;
			setTimeout(_step, 1);
		}
	}

	function addAcceptor(acc) {
		acceptors.push(acc);
	}
	
	function addReactor(r) {
		reactors.push(r);
	}

	function addNap(nap) {
		naps.push(nap);
	}

	
	function _presentAct(act) {
		for(let acc of acceptors) {
			try {
				acc(act, model);
			} catch(e) {
				console.log({_presentError:e})
			}
		}
	}

	function _react() {
		for(let i=0; i<reactors.length; i++) {
			try {
				reactors[i](model);
			}catch(e) {
				console.log({_reactError:e,i})
			}
		}
	}

	function _present() {
		let tmp = actions.slice();
		actions = [];
		for(var i=0;i<tmp.length; i++) {
			_presentAct(tmp[i]);
		}
	}

	function _execNaps(representation) {
		let ret = false;
		for(let nap of naps) {
			try {
				let noRender = nap(representation);
				if (noRender===true)
					ret = true;
			}
			catch(e) {
				console.log({_napsError:e});
			}
		}
		return ret;
	}

	function _step() {
		if (!_stepArmed)
			return;
		if (!actions || actions.length==0)
			return;

		var noRender = true;
		let representation;
		try {
			while(actions.length>0) {
				_present();
				_react();
				representation = representer(model);
				noRender = _execNaps(representation);
			}
			if (!noRender && representation) {
				render(representation);		
			}
		}
		catch(e){
			console.log({_steperror:e});
		}
		_stepArmed = false;
	}


	function init(cfg) {
		acceptors = cfg.acceptors || [];
		reactors = cfg.reactors || [];
		naps = cfg.naps || [];
		model = cfg.model || {};
		render = cfg.render || defaultRender;
		representer = cfg.representer || defaultRepresenter;
		return {
			setModel,
			setRender,
			setRepresenter,
			addNap,
			propose,
			addReactor,
			addAcceptor
		}
	}
	return init(cfg);
}