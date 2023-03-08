var VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        varying vec4 v_Color;
        uniform mat4 u_modelMatrix;
        void main(){
            gl_Position = u_modelMatrix * a_Position;
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

function createProgram(gl, vertexShader, fragmentShader){
    //create the program and attach the shaders
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    //if success, return the program. if not, log the program info, and delete it.
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program;
    }
    alert(gl.getProgramInfoLog(program) + "");
    gl.deleteProgram(program);
}

function compileShader(gl, vShaderText, fShaderText){
    //////Build vertex and fragment shader objects
    var vertexShader = gl.createShader(gl.VERTEX_SHADER)
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    //The way to  set up shader text source
    gl.shaderSource(vertexShader, vShaderText)
    gl.shaderSource(fragmentShader, fShaderText)
    //compile vertex shader
    gl.compileShader(vertexShader)
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        console.log('vertex shader ereror');
        var message = gl.getShaderInfoLog(vertexShader); 
        console.log(message);//print shader compiling error message
    }
    //compile fragment shader
    gl.compileShader(fragmentShader)
    if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
        console.log('fragment shader ereror');
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

function initArrayBuffer( gl, data, num, type, attribute){
    var buffer = gl.createBuffer();
    if(!buffer){
        console.log("failed to create the buffere object");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    var a_attribute = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), attribute);

    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);

    return true;
}

var transformMat = new Matrix4();
var matStack = [];
var u_modelMatrix;
function pushMatrix(){
    matStack.push(new Matrix4(transformMat));
}
function popMatrix(){
    transformMat = matStack.pop();
}
//variables for tx, red,green and yellow arms angle 
var tx = 0;
var ty = 0;
var rs = 1;
var joint1Angle = 0;
var joint2Angle = 0;
var joint3Angle = 0;

function main(){
    //////Get the canvas context
    var canvas = document.getElementById('webgl');
    var gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }

    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    redraw(gl); //call redarw here to show the initial image

    //setup the call back function of rs Sliders
    var rsSlider = document.getElementById("robotSize");
    rsSlider.oninput = function() {
        rs = this.value/80; 
        redraw(gl);
    }

    //setup the call back function of tx and ty Sliders
    var txSlider = document.getElementById("Translate-X");
    txSlider.oninput = function() {
        tx = this.value / 100.0; //convert sliders value to -1 to +1
        redraw(gl);
    }
    var tySlider = document.getElementById("Translate-Y");
    tySlider.oninput = function() {
        ty = this.value / 100.0; //convert sliders value to -1 to +1
        redraw(gl);
    }

    //setup the call back function of red arm rotation Sliders
    var jointRedSlider = document.getElementById("joint1");
    jointRedSlider.oninput = function() {
        joint1Angle = this.value;
        redraw(gl);
    }

    //setup the call back function of green arm rotation Sliders
    var jointGreenSlider = document.getElementById("joint2");
    jointGreenSlider.oninput = function() {
        joint2Angle = this.value; //convert sliders value to 0 to 45 degrees
        redraw(gl);
    }

    //setup the call back function of yellow arm rotation Sliders
    var jointYellowSlider = document.getElementById("joint3");
    jointYellowSlider.oninput = function() {
        joint3Angle = this.value *  -1; //convert sliders value to 0 to -45 degrees
        redraw(gl);
    }
}

const center = [0, 0]; // 圓心
const radius = 0.1; // 半徑
const count = 30; // 多邊形邊數
const positions = [];
const posColor = [];
function getCirPosition(c1, c2, c3) {
    for (let i = 0; i <= count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const pointX = radius * Math.cos(angle) + center[0];
    const pointY = radius * Math.sin(angle) + center[1];
    positions.push(pointX, pointY, 0);
    if(i%2 === 0){
        positions.push(center[0], center[1], 0);
        posColor.push(c1, c2, c3);
    }
    posColor.push(c1, c2, c3);
    }
}

//Call this funtion when we have to update the screen (eg. user input happens)
function redraw(gl)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    u_modelMatrix = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'u_modelMatrix');
    triVertices = [0.0, 0.5, -0.43, -0.25, 0.43, -0.25];    
    rectVertices = [-0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5]; 
    // triVertices = [0.0, 0.5*rs, -0.43*rs, -0.25*rs, 0.43*rs, -0.25*rs];    
    // rectVertices = [-0.5*rs, 0.5*rs, 0.5*rs, 0.5*rs, -0.5*rs, -0.5*rs, 0.5*rs, -0.5*rs]; 
    var t_redColor = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0 ];
    var t_yellowColor = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0 ];
    // var q_redColor = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0 ];
    var q_greenColor = [0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0 ];
    var q_grayColor = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7 ];
    // var q_blueColor = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0 ];
    // var q_yellowColor = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0 ];


//1
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(q_greenColor), 3, gl.FLOAT, 'a_Color');
    transformMat.setIdentity();
    transformMat.translate(tx, -0.4+ty, 0.0);
    transformMat.scale(rs, rs, 0.0);
    pushMatrix();
    transformMat.scale(0.2, 0.12, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the green one
//circle
    popMatrix();
    getCirPosition(1.0, 0.0, 1.0);
    buffer0 = initArrayBuffer(gl, new Float32Array(positions), 3, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(posColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, 0.0, 0.0);
    transformMat.translate(0.05, -0.08, 0.0);
    pushMatrix();
    transformMat.scale(0.3, 0.3, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 3);
//circle
    popMatrix();
    getCirPosition(1.0, 0.0, 1.0);
    buffer0 = initArrayBuffer(gl, new Float32Array(positions), 3, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(posColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, 0.0, 0.0);
    transformMat.translate(-0.10, 0.0, 0.0);
    pushMatrix();
    transformMat.scale(0.3, 0.3, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 3);

//2
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(triVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(t_yellowColor), 3, gl.FLOAT, 'a_Color');
    pushMatrix();
    transformMat.translate(0.05, -0.22, 0.0);
    transformMat.translate(0.0, 0.38, 0.0);
    transformMat.scale(0.09, 0.09, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLES, 0, triVertices.length/2);//draw the yellow one
//circle
    popMatrix();
    getCirPosition(1.0, 0.0, 1.0);
    buffer0 = initArrayBuffer(gl, new Float32Array(positions), 3, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(posColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.05, 0.22, 0.0);
    transformMat.rotate(joint1Angle, 0.0, 0.0, 1.0);
    transformMat.translate(0.0, 0.015, 0.0);
    pushMatrix();
    transformMat.scale(0.3, 0.3, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 3);
//3
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(q_grayColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, -0.1, 0.0);
    transformMat.translate(0.0, 0.179, 0.0);
    pushMatrix(); 
    transformMat.scale(0.055, 0.1, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the gray one
//circle
    popMatrix();
    getCirPosition(1.0, 0.0, 1.0);
    buffer0 = initArrayBuffer(gl, new Float32Array(positions), 3, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(posColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, 0.075, 0.0);
    transformMat.rotate(joint2Angle, 0.0, 0.0, 1.0);
    transformMat.translate(0.0, 0.002, 0.0);
    pushMatrix();
    transformMat.scale(0.3, 0.3, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 3);
//4
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(rectVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(q_grayColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, -0.1, 0.0);
    transformMat.translate(0.0, 0.18, 0.0);
    pushMatrix(); 
    transformMat.scale(0.055, 0.1, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, rectVertices.length/2);//draw the gray one

//circle
    popMatrix();
    getCirPosition(1.0, 0.0, 1.0);
    buffer0 = initArrayBuffer(gl, new Float32Array(positions), 3, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(posColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, 0.075, 0.0);
    transformMat.rotate(-joint3Angle, 0.0, 0.0, 1.0);
    transformMat.translate(0.0, 0.003, 0.0);
    pushMatrix();
    transformMat.scale(0.3, 0.3, 0.0);
    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 3);
// last
    popMatrix();
    buffer0 = initArrayBuffer(gl, new Float32Array(triVertices), 2, gl.FLOAT, 'a_Position');
    buffer1 = initArrayBuffer(gl, new Float32Array(t_redColor), 3, gl.FLOAT, 'a_Color');
    transformMat.translate(0.0, -0.1, 0.0);
    transformMat.translate(0.0, 0.175, 0.0);
    pushMatrix(); 
    transformMat.scale(-0.09, -0.09, 0.0);

    gl.uniformMatrix4fv(u_modelMatrix, false, transformMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triVertices.length/2);//draw the red one
}
