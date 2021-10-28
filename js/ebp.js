/**
 * Author: Markus Wallinger
 * email: mwallinger@tuwien.ac.at
 * 
 * Implementation of the Edge-Path-Bundling algorithm from our publication: Edge-Path Bundling: A Less Ambiguous Edge Bundling Approach (https://arxiv.org/abs/2108.05467)
 * 
 * The following class encapsulates all necessary code to bundle edges and draw on a web canvas.
 */
class EdgePathBundling {
    numApproximationPoints = 50;
    weightFactor = 2;
    maxDistortion = 2;
    bundleStrength = 1;

    /**
     * The constructor of the class performs the necessary pre-processing to create a bundling.
     * 
     * @param {[Objects]} nodes Nodes of the graph as a list of objects
     * @param {[Objects]} edges Edges of the graph as a list of objects
     * @param {int} width Width of the canvas (necessary for scaling)
     * @param {int} height Height of the canvas (necessary for scaling)
     */
    constructor(nodes, edges, width, height) {
        var t0 = performance.now()
        this.nodes = nodes;
        this.edges = edges;
        
        var n = nodes.length;

        this.n = n;
        this.nodeDict = {}
        this.adjList = new Map();

        var minX = 100000, maxX = -100000, minY = 100000, maxY = -100000;
        this.nodes.forEach(node => {
            node.y = -node.y; //invert y-coordinate
            node.x = +node.x;

            minX = minX < node.x ? minX : node.x;
            minY = minY < node.y ? minY : node.y;
            maxX = maxX > node.x ? maxX : node.x;
            maxY = maxY > node.y ? maxY : node.y;

            node.id = parseInt(node.id)

            this.adjList.set(node.id, []);
            this.nodeDict[node.id] = node;
        });

        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;

        //scale the graph to fit the canvas.
        this.scale(width, height)
        
        var t1 = performance.now()
        console.log("Preprocessing Nodes took " + (t1 - t0) + " milliseconds.")
        t0 = performance.now()
             
        //create helper matrices to efficiently access edge and weight and adjacency information
        this.adj = math.matrix(math.ones([n,n]))
        this.adj = math.multiply(this.adj, -1)
        this.adj = this.adj._data  
        
        this.weight = math.matrix(math.ones([n,n]))
        this.weight = math.multiply(this.weight, -1)
        this.weight = this.weight._data   

        
        var t1 = performance.now()
        console.log("Preprocessing Misc took " + (t1 - t0) + " milliseconds.")
        t0 = performance.now()
        
        this.edges.forEach((d, index) => {
            d.target = parseInt(d.target);
            d.source = parseInt(d.source);

            d.id = index;

            var src = this.nodeDict[d.source];
            var tgt = this.nodeDict[d.target];

            this.adjList.get(d.source).push(d.target);
            this.adjList.get(d.target).push(d.source);
            
            d['controlpointsStraight'] = this.approximateStraight([src, tgt], this.numApproximationPoints);
            d['controlpoints'] = this.approximateStraight([src, tgt], this.numApproximationPoints);
            
            this.adj[d.target][d.source] = index
            this.adj[d.source][d.target] = index

            var l = dist(src, tgt)

            d['color'] = assignColor(src, tgt);

            d['dist'] = l;
            d['weight'] = Math.pow(l, this.weightFactor);

            this.weight[d.target][d.source] = d['weight']
            this.weight[d.source][d.target] = d['weight']
        })

        this.locked = new Array(this.edges.length).fill(false);
        this.bundled = new Array(this.edges.length).fill(false);

        var t1 = performance.now()
        console.log("Preprocessing Edges took " + (t1 - t0) + " milliseconds.")

        var t0 = performance.now();

        this.edges.sort(function(a, b) {
            return b['dist'] - a['dist'];
        });

        var t1 = performance.now()
        console.log("Sorting Edges took " + (t1 - t0) + " milliseconds.")
    }


    bundle() {
        var t0 = performance.now()
    
        /// TODO change back
        this.locked = new Array(this.edges.length).fill(false);
        this.bundled = new Array(this.edges.length).fill(false);

        this.neighbours = new Array(this.nodes.length)
        this.nodes.forEach(element => {
            this.neighbours[element.id] = new Set(this.adjList.get(element.id));
        });
  
        this.edges.forEach(element => {
            //console.log(element);
            if (this.locked[element.id]){
                element.controlpoints = element.controlpointsStraight;
                return;
            }
            
            var src = element.source;
            var tgt = element.target;
    
            this.neighbours[tgt].delete(src);
            this.neighbours[src].delete(tgt);
    
            var path = this.dijkstra(src, tgt)
            //console.log(element, path)
            if (path.length > 2) {
                var pLen = 0;
                var last = this.nodeDict[path[0]];
    
                for(var i = 1; i < path.length; i++) {
                    var next = this.nodeDict[path[i]];
                    
                    pLen += dist(last, next)
                    last = next
                }

                //console.log(element.dist, pLen);

                if (pLen >= this.maxDistortion * element.dist) {
                    element['controlpoints'] = [this.nodeDict[src], this.nodeDict[tgt]]
    
                    this.neighbours[tgt].add(src);
                    this.neighbours[src].add(tgt);
                } 
                else 
                {
                    var last = this.nodeDict[path.pop()];
                    var cp = [last]
                    while(path.length > 0){
                        var next = this.nodeDict[path.pop()];
    
                        var id = this.adj[last.id][next.id]
                        this.locked[id] = true;
     
                        cp.push(next)
                        last = next
                    }
    
                    this.bundled[element.id] = true;
                    element.cp = cp;
                    element['controlpoints'] = this.approximateBezier(cp, this.numApproximationPoints);
                }               
            } else {
                element['controlpoints'] = [this.nodeDict[src], this.nodeDict[tgt]]
    
                this.neighbours[tgt].add(src);
                this.neighbours[src].add(tgt);
            }
        });
    
    
        var t1 = performance.now()
        console.log("Bundling took " + (t1 - t0) + " milliseconds.")
    }

    /**
     * Dijkstras single-source shortest path with priority heap as datastructure to store the distances.
     * 
     * @param {Object} src 
     * @param {Object} tgt 
     * @returns [objects] Returns a list of IDs representing the nodes in the shortest path.
     */
    dijkstra(src, tgt) {
        var cost, pred;
        (cost = []).length = this.n; 
        cost.fill(+Infinity);
        cost[src] = 0;
    
        (pred = []).length = this.n;
        pred.fill(-1);

        var idNodeDict = {}
        var queue = new FibonacciHeap();
        var node = queue.insert(0, src);
        idNodeDict[src] = node;
    
        while (!queue.isEmpty()) {
            var best = queue.extractMinimum();

            best = best.value;
            //console.log(best)
            if(best == tgt) 
                break;
    
            this.neighbours[best].forEach(next => {
                var c = cost[best] + this.weight[best][next];
                
                if (cost[next] > c) {
                    if(pred[next] < 0) {
                        var node = queue.insert(c, next);
                        idNodeDict[next] = node;
                    } else {
                        var node = idNodeDict[next];
                        queue.decreaseKey(node, c);
                    }
                    
                    pred[next] = best;
                    cost[next] = c;
                }
            });
        }
    
        //return a list of nodes representing the shortest path
        var cp = [tgt]
        var p = tgt
        while(true) {
            p = pred[p];
            cp.push(p);
    
            if (p === src)
                return cp
            if (p <= 0)
                return []
        }
    }

    /**
     * Scale the vertices of the graph to be in the range ([0,maxX],[0,maxY])
     * 
     * @param {Int} maxX 
     * @param {Int} maxY 
     */
    scale(maxX, maxY) {
        var width = this.maxX - this.minX;
        var height = this.maxY - this.minY;
        
        var marginX = maxX * 0.05;
        var marginY = maxY * 0.05;
        
        maxX -= 2 * marginX;
        maxY -= 2 * marginY;

        this.nodes.forEach(node => {
            node.x = marginX + ((node.x - this.minX) / width) * maxX
            node.y = marginY + ((node.y - this.minY) / height) * maxY;
        });

    }

    /**
     * Calculate more control points for the Bezier curve by subdividing each edge of the path into two sub edges.
     */
    subdivision() {
        this.edges.forEach(edge => {
            if(this.bundled[edge.id]) {
                edge.controlpoints = this.subdivide(edge.cp, this.bundleStrength);
                edge.controlpoints = this.approximateBezier(edge.controlpoints, this.numApproximationPoints)
            }
        });
    }

    
    /**
     * Given a list of points this function returns a list of points where a new point is inserted between every consecutive pair of points. The parameter s states how often an edge is subdivided.
     * 
     * @param {[object]} points 
     * @param {int} s 
     * @returns [objects]
     */
    subdivide(points, s) {
        for(var i = 1; i < s; i++) {
            var newCP = []
            newCP.push(points[0]);
            
            for(var j = 0; j < points.length - 1; j++) {
                var p1 = points[j]
                var p2 = points[j + 1]
            
                var p3 = {};
                p3.x = (p1.x + p2.x) / 2;
                p3.y = (p1.y + p2.y) / 2;

                newCP.push(p3);
                newCP.push(p2);
            }

            points = newCP;
        }

        return points;
   }

   /**
    * Animate the bundling by adding 
    * 
    * @param {Renderer} renderer 
    * @param {int} steps 
    * @param {float} frameT 
    */
   animate(renderer, steps, frameT) {
        renderer.clear()

        this.edges.forEach(edge => {
            if (!this.bundled[edge.id])
                return;

            var delta = []
            var anim = []
            
            for(var i = 0; i < edge.controlpoints.length; i++) {
                var p = {}

                p.x = (edge.controlpointsStraight[i].x - edge.controlpoints[i].x) / steps;
                p.y = (edge.controlpointsStraight[i].y - edge.controlpoints[i].y) / steps;

                delta.push(p)

                var pp = {}
                pp.x = edge.controlpointsStraight[i].x
                pp.y = edge.controlpointsStraight[i].y
                anim.push(pp)
            }

            edge.delta = delta;
            edge.anim = anim;
        });

        var worker = new Worker('animationWorker.js')
        
        this.doFrame(renderer, this, steps, frameT, worker);
    }

    doFrame(renderer, tthis, remaining, frameT, worker) {
        var t0 = performance.now()
        worker.postMessage([tthis.edges, tthis.bundled, t0, remaining]);

        

        worker.addEventListener('message', function(e) {
            var edges = e.data[0];
            var t0 = e.data[1];
            var steps = e.data[2];

            renderer.clear();

            edges.forEach(edge => {
                if (tthis.bundled[edge.id]) {
                    renderer.drawLine(edge.anim, edge.color);     
                    //renderer.drawLine(edge.anim, '#fe8a71'); 
                }
                else {
                    renderer.drawLine(edge.controlpoints, edge.color);   
                }
            });

            tthis.nodes.forEach(node => {
                renderer.drawPoint(node);
            });

            var t1 = performance.now();
            var tPassed = frameT - (t1 - t0);
    
            renderer.draw();
            //console.log(tPassed, steps)

            if (steps > 0) {           
                if (tPassed > 0)
                    setTimeout(function() {
                        worker.postMessage([null, null, t1, steps-1]);
                    }, tPassed);
                else
                    //tthis.doFrame(renderer, tthis, steps - 1, frameT, worker);
                    worker.postMessage([null, null, t1, steps-1]);
            }
        });

        // tthis.edges.forEach(edge => {
        //     if (tthis.bundled[edge.id]) {
        //         for(var i = 0; i < edge.controlpoints.length; i++) {
        //             edge.anim[i].x -= edge.delta[i].x;
        //             edge.anim[i].y -= edge.delta[i].y;
        //         }
        //         //renderer.drawLine(edge.anim, edge.color);     
        //         renderer.drawLine(edge.anim, '#fe8a71'); 
        //     }
        //     else {
        //         //renderer.drawLine(edge.controlpoints, edge.color);   
        //         if(tthis.locked[edge.id])     
        //             renderer.drawLine(edge.controlpoints, '#3da4ab');   
        //         else
        //             renderer.drawLine(edge.controlpoints, '#000000');   
        //     }
        // });
        
    }



    drawGraphBundled(renderer) {
        var t0 = performance.now()

        renderer.clear();

        this.edges.forEach(edge => {
            renderer.drawLine(edge.controlpoints, edge.color);        
        });

        this.nodes.forEach(node => {
            renderer.drawPoint(node);
        });

        renderer.draw();
        var t1 = performance.now()
        console.log("Rendering took " + (t1 - t0) + " milliseconds.")
    }

    drawGraphStraight(renderer) {
        var t0 = performance.now()

        renderer.clear();

        this.edges.forEach(edge => {
            //renderer.drawLine(edge.controlpointsStraight, '#000000')
            renderer.drawLine(edge.controlpointsStraight, edge.color)
        });

        this.nodes.forEach(node => {
            renderer.drawPoint(node);
        });

        var t1 = performance.now()
        
        renderer.draw();
        console.log("Rendering took " + (t1 - t0) + " milliseconds.")       

    }


    approximateStraight(points, n) {
        var p1 = points[0];
        var p2 = points[1];
 
        var x = (p2.x - p1.x) / (n);
        var y = (p2.y - p1.y) / (n);

        points = [];

        for(var i = 0; i <= n; i++) {
            var p = {}
            p.x = (p1.x + i * x);
            p.y = (p1.y + i * y);
            points.push(p);
        }

        return points;
    }

    approximateBezier(points, n) {

        var bezier = []
        var i = 0;
        points.forEach(point => {
            point.binom = binomial(points.length - 1, i);

            i += 1;
        });

        for (var t = 0; t <= 1; t += 1/(n)) {
            var p = {x:0, y:0}

            var i = 0;
            

            points.forEach(point => {
                var tpi = Math.pow((1 - t), points.length - 1 - i);
                var coeff = tpi * Math.pow(t, i);

                p.x += point.binom * coeff * point.x;
                p.y += point.binom * coeff * point.y;

                i += 1;
            });

            bezier.push(p);
        }

        bezier.push({x: points[points.length - 1].x, y: points[points.length - 1].y})
        return bezier;
    }



    /**
     * 
     * Setter for the bundling parameters
     * 
     *  
     */


    /*
    Set the weight factor for each edge.
    */
    setWeight(factor) {  
        this.weightFactor = factor;

        this.edges.forEach(edge => {
            edge.weight = Math.pow(edge.dist, factor);

            this.weight[edge.target][edge.source] = edge['weight']
            this.weight[edge.source][edge.target] = edge['weight']
        });
    }

    /*
    Set the weight factor for each edge.
    */
    setDistortion(value) {       
        this.maxDistortion = value;
    }

    /*
    Set the bundling strength for each edge
    */

    setBundlingStrength(strength) {
        this.bundleStrength = strength;
    }
}

/**
 * Class to interface the HTML canvas element
 * 
 */
class Render {
    constructor(selector) {
        this.canvas = document.querySelector(selector);
        this.drawcontext = this.canvas.getContext('2d');

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.canvas.width;
        this.offscreen.height = this.canvas.height;
        this.context = this.offscreen.getContext("2d");

    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        this.drawcontext.putImageData(this.context.getImageData(0,0, this.canvas.width, this.canvas.height), 0, 0);
    }

    drawPoint(node) {
        this.context.beginPath();
        this.context.fillStyle = '#283347';
        this.context.arc(node.x, node.y, 1, 0, Math.PI * 2, true);
        this.context.strokeStyle = '#283347';
        this.context.stroke();
        this.context.fill();
    }


    drawLine(points, color) {
        this.context.beginPath();
        this.context.moveTo(points[0].x, points[0].y)

        for(var i = 0; i < points.length; i++) {
            this.context.lineTo(points[i].x, points[i].y);
        }
        this.context.strokeStyle = color + '55';
        this.context.lineWidth = 2;
        this.context.stroke();
    }

    drawBezier(points) {
        var p000 = points[0]
        var p112 = {};
        var p122 = {};
        p112.x = 2/3 * points[0].x + 1/3 * points[1].x
        p112.y = 2/3 * points[0].y + 1/3 * points[1].y
        p122.x = 1/3 * points[0].x + 1/3 * points[1].x
        p122.y = 1/3 * points[0].y + 1/3 * points[1].y

        this.context.beginPath();
        this.context.moveTo(p000.x, p000.y);
        this.context.bezierCurveTo(p112.x, p112.y, p122.x, p122.y, points[1].x, points[1].y);
        this.context.stroke();

        var p223 = {};
        var p233 = {};
        var p222 = {}

        for(var i = 1; i < points.length - 1; i++) {
            var p123 = points[i]
            var p234 = points[i+1]
            p223.x = 2/3*p123.x + 1/3*p234.x
            p223.y = 2/3*p123.y + 1/3*p234.y
            p233.x = 1/3*p123.x + 2/3*p234.x
            p233.y = 1/3*p123.y + 2/3*p234.y
            p222.x = .5*p122.x + .5*p223.x
            p222.y = .5*p122.y + .5*p223.y

            this.context.beginPath();
            this.context.moveTo(p123.x, p123.y);
            this.context.bezierCurveTo(p223.x, p223.y, p233.x, p233.y, p234.x, p234.y);
            this.context.stroke();
            
            p122 = p233
        }
    }
}

/**
 * Helper to return the distance between two vertices.
 * 
 * @param {Vertex} src 
 * @param {Vertex} tgt 
 * @returns distance
 */
function dist(src, tgt) {
    return math.sqrt(math.pow(src.x-tgt.x, 2) + math.pow(src.y-tgt.y, 2))
}

/**
 * Helper function to assign a color depending on the angle of the edge
 * 
 * @param {Point} p1 
 * @param {Point} p2 
 * @returns hex color
 */
function assignColor(p1, p2) {
    var dX = p2.x - p1.x;
    var dY = p2.y - p1.y;

    var angle = Math.atan2(-dY, dX);
    var degrees = 180 * angle / Math.PI;

    if(degrees < 0)
        degrees = (360 + Math.round(degrees)) - 180;

    if (degrees < 11.5)
        return "#733957"
    else if (degrees < 33)
        return "#8e4830"
    else if (degrees < 55.5)
        return "#b58837"
    else if (degrees < 78)
        return "#d6d389"
    else if (degrees < 100.5)
        return "#abdbca"
    else if (degrees < 123)
        return "#5ea6c8"
    else if (degrees < 155.5)
        return "#55609a"
    else if (degrees < 178)
        return "#723959"
    else
        return "#733957"
}


function binomial(n, k) {
   var coeff = 1;
   for (var x = n-k+1; x <= n; x++) coeff *= x;
   for (x = 1; x <= k; x++) coeff /= x;
   return coeff;
}

