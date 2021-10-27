
var svg;
var EPB;
var Renderer;
var width, height;

window.onload = function () {
    resetInput()
    Render = new Render('#Canvas');
    
    var container = document.getElementById('VizContainer');
    var canvas = document.getElementById('Canvas');
    
    ({ width, height } = container.getBoundingClientRect());
    
    canvas.width = width;
    canvas.height = height;

    d3.json('./data/simple.json').then(function(data){
        bundled = false;

        nodes = data['nodes'];
        links = data['links'];

        EBP = new EdgePathBundling(nodes, links, width, height);
    }).then(function(){
        EBP.drawGraphStraight(Render);
    });
}

function resetInput() {
    document.getElementById("customRange1").value = 2;
    document.getElementById("customRange2").value = 2;
    document.getElementById("customRange3").value = 1;
    document.getElementById("isInteractive").checked = false;
    document.getElementById("isAnimated").checked = false;

    document.getElementById('label1').innerHTML = 'Distortion: 2.0'
    document.getElementById('label2').innerHTML = 'Weight factor: 2.0'
    document.getElementById('label3').innerHTML = 'Bundle strength: 1'
}

function clickDatasetButton(path) {
    resetInput()
    d3.json(path).then(function(data){
        bundled = false;

        nodes = data['nodes'];
        links = data['links'];

        EBP = new EdgePathBundling(nodes, links, width, height);
    }).then(function(){
        EBP.drawGraphStraight(Render);
    });
}

function clickBundleButton() {
    EBP.bundle();
    EBP.subdivision();
    
    if(document.getElementById("isAnimated").checked)
        EBP.animate(Render, 100, 5);
    else 
        EBP.drawGraphBundled(Render);
}


function clickReset() {
    EBP.drawGraphStraight(Render);
}

function bundleStrengthChanged(value) {

    document.getElementById('label3').innerHTML = 'Bundle strength: ' + value

    EBP.setBundlingStrength(value);
    EBP.subdivision();
    
    if(document.getElementById("isAnimated").checked)
        EBP.animate(Render, 10, 200);
    else 
        EBP.drawGraphBundled(Render);
}

function distWeightsChanged(value) {
    document.getElementById('label2').innerHTML = 'Weight factor: ' + value;

    EBP.setWeight(value);

    if(document.getElementById("isInteractive").checked){ 
        EBP.bundle();
        EBP.subdivision();

        if(document.getElementById("isAnimated").checked)
            EBP.animate(Render, 10, 200);
        else 
            EBP.drawGraphBundled(Render);
    }
}

function maxDistortionChanged(value) {
    document.getElementById('label1').innerHTML = 'Distortion: ' + value;
    EBP.setDistortion(value);
    
    if(document.getElementById("isInteractive").checked){ 
        EBP.bundle();
        EBP.subdivision();

        if(document.getElementById("isAnimated").checked)
            EBP.animate(Render, 10, 200);
        else 
            EBP.drawGraphBundled(Render);
    }
}



// function clickDatasetButton(path) {
//     loadDataset(path, svg)
// }

// function clickReset() {
//     resetBundling(svg)
// }

// function bundleStrengthChanged(value) {
//     setBundleStrength(value);
//     drawBundled(svg);
// }

// function distWeightsChanged(value) {
//     updateWeights(value);
//     drawBundled(svg);
// }

// function maxDistortionChanged(value) {
//     setMaxDistortion(value);
//     drawBundled(svg);
// }
