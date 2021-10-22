class EdgePathBundling {
    numApproximationPoints = 50;
    weightFactor = 2;
    maxDistortion = 2;
    bundleStrength = 1;

    constructor(nodes, edges, width, height) {
        var t0 = performance.now()
        this.nodes = nodes;
        this.edges = edges;
        
        var n = nodes.length;

        this.n = n;
        this.nodeDict = {}
        // this.neighbours = new Array(n).fill(new Array());
        this.adjList = new Map();

        var minX = 100000, maxX = -100000, minY = 100000, maxY = -100000;
        this.nodes.forEach(node => {
            node.y = -node.y;
            node.x = +node.x;

            minX = minX < node.x ? minX : node.x;
            minY = minY < node.y ? minY : node.y;
            maxX = maxX > node.x ? maxX : node.x;
            maxY = maxY > node.y ? maxY : node.y;

            node.id = parseInt(node.id)

            this.adjList.set(node.id, []);
            //node.neighbours = [];
            //this.neighbours.push(new Array());
            this.nodeDict[node.id] = node;
        });

        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;

        this.scale(width, height)
        
        var t1 = performance.now()
        console.log("Preprocessing Nodes took " + (t1 - t0) + " milliseconds.")
        t0 = performance.now()
             
        this.adj = math.matrix(math.ones([n,n]))
        this.adj = math.multiply(this.adj, -1)
        this.adj = this.adj._data  
        
        this.weight = math.matrix(math.ones([n,n]))
        this.weight = math.multiply(this.weight, -1)
        this.weight = this.weight._data   

        var i = 0;
        var t1 = performance.now()
        console.log("Preprocessing Misc took " + (t1 - t0) + " milliseconds.")
        t0 = performance.now()
        
        this.edges.forEach(d => {
            d.target = parseInt(d.target);
            d.source = parseInt(d.source);

            d.id = i;

            var src = this.nodeDict[d.source];
            var tgt = this.nodeDict[d.target];

            //this.neighbours[d.target].push(d.source);
            //this.neighbours[d.source].push(d.target);
            // neighbours[d.target].add(d.source);
            // neighbours[d.source].add(d.target);
            //(this.nodeDict[d.source])['neighbours'].push(d.target);
            //(this.nodeDict[d.target])['neighbours'].push(d.source);
            this.adjList.get(d.source).push(d.target);
            this.adjList.get(d.target).push(d.source);
            
            d['controlpointsStraight'] = this.approximateStraight([src, tgt], this.numApproximationPoints);
            d['controlpoints'] = this.approximateStraight([src, tgt], this.numApproximationPoints);
            
            this.adj[d.target][d.source] = i
            this.adj[d.source][d.target] = i

            var l = dist(src, tgt)

            d['color'] = assignColor(src, tgt);

            d['dist'] = l;
            d['weight'] = Math.pow(l, this.weightFactor);

            this.weight[d.target][d.source] = d['weight']
            this.weight[d.source][d.target] = d['weight']

            i++;
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

    /*
    Set the weight factor for each edge.
    */
    setWeight(factor) {  
        this.weightFactor = factor;
        console.log('here');
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

        this.doFrame(renderer, this, steps, frameT);
    }

    doFrame(renderer, tthis, remaining, frameT) {
        var t0 = performance.now()
        renderer.clear();
        tthis.edges.forEach(edge => {
            if (tthis.bundled[edge.id]) {
                for(var i = 0; i < edge.controlpoints.length; i++) {
                    edge.anim[i].x -= edge.delta[i].x;
                    edge.anim[i].y -= edge.delta[i].y;
                }
                //renderer.drawLine(edge.anim, edge.color);     
                renderer.drawLine(edge.anim, '#fe8a71'); 
            }
            else {
                //renderer.drawLine(edge.controlpoints, edge.color);   
                if(tthis.locked[edge.id])     
                    renderer.drawLine(edge.controlpoints, '#3da4ab');   
                else
                    renderer.drawLine(edge.controlpoints, '#000000');   
            }
        });

        tthis.nodes.forEach(node => {
            renderer.drawPoint(node);
        });

        var t1 = performance.now();
        var tPassed = frameT - (t1 - t0);

        if (remaining <= 0)
            return;

        if (tPassed > 0)
            setTimeout(tthis.doFrame, tPassed, renderer, tthis, remaining - 1, frameT);
        else
            tthis.doFrame(renderer, tthis, remaining - 1, frameT);
        
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
        console.log("Rendering took " + (t1 - t0) + " milliseconds.")       
    }

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

                console.log(element.dist, pLen);

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

    sub(value) {
        this.edges.forEach(edge => {
            if(this.bundled[edge.id]) {
                edge.controlpoints = this.subdivide(edge.cp, value);
                edge.controlpoints = this.approximateBezier(edge.controlpoints, this.numApproximationPoints)
            }
        });
    }

    

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
}

class Render {
    constructor(selector) {
        this.canvas = document.querySelector(selector);
        this.context = this.canvas.getContext('2d');
    }

    draw() {

    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
        this.context.strokeStyle = color + 'bb';
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

var nodes;
var links;
var nodeDict;
var linkDict;
var adj;
var weight;
var maxDistortion = 2;

var minX, minY, maxX, maxY;
var xScale, yScale;

var bundled = false;
var bundleStrength = 0;

var neighbours = {}
var n = 0;

function loadDataset(path, svg) {
    return d3.json(path).then(function(data){
        bundled = false;

        nodes = data['nodes'];
        links = data['links'];

        nodeDict = {}
        nodes.forEach(element => {
            element.id = parseInt(element.id)
            nodeDict[element.id] = element;
            element['neighbours'] = [];
            element.y = -element.y;
        });
        
        n = nodes.length
        adj = math.matrix(math.ones([n,n]))
        adj = math.multiply(adj, -1)
        adj = adj._data  
        
        weight = math.matrix(math.ones([n,n]))
        weight = math.multiply(weight, -1)
        weight = weight._data   

        linkDict = {};
        i = 0;
        links.forEach(d => {
            d.target = parseInt(d.target);
            d.source = parseInt(d.source);

            src = nodeDict[d.source];
            tgt = nodeDict[d.target];

            (nodeDict[d.source])['neighbours'].push(d.target);
            (nodeDict[d.target])['neighbours'].push(d.source);
            (nodeDict[d.source])['edges'].push(i);
            (nodeDict[d.target])['edges'].push(i);

            d['unbundledCP'] = [src, tgt];
            d['controlpoints'] = [src, tgt];
            d['controlpointsBundled'] = [src, tgt];

            adj[d.target][d.source] = i
            adj[d.source][d.target] = i

            l = dist(src, tgt)

            d['dist'] = l;
            d['weight'] = l * l;
            d['locked'] = false;
            d['bundled'] = false;

            weight[d.target][d.source] = l * l
            weight[d.source][d.target] = l * l

            linkDict[i] = d;
            i++;
        })

        links.sort(function(a, b) {
            return b['dist'] - a['dist'];
        });

        console.log('done loading')
    }).then(function(){
        bundleStrength = 0;
        maxDistortion = 2;

        renderCanvas(svg);
        drawStraight(svg);
    });
}

function renderCanvas(svg) {
    var context = svg.node().getContext('2d');

    var margin = {top: 30, right: 30, bottom: 30, left: 30};

    minX = d3.min(nodes, d => d.x);
    maxX = d3.max(nodes, d => d.x);
    minY = d3.min(nodes, d => d.y);
    maxY = d3.max(nodes, d => d.y);

    var width = 800//maxX - minX;
    var height = 500//maxY - minY;

}

function renderInit(svg) {
    var margin = {top: 30, right: 30, bottom: 30, left: 30};

    minX = d3.min(nodes, d => d.x);
    maxX = d3.max(nodes, d => d.x);
    minY = d3.min(nodes, d => d.y);
    maxY = d3.max(nodes, d => d.y);

    var width = maxX - minX;
    var height = maxY - minY;

    xScale = d3.scaleLinear()
    .domain([minX, maxX]) 
    .range([margin.left, width - margin.left - margin.right])

    yScale = d3.scaleLinear()
    .domain([minY, maxY]) 
    .range([margin.top, height - margin.top - margin.bottom])

    svg.attr('viewBox','0 0 '+width+' '+height)
    svg.attr('preserveAspectRatio', 'xMidYMid meet')

    //var g = svg.append('g')
    svg.selectAll("*").remove();
    svg.append("g")
        .attr("id", "links");

    var node = svg.append("g")
        .attr('class', 'nodes')
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 2)
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); }) 
}

function drawStraight(svg){
    
    Gen = d3.line().curve(d3.curveBundle.beta(0.0)).x(d => xScale(d.x)).y(d => yScale(d.y));
    links.forEach(element => {
        element.lineString = Gen(element.unbundledCP);
    })

    var link = svg.select('#links').selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', function(d) { return d.lineString;	})
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr('opacity', 0.3)
        // .data(links)
        // .enter()
        // .append("line")
        // .attr("stroke-width", 2)
        // .attr("stroke", "#aaaaaa")
        // .attr("fill","none")
        // .attr("x1", function(d) { return xScale(nodeDict[d.source].x); })
        // .attr("y1", function(d) { return yScale(nodeDict[d.source].y); })
        // .attr("x2", function(d) { return xScale(nodeDict[d.target].x); })
        // .attr("y2", function(d) { return yScale(nodeDict[d.target].y); });
}

function drawBundled(svg){
    if (!bundled) {
        edgePathBundling();
        updateBundleStrength();
        bundled = true;
    }

    Gen = d3.line().curve(d3.curveBasis).x(d => xScale(d.x)).y(d => yScale(d.y));
    
    var link = svg.select('#links').selectAll('path').each(function (d) {
        d3.select(this).transition()
            .duration(1000)
            .attrTween("d", pathTween(Gen(d.controlpointsBundled), 4));
    });
}

function resetBundling(svg){
    Gen = d3.line().curve(d3.curveBundle.beta(0.0)).x(d => xScale(d.x)).y(d => yScale(d.y));
    links.forEach(element => {
        element.lineString = Gen(element.unbundledCP);
    })

    svg.select('#links').selectAll('path').each(function (d) {
        d3.select(this).transition()
            .duration(1000)
            .attrTween("d", pathTween(Gen(d.controlpointsBundled), 4));
    });
}

function updateBundleStrength() {
    links.forEach(element => {
        if (bundleStrength == 0) {
            element.controlpointsBundled = element.controlpoints;
        }
        else {
            if (!element.bundled)  {
                return;
            }
            element.controlpointsBundled = element.controlpoints;

            for (i = 0; i < bundleStrength; i++) {
                var newCP = []
                var cp0 = element.controlpointsBundled[0];
                newCP.push(cp0);

                for (j = 0; j < element.controlpointsBundled.length - 1; j++) {
                    p1 =  element.controlpointsBundled[j]
                    p2 = element.controlpointsBundled[j + 1]
                
                    var p3 = {};
                    p3.x = p1.x - (p1.x - p2.x) / 2;
                    p3.y = p1.y - (p1.y - p2.y) / 2;

                    newCP.push(p3);
                    newCP.push(p2);
                }

                element.controlpointsBundled = newCP;
            }
        }
    });
}

function setBundleStrength(value) {
    bundleStrength = value;
    bundled = false;
}

function updateWeights(value) {
    links.forEach(element => {
        element.weight = Math.pow(element.dist, value);
    });
    bundled = false;
}

function setMaxDistortion(value) {
    maxDistortion = value;
    bundled = false;
}

// function edgePathBundling() {
//     var t0 = performance.now()

//     links.forEach(element => {
            
//         if (element.locked){
//             return;
//         }
        
//         src = element.source
//         tgt = element.target
        
//         element.bundled = true

//         path = dijkstra(src, tgt)
//         if (path.length > 2) {
//             var last = path[0];
//             var pLen = 0;
//             for(i = 1; i < path.length; i++) {
//                 next = path[i]
                
//                 pLen += dist(last, next)
//                 last = next
//             }

//             if (pLen > maxDistortion * element.dist) {
//                 element.bundled = false;
//             } 
//             else 
//             {
//                 var last = path[0];
//                 var cp = [last]
//                 for(i = 1; i < path.length; i++) {
//                     next = path[i]

//                     id = adj[last.id][next.id]
//                     edge = linkDict[id]

//                     edge.locked = true
//                     cp.push(next)

//                     last = next
//                 }
//                 element['controlpoints'] = cp
//             }               
//         } else {
//             element.bundled = false
//         }
//     });


//     var t1 = performance.now()
//     console.log("Bundling took " + (t1 - t0) + " milliseconds.")
// }

function edgePathBundling() {
    var t0 = performance.now()

    nodes.forEach(element => {
        neighbours[element.id] = new Set(element.neighbours);
    });

    links.forEach(element => {
            
        if (element.locked){
            return;
        }
        
        src = element.source
        tgt = element.target

        neighbours[tgt].delete(src);
        neighbours[src].delete(tgt);

        path = dijkstra2(src, tgt)
        if (path.length > 2) {
            var pLen = 0;
            var last = nodeDict[path[0]];

            for(i = path.length - 1; i > 0; i--) {
                next = nodeDict[path[i]];
                
                pLen += dist(last, next)
                last = next
            }

            if (pLen > 2.5 * element.dist) {
                element['controlpoints'] = [nodeDict[src], nodeDict[tgt]]

                neighbours[tgt].add(src);
                neighbours[src].add(tgt);
            } 
            else 
            {
                var last = nodeDict[path.pop()];
                var cp = [last]
                while(path.length > 0){
                    next = nodeDict[path.pop()];

                    id = adj[last.id][next.id]
                    edge = linkDict[id]
                    edge.locked = true

                    cp.push(next)
                    last = next
                }

                element['controlpoints'] = cp
            }               
        } else {
            element['controlpoints'] = [nodeDict[src], nodeDict[tgt]]

            neighbours[tgt].add(src);
            neighbours[src].add(tgt);
        }
    });


    var t1 = performance.now()
    console.log("Bundling took " + (t1 - t0) + " milliseconds.")
}

function dijkstra2(src, tgt) {

    (cost = []).length = n; 
    cost.fill(1000000);
    cost[src] = 0;

    (pred = []).length = n;
    pred.fill(-1);

    idNodeDict = {}
    queue = new FibonacciHeap();
    var node = queue.insert(0, src);
    idNodeDict[src] = node;

    while (!queue.isEmpty()) {
        best = queue.extractMinimum();
        best = best.value;

        if(cost[best] > cost[tgt]) 
            break;

        neighbours[best].forEach(next => {
            c = cost[best] + weight[best][next];

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

    cp = [tgt]
    p = tgt
    while(true) {
        p = pred[p];
        cp.push(p);

        if (p === src)
            return cp
        if (p <= 0)
            return []
    }
}

function dijkstra(src, tgt) {

    for (const [key, value] of Object.entries(nodeDict)) {
        value['cost'] = 99999
        value['pred'] = null
    }

    nodeDict[src]['cost'] = 0
    nodeDict[src]['pred'] = nodeDict[src]
    queue = []

    for(i = 0; i < nodeDict[src]['neighbours'].length; i++) {
        edge = linkDict[nodeDict[src]['edges'][i]];
        if(edge['bundled'])
            continue;
        
        node = nodeDict[nodeDict[src]['neighbours'][i]];
        
        node['cost'] = edge['weight'];
        node['pred'] = nodeDict[src];
        queue.push(node);
    }
    
    while(queue.length > 0) {
        queue.sort(function(a, b) {
            return a['cost'] - b['cost'];
        });
        
        best = queue.shift();

        c = best['cost'];

        if (nodeDict[tgt][['cost'] < c])
            break;

        for(i = 0; i < best['neighbours'].length; i++) {
            edge = linkDict[best['edges'][i]];
            if(edge['bundled'])
                continue;

            node = nodeDict[best['neighbours'][i]];
            if (node['cost'] > c + edge['weight']) {
                node['cost'] = c + edge['weight']

                if (node['pred'] === null) {
                    queue.push(node)
                }
                node['pred'] = best
            }
            
        }
    }

    if (nodeDict[tgt]['pred'] === null) 
        return []

    next = nodeDict[tgt]
    path = [next]

    while(next != nodeDict[src]) {
        next = next['pred']
        path.push(next)
    }
    
    return path;
}

function dijkstra15(src, tgt) {

    (cost = []).length = n; 
    cost.fill(1000000);

    (pred = []).length = n;
    pred.fill(-1);

    queue = []
    queue.push(src)

    cost[src] = 0;

    while (queue.length > 0) {
        queue.sort(function(a, b) {
            return cost[b] - cost[a];
        });

        best = queue.pop();

        if(cost[best] > cost[tgt]) 
            break;

        neighbours[best].forEach(next => {
            c = cost[best] + weight[best][next];

            if (cost[next] > c) {
                if(pred[next] < 0) {
                    queue.push(next);
                }

                pred[next] = best;
                cost[next] = c;
            }
        });


    }

    cp = [tgt]
    p = tgt
    while(true) {
        p = pred[p];
        cp.push(p);

        if (p === src)
            return cp
        if (p <= 0)
            return []
    }
}

function dist(src, tgt) {
    return math.sqrt(math.pow(src.x-tgt.x, 2) + math.pow(src.y-tgt.y, 2))
}

function assignColor(p1, p2) {
    var dX = p2.x - p1.x;
    var dY = p2.y - p1.y;

    var angle = Math.atan2(dY, dX);
    var degrees = 180 * angle / Math.PI;
    degrees = (360 + Math.round(degrees)) % 360;

    if (degrees < 22.5)
        return "#733957"
    else if (degrees < 67.5)
        return "#8e4830"
    else if (degrees < 112.5)
        return "#b58837"
    else if (degrees < 157.5)
        return "#d6d389"
    else if (degrees < 202.5)
        return "#abdbca"
    else if (degrees < 247.5)
        return "#5ea6c8"
    else if (degrees < 292.5)
        return "#55609a"
    else if (degrees < 337.5)
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

function pathTween(d1, precision) {
    // An interpolator factory: a function that returns a function.
    // d1: The target path (a string containing a series of path descriptions).
    // precision: The precision to sample the source and target paths.
    return function () {
        var path0 = this,
            path1 = path0.cloneNode(),
            n0 = path0.getTotalLength(),
            n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

        // Uniformly sample either the source or target path, whichever is longer.
        var distances = [0],
            i = 0,
            dt = precision / Math.max(n0, n1);

        while ((i += dt) < 1) {
            distances.push(i);
        }

        distances.push(1);

        // Get an interpolator for each pair of points.
        var points = distances.map(function (distance) {
            var p0 = path0.getPointAtLength(distance * n0),
                p1 = path1.getPointAtLength(distance * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });

        // Here, `p` is the current interpolator.
        // We join the interpolated points using the `Lineto` path command.
        return function(t) {
            return t < 1 ? "M" + points.map(function (p) { return p(t); }).join("L") : d1;
        }
    }
}