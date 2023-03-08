//This tempalte is just for your reference
//You do not have to follow this template 
//You are very welcome to write your program from scratch

//shader
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main(){
        gl_Position = a_Position;
        gl_PointSize = 5.0;
        v_Color = a_Color;
    }
    `;

var FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main(){
        gl_FragColor = v_Color;
    }
    `;


// p: point, h: hori line: v: verti line, t: triangle, q: square, c: circle
var shapeFlag = 'p'; 
var colorFlag = 'r'; //r g b 
var g_points = [];
var g_horiLines = [];
var g_vertiLines = [];
var g_triangles = [];
var g_squares = [];
var g_circles = [];

var Color = {
    'r': [1.0, 0.0, 0.0],
    'g': [0.0, 1.0, 0.0],
    'b': [0.0, 0.0, 1.0],
}

//var ... of course you may need more variables

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText);
    gl.shaderSource(fragmentShader, fShaderText);
    //compile vertex shader
    gl.compileShader(vertexShader);
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader error');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader);
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader error');
        var message = gl.getShaderInfoLog(fragmentShader);
        console.log(message);//print shader compiling error message
    }

    /////link shader to program (by a self-define function)
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //if not success, log the program info, and delete it.
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        alert(gl.getProgramInfoLog(program) + "");
        gl.deleteProgram(program);
    }

    return program;
}
function main(){
    //////Get the canvas context
    var canvas = document.getElementById('webgl');
    // var gl = canvas.getContext('webgl') || canvas.getContext('exprimental-webgl') ;
    var gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    // compile shader and use program
    let renderProgram = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE); 
    gl.useProgram(renderProgram);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    // mouse and key event...
    canvas.onmousedown = function(ev){click(ev, gl, renderProgram, canvas)};
    document.onkeydown = function(ev){keydown(ev)};
}



function keydown(ev){ //you may want to define more arguments for this function
    //implment keydown event here

    if(ev.key === 'r'){ //an example for user press 'r'... 
        colorFlag = 'r';
    }
    else if(ev.key === 'g'){
        colorFlag = 'g';
    }
    else if(ev.key === 'b'){
        colorFlag = 'b';
    }

    if(ev.key === 'p'){
        shapeFlag = 'p';
    }
    else if(ev.key === 'h'){
        shapeFlag = 'h';
    }
    else if(ev.key === 'v'){
        shapeFlag = 'v';
    }
    else if(ev.key === 't'){
        shapeFlag = 't';
    }
    else if(ev.key === 'q'){
        shapeFlag = 'q';
    }
}

function click(ev, gl, program, canvas){ //you may want to define more arguments for this function
    //mouse click: recall our quiz1 in calss
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.height/2)/(canvas.height/2);
    y = (canvas.width/2 - (y - rect.top))/(canvas.height/2);

    //you might want to do something here
    if(shapeFlag == 'p' ){
        g_points.push([x,y].concat(Color[colorFlag]))
        // console.debug(g_points)
        if(g_points.length>5){
            g_points.shift();
        }
        // g_points = g_points.concat([x,y]).concat(Color[colorFlag]);
    }
    else if(shapeFlag == 'h' ){
        g_horiLines.push([1.0, y].concat(Color[colorFlag]));
        g_horiLines.push([-1.0, y].concat(Color[colorFlag]));
        if(g_horiLines.length > 10){
            g_horiLines = g_horiLines.slice(2);
        }
    }
    else if(shapeFlag == 'v' ){
        g_vertiLines.push([x, 1.0].concat(Color[colorFlag]));
        g_vertiLines.push([x, -1.0].concat(Color[colorFlag]));
        if(g_vertiLines.length > 10){
            g_vertiLines = g_vertiLines.slice(2);
        }
    }
    else if(shapeFlag == 't' ){
        g_triangles.push([x, y+0.05].concat(Color[colorFlag]));
        g_triangles.push([x-0.0435, y-0.025].concat(Color[colorFlag]));
        g_triangles.push([x+0.0435, y-0.025].concat(Color[colorFlag]));
        if(g_triangles.length > 15){
            g_triangles = g_triangles.slice(3);
        }
    }
    else if(shapeFlag == 'q' ){
        g_squares.push([x-0.04, y+0.04].concat(Color[colorFlag]));
        g_squares.push([x-0.04, y-0.04].concat(Color[colorFlag]));
        g_squares.push([x+0.04, y+0.04].concat(Color[colorFlag]));
       
        g_squares.push([x+0.04, y+0.04].concat(Color[colorFlag]));
        g_squares.push([x-0.04, y-0.04].concat(Color[colorFlag]));
        g_squares.push([x+0.04, y-0.04].concat(Color[colorFlag]));

        if(g_squares.length > 30){
            g_squares = g_squares.slice(6);
        }
    }

// console.log("g_point" + g_points);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //self-define draw() function
    //I suggest that you can clear the canvas
    //and redraw whole frame(canvas) after any mouse click
    draw_h(gl, program);
    draw_p(gl, program);
    draw_v(gl, program);
    draw_t(gl, program);
    draw_q(gl, program);
}



function draw_p(gl, program){ //you may want to define more arguments for this function
    //redraw whole canvas here
    //Note: you are only allowed to same shapes of this frame by single gl.drawArrays() call
    let f32 = new Float32Array(g_points.flat());
console.debug(f32);
    var vectexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vectexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
    var FSIZE = (f32.BYTES_PER_ELEMENT);

// console.log("g_points: " + new Float32Array(g_points));
// console.log("n1: " + g_points.length);

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);

    // console.debug(g_points.length)
    gl.drawArrays(gl.POINTS, 0, f32.length/5);
}

function draw_h(gl, program){
    let f32 = new Float32Array(g_horiLines.flat());
    var vectexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vectexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
    var FSIZE = f32.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);


    gl.drawArrays(gl.LINES, 0, f32.length/5);
}

function draw_v(gl, program){
    let f32 = new Float32Array(g_vertiLines.flat());
    var vectexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vectexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
    var FSIZE = f32.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);

    gl.drawArrays(gl.LINES, 0, f32.length/5);
}

function draw_t(gl, program){
    let f32 = new Float32Array(g_triangles.flat());
    var vectexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vectexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
    var FSIZE = f32.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);

    gl.drawArrays(gl.TRIANGLES, 0, f32.length/5);
}

function draw_q(gl, program){
    let f32 = new Float32Array(g_squares.flat());
    var vectexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vectexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);
    var FSIZE = f32.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE*5, 0);
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(program, 'a_Color');
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*5, FSIZE*2);
    gl.enableVertexAttribArray(a_Color);

    gl.drawArrays(gl.TRIANGLES, 0, f32.length/5);
}