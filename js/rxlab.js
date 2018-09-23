
function ff(ob, tag) {
    tag = tag || '';

    var subscription = ob.subscribe(
        function (x) {
            console.log(tag+'Next: ' + x.toString());
            console.log({next:x});
        },
        function (err) {
            console.log(tag+'Error: ' + err);
        },
        function () {
            console.log(tag+'Completed');
        });
}

Rx.Observable.prototype.chainSubscribe = function() {
    this.subscribe.apply(this, arguments);
    return this;
};


Rx.Observable.prototype.myDebug = function(tag) {
    tag = tag || 'D|';

    this.subscribe(
        function (x) {
            console.log({a:'next', tag:tag, item:x});
        },
        function (err) {
            console.log({a:'error', tag:tag});
        },
        function () {
            console.log({a:'completed', tag:tag });
        });
    return this;
};  

