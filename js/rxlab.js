
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


