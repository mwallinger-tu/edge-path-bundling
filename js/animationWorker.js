var edges = null;
var bundled = null;

self.onmessage = function(e) {

    // console.log('test')
    // console.log(e.data)
  
    if (e.data[0] !== null && e.data[1] !== null) {
        edges = e.data[0];
        bundled = e.data[1];
    }
    var t0 = e.data[2];
    var steps = e.data[3];



    doFrame(t0, steps);
    }


function doFrame(t0, steps) {

    edges.forEach(edge => {
        if (bundled[edge.id]) {
            for(var i = 0; i < edge.controlpoints.length; i++) {
                edge.anim[i].x -= edge.delta[i].x;
                edge.anim[i].y -= edge.delta[i].y;
            }
        }

    });

    //console.log('post')
    self.postMessage([edges, t0, steps]);
    
}