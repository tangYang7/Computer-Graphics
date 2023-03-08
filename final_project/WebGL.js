var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_modelMatrix;
    uniform mat4 u_normalMatrix;
    // uniform mat4 u_MvpMatrixOfLight;
    // varying vec4 v_PositionFromLight;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
        v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
        v_TexCoord = a_TexCoord;
        // v_PositionFromLight = u_MvpMatrixOfLight * a_Position; //for shadow
    }
`;
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_LightPosition;
    uniform vec3 u_ViewPosition;
    uniform float u_Ka;
    uniform float u_Kd;
    uniform float u_Ks;
    uniform float u_shininess;

    uniform sampler2D u_Sampler;
    // uniform sampler2D u_Sampler2;
    
    // uniform sampler2D u_ShadowMap;
    // varying vec4 v_PositionFromLight;
    varying vec3 v_Normal;
    varying vec3 v_PositionInWorld;
    varying vec2 v_TexCoord;
    const float deMachThreshold = 0.005; //0.001 if having high precision depth
    void main(){
        vec3 texColor1 = texture2D( u_Sampler, v_TexCoord ).rgb;
        // vec3 texColor2 = texture2D( u_Sampler2, v_TexCoord ).rgb;
        vec3 texColor  = texColor1;

        vec3 ambientLightColor = texColor;
        vec3 diffuseLightColor = texColor;

        vec3 specularLightColor = vec3(1.0, 1.0, 1.0);        

        vec3 ambient = ambientLightColor * u_Ka;

        // vec3 normal = normalize(v_Normal);
        vec3 normal = normalize(u_LightPosition * v_Normal).xyz;
        
        vec3 lightDirection = normalize(u_LightPosition - v_PositionInWorld);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diffuseLightColor * u_Kd * nDotL;

        vec3 specular = vec3(0.0, 0.0, 0.0);
        if(nDotL > 0.0) {
            vec3 R = reflect(-lightDirection, normal);
            // V: the vector, point to viewer       
            vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
            float specAngle = clamp(dot(R, V), 0.0, 1.0);
            specular = u_Ks * pow(specAngle, u_shininess) * specularLightColor; 
        }
        gl_FragColor = vec4( ambient + diffuse + specular, 1.0 );

        //***** shadow
        // vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        // vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
        // /////////******** LOW precision depth implementation ********///////////
        // float depth = rgbaDepth.r;
        // float visibility = (shadowCoord.z > depth + deMachThreshold) ? 0.3 : 1.0;
  
        // gl_FragColor = vec4( (ambient + diffuse + specular)*visibility, 1.0);
    }
`;

var VSHADER_SHADOW_SOURCE = `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;
      void main(){
          gl_Position = u_MvpMatrix * a_Position;
      }
`;
var FSHADER_SHADOW_SOURCE = `
      precision mediump float;
      void main(){
        /////////** LOW precision depth implementation **/////
        gl_FragColor = vec4(gl_FragCoord.z, 0, 0, 1.0);
      }
`;

var VSHADER_SOURCE_ENVCUBE = `
    attribute vec4 a_Position;
    varying vec4 v_Position;
    void main() {
      v_Position = a_Position;
      gl_Position = a_Position;
    } 
`;
var FSHADER_SOURCE_ENVCUBE = `
    precision mediump float;
    uniform samplerCube u_envCubeMap;
    uniform mat4 u_viewDirectionProjectionInverse;
    varying vec4 v_Position;
    void main() {
      vec4 t = u_viewDirectionProjectionInverse * v_Position;
      gl_FragColor = textureCube(u_envCubeMap, normalize(t.xyz / t.w));
    }
`;

var VSHADER_SOURCE_TEXTURE_ON_CUBE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  uniform mat4 u_MvpMatrix;
  uniform mat4 u_modelMatrix;
  uniform mat4 u_normalMatrix;
  varying vec4 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_Position;
    v_PositionInWorld = (u_modelMatrix * a_Position).xyz; 
    v_Normal = normalize(vec3(u_normalMatrix * a_Normal));
  } 
`;
var FSHADER_SOURCE_TEXTURE_ON_CUBE = `
  precision mediump float;
  varying vec4 v_TexCoord;
  uniform vec3 u_ViewPosition;
  uniform vec3 u_Color;
  uniform samplerCube u_envCubeMap;
  varying vec3 v_Normal;
  varying vec3 v_PositionInWorld;
  void main() {
    vec3 V = normalize(u_ViewPosition - v_PositionInWorld); 
    vec3 normal = normalize(v_Normal);
    vec3 R = reflect(-V, normal);
    gl_FragColor = vec4(0.78 * textureCube(u_envCubeMap, R).rgb + 0.3 * u_Color, 1.0);
  }
`;

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

/////BEGIN:///////////////////////////////////////////////////////////////////////////////////////////////
/////The following three function is for creating vertex buffer, but link to shader to user later/////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////
function initAttributeVariable(gl, a_attribute, buffer){
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initVertexBufferForLaterUse(gl, vertices, normals, texCoords){
  var nVertices = vertices.length / 3;

  var o = new Object();
  o.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(vertices), 3, gl.FLOAT);
  if( normals != null ) o.normalBuffer = initArrayBufferForLaterUse(gl, new Float32Array(normals), 3, gl.FLOAT);
  if( texCoords != null ) o.texCoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT);
  //you can have error check here
  o.numVertices = nVertices;

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}
/////END://///////////////////////////////////////////////////////////////////////////////////////////////
/////The following three function is for creating vertex buffer, but link to shader to user later/////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////



var mouseLastX, mouseLastY;
var mouseDragging = false;
var angleX = 0, angleY = 0;
var gl, canvas;
var mvpMatrix;
var modelMatrix;
var normalMatrix;
var nVertex;
var cameraX = 0, cameraY = 0, cameraZ = -10;
var lightX = -2, lightY = 3, lightZ = -2;
var cameraX, cameraY, cameraZ ;
var matStack = [];
var dragon = [];
var tai = [];
var ad = [];
var orange = [];
var cube = [];
var cubeObj = [];

var rs = 1;
var offScreenWidth = 700, offScreenHeight = 700;
// var offScreenWidth = 800, offScreenHeight = 800;
var fbo0;
var fbo;
var FirstMode = false;//TODO
var F_cameraX = 0, F_cameraY = 0, F_cameraZ = -10 ;

var textures = {};
var imgNames = ["./tai-obj/Head.png", "./tai-obj/Tai.png"];
var objCompImgIndex = ["./tai-obj/Head.png", "./tai-obj/Tai.png"];
var imgNames2 = ["./orange-dragon-obj/color-map-dents.png", "./orange-dragon-obj/color-map-eye.jpg"];
var objCompImgIndex2 = ["./orange-dragon-obj/color-map-dents.png", "./orange-dragon-obj/color-map-eye.jpg"];
var texCount = 0;
var numTextures = imgNames.length;

var cameraDirX = 0, cameraDirY = 0, cameraDirZ = -1;
var quadObj;
var cubeMapTex;
var moveDistance = 0;
var moveDistance2 = 0;
var rotateAngle = 0;
var spMvpFromLight;

async function main(){
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl2');
    if(!gl){
        console.log('Failed to get the rendering context for WebGL');
        return ;
    }
    var quad = new Float32Array(
      [
        -1, -1, 1,
         1, -1, 1,
        -1,  1, 1,
        -1,  1, 1,
         1, -1, 1,
         1,  1, 1
    ]); //just a quad
      
    program = compileShader(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    program.a_Position = gl.getAttribLocation(program, 'a_Position'); 
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal'); 
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord'); ///////
    program.u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix'); 
    program.u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix'); 
    program.u_normalMatrix = gl.getUniformLocation(program, 'u_normalMatrix');
    program.u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    program.u_ViewPosition = gl.getUniformLocation(program, 'u_ViewPosition');
    // program.u_MvpMatrixOfLight = gl.getUniformLocation(program, 'u_MvpMatrixOfLight'); 
    program.u_Ka = gl.getUniformLocation(program, 'u_Ka'); 
    program.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    program.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    program.u_shininess = gl.getUniformLocation(program, 'u_shininess');
    // program.u_ShadowMap = gl.getUniformLocation(program, "u_ShadowMap");
    program.u_Sampler = gl.getUniformLocation(program, "u_Sampler"); /////
    // program.u_Sampler2 = gl.getUniformLocation(program, "u_Sampler2"); /////
    
    //setup shaders and prepare shader variables
    shadowProgram = compileShader(gl, VSHADER_SHADOW_SOURCE, FSHADER_SHADOW_SOURCE);
    shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
    shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');

    programTextureOnCube = compileShader(gl, VSHADER_SOURCE_TEXTURE_ON_CUBE, FSHADER_SOURCE_TEXTURE_ON_CUBE);
    programTextureOnCube.a_Position = gl.getAttribLocation(programTextureOnCube, 'a_Position'); 
    programTextureOnCube.a_Normal = gl.getAttribLocation(programTextureOnCube, 'a_Normal'); 
    programTextureOnCube.u_MvpMatrix = gl.getUniformLocation(programTextureOnCube, 'u_MvpMatrix'); 
    programTextureOnCube.u_modelMatrix = gl.getUniformLocation(programTextureOnCube, 'u_modelMatrix'); 
    programTextureOnCube.u_normalMatrix = gl.getUniformLocation(programTextureOnCube, 'u_normalMatrix');
    programTextureOnCube.u_ViewPosition = gl.getUniformLocation(programTextureOnCube, 'u_ViewPosition');
    programTextureOnCube.u_envCubeMap = gl.getUniformLocation(programTextureOnCube, 'u_envCubeMap'); 
    programTextureOnCube.u_Color = gl.getUniformLocation(programTextureOnCube, 'u_Color'); 

    let image_sp = new Image();
    image_sp.onload = function(){initTexture(gl, image_sp, "spTex");};
    image_sp.src = "sphere_Tex.jpg";

    /////3D model a-dragon
    ad = await loadOBJtoCreateVBO('./alduin-dragon1-obj/alduin-dragon1.obj');
    
    let image = new Image();
    image.onload = function(){initTexture(gl, image, "rockTex");};
    image.src = "./dragon-obj/dragon_S.jpg";

    /////3D model dragon
    dragon = await loadOBJtoCreateVBO('./dragon-obj/dragon.obj');    

    let image_dragon = new Image();
    image_dragon.onload = function(){initTexture(gl, image_dragon, "dragonTex");};
    image_dragon.src = "./dragon-obj/dragon_C.jpg";

    /////3D model digimon-digital-monsters-tai
    tai = await loadOBJtoCreateVBO('./tai-obj/digimon-digital-monsters-tai.obj');    

    for( let i=0; i < imgNames.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, imgNames[i]);};
      image.src = imgNames[i];
    }

    /////3D model orange-dragon
    orange = await loadOBJtoCreateVBO('./orange-dragon-obj/orange-dragon.obj');    

    for( let i=0; i < imgNames2.length; i ++ ){
      let image = new Image();
      image.onload = function(){initTexture(gl, image, imgNames2[i]);};
      image.src = imgNames2[i];
    }

    ////3D model cube 
    cubeObj = await loadOBJtoCreateVBO('cube.obj');       
    sphereObj = await loadOBJtoCreateVBO('sphere.obj');
    

    /////////////environment cubemap////////////////
    programEnvCube = compileShader(gl, VSHADER_SOURCE_ENVCUBE, FSHADER_SOURCE_ENVCUBE);
    programEnvCube.a_Position = gl.getAttribLocation(programEnvCube, 'a_Position'); 
    programEnvCube.u_envCubeMap = gl.getUniformLocation(programEnvCube, 'u_envCubeMap'); 
    programEnvCube.u_viewDirectionProjectionInverse = gl.getUniformLocation(programEnvCube, 'u_viewDirectionProjectionInverse'); 
    quadObj = initVertexBufferForLaterUse(gl, quad);
    cubeMapTex = initCubeTexture("pos-x.jpg", "neg-x.jpg", "pos-y.jpg", "neg-y.jpg", 
                                      "pos-z.jpg", "neg-z.jpg", 512, 512);
    // /////////////environment cubemap////////////////

    // fbo0 = initFrameBuffer(gl);
    fbo = initFrameBufferForCubemapRendering(gl);

    mvpMatrix = new Matrix4();
    modelMatrix = new Matrix4();
    normalMatrix = new Matrix4();

    var tick = function() {
      rotateAngle += 3.45;
      draw();//draw it once before mouse move
      requestAnimationFrame(tick);
    }
    tick();

    canvas.onmousedown = function(ev){mouseDown(ev)};
    canvas.onmousemove = function(ev){mouseMove(ev)};
    canvas.onmouseup = function(ev){mouseUp(ev)};
    document.onkeydown = function(ev){keydown(ev)};
}

function draw(){
    renderCubeMap(0, 0, 0);

    F_cameraX = angleX/25-0.05+moveDistance2;
    F_cameraY = -angleY/25+1.25;
    F_cameraZ = -4.3+moveDistance;
    let mdlMatrix = new Matrix4(); //model matrix of objects

    // gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.4,0.4,0.4,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

///////////env cubemap///////////
    let rotateMatrix = new Matrix4();
    rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
    rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
    var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
    var newViewDir = rotateMatrix.multiplyVector3(viewDir);
  
    var vpFromCamera = new Matrix4();
    vpFromCamera.setPerspective(60, 1, 1, 15);
    var viewMatrixRotationOnly = new Matrix4();
    viewMatrixRotationOnly.lookAt(cameraX, cameraY, cameraZ, 
                                  cameraX + newViewDir.elements[0], 
                                  cameraY + newViewDir.elements[1], 
                                  cameraZ + newViewDir.elements[2], 
                                  0, 1, 0);
    viewMatrixRotationOnly.elements[12] = 0; //ignore translation
    viewMatrixRotationOnly.elements[13] = 0;
    viewMatrixRotationOnly.elements[14] = 0;
    vpFromCamera.multiply(viewMatrixRotationOnly);
    var vpFromCameraInverse = vpFromCamera.invert();

///////////env cubemap///////////

    // gl.useProgram(program);
    let vpMatrix = new Matrix4();
    vpMatrix.setPerspective(50, 1, 1, 100);
    if(FirstMode){
      vpMatrix.lookAt(F_cameraX, F_cameraY, F_cameraZ, 0, 0, 800, 0, 1, 0);  
    } else{
      vpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 800, 0, 1, 0);  
    }
    // vpMatrix.lookAt(cameraX, cameraY, cameraZ,   
    //   cameraX + newViewDir.elements[0], 
    //   cameraY + newViewDir.elements[1],
    //   cameraZ + newViewDir.elements[2], 
    //   0, 1, 0);

    drawEnvMap(vpFromCameraInverse);
    drawRegularObjects(vpMatrix);

    // center sphere
    mdlMatrix.setIdentity();
    mdlMatrix.translate(0.0, 0.0, 0.0);
    mdlMatrix.scale(0.2, 0.2, 0.2);
    mdlMatrix.rotate(0, 0, 1, 0);
    drawObjectWithDynamicReflection(sphereObj, mdlMatrix, vpMatrix, 0.9, 0.9, 1.0);
}

function drawRegularObjects(vpMatrix){
// ///// off screen shadow /////
//   gl.useProgram(shadowProgram);
//   gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0);
//   gl.viewport(0, 0, offScreenWidth, offScreenHeight);
//   gl.clearColor(0.0, 0.0, 0.0, 1);
//   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//   gl.enable(gl.DEPTH_TEST);

//   let mdlMatrix = new Matrix4(); //model matrix of objects

//   //dragon
//   mdlMatrix.scale(0.3, 0.3, 0.3);
//   mdlMatrix.rotate(135, 0, 1, 0);
//   let dragonMvpFromLight = drawOffScreen(dragon, mdlMatrix);

//   //ad
//   mdlMatrix.setIdentity();
//   mdlMatrix.setTranslate(angleX/25+1.4, -angleY/25+0.6, 3.0);
//   mdlMatrix.scale(0.003, 0.003, 0.003);
//   mdlMatrix.rotate(135, 0, 1, 0);
//   let adMvpFromLight = drawOffScreen(ad, mdlMatrix);

//   //tai
//   mdlMatrix.setIdentity();
//   mdlMatrix.setTranslate(angleX/25-0.05, -angleY/25+0.25, -2.6+moveDistance);
//   mdlMatrix.scale(0.5, 0.5, 0.5);
//   mdlMatrix.rotate(0, 0, 1, 0);
//   let taiMvpFromLight = drawOffScreen(tai, mdlMatrix);

//   //orange-dragon
//   mdlMatrix.setIdentity();
//   mdlMatrix.setTranslate(angleX/25-0.0, -angleY/25-0.53, -3.2+moveDistance);
//   mdlMatrix.scale(0.2, 0.2, 0.2);
//   mdlMatrix.rotate(0, 0, 1, 0);
//   let odMvpFromLight = drawOffScreen(orange, mdlMatrix);

//   //center sphere
//   mdlMatrix.setIdentity();
//   mdlMatrix.setTranslate(angleX/25-0.0, -angleY/25-0.0, 0.0);
//   mdlMatrix.scale(0.2, 0.2, 0.2);
//   mdlMatrix.rotate(0, 0, 1, 0);
//   spMvpFromLight = drawOffScreen(sphereObj, mdlMatrix);
// ///// off screen shadow /////

  gl.useProgram(program);
  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // gl.viewport(0, 0, canvas.width, canvas.height);
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.enable(gl.DEPTH_TEST);

  let dragonMvpFromLight, adMvpFromLight, taiMvpFromLight, odMvpFromLight, spMvpFromLight;

let mdlMatrix = new Matrix4();
  //dragon
  mdlMatrix.translate(-2.4, -0.6, 3.0);
  mdlMatrix.scale(0.3, 0.3, 0.3);
  mdlMatrix.rotate(135, 0, 1, 0);
  setOneObjectTex(dragonMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < dragon.length; i ++ ){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures["dragonTex"]);
    gl.uniform1i(program.u_Sampler, 0);
    initAttributeVariable(gl, program.a_TexCoord, dragon[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, dragon[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, dragon[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, dragon[i].numVertices);
  }

  //ad
  mdlMatrix.setIdentity();
  mdlMatrix.translate(+1.4, 0.6, 3.0);
  mdlMatrix.scale(0.003, 0.003, 0.003);
  mdlMatrix.rotate(135, 0, 1, 0);
  setOneObjectTex(adMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < ad.length; i ++ ){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures["rockTex"]);
    gl.uniform1i(program.u_Sampler, 0);
    initAttributeVariable(gl, program.a_TexCoord, ad[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, ad[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, ad[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, ad[i].numVertices);
  }

  //tai
  mdlMatrix.setIdentity();
  mdlMatrix.translate(-0.05+moveDistance2, +0.2, -3.7+moveDistance);
  mdlMatrix.scale(0.5, 0.5, 0.5);
  mdlMatrix.rotate(0, 0, 1, 0);
  setOneObjectTex(taiMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < tai.length; i++ ){
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex[i]]);
    gl.uniform1i(program.u_Sampler, 1);

    initAttributeVariable(gl, program.a_TexCoord, tai[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, tai[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, tai[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, tai[i].numVertices);
  }

  //orange-dragon
  mdlMatrix.setIdentity();
  mdlMatrix.translate(-0.0+moveDistance2, -0.58, -4.3+moveDistance);
  mdlMatrix.scale(0.2, 0.2, 0.2);
  mdlMatrix.rotate(0, 0, 1, 0);
  setOneObjectTex(odMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < orange.length; i++ ){
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[objCompImgIndex2[i]]);
    gl.uniform1i(program.u_Sampler, 1);

    initAttributeVariable(gl, program.a_TexCoord, orange[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, orange[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, orange[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, orange[i].numVertices);
  }

  //little sphere
  mdlMatrix.setIdentity();
  mdlMatrix.rotate(rotateAngle, 0, 1, 0);
  mdlMatrix.translate(-1.3, 0.0, 0.0);
  mdlMatrix.scale(0.05, 0.05, 0.05);
  setOneObjectTex(spMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < sphereObj.length; i++ ){
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures["spTex"]);
    gl.uniform1i(program.u_Sampler, 1);

    initAttributeVariable(gl, program.a_TexCoord, sphereObj[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, sphereObj[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, sphereObj[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, sphereObj[i].numVertices);
  }

  //little sphere
  mdlMatrix.setIdentity();
  // mdlMatrix.setTranslate(angleX/25+0.7, -angleY/25-0.0, 0.0);
  mdlMatrix.rotate(rotateAngle, 0, 1, 0);
  mdlMatrix.translate(1.3, -0.0, 0.0);
  mdlMatrix.scale(0.05, 0.05, 0.05);
  setOneObjectTex(spMvpFromLight, mdlMatrix, vpMatrix);
  for( let i=0; i < sphereObj.length; i++ ){
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures["spTex"]);
    gl.uniform1i(program.u_Sampler, 1);

    initAttributeVariable(gl, program.a_TexCoord, sphereObj[i].texCoordBuffer);
    initAttributeVariable(gl, program.a_Position, sphereObj[i].vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, sphereObj[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, sphereObj[i].numVertices);
  }
}
function setOneObjectTex(mvpFromLight, mdlMatrix, vpMatrix){
  //model Matrix (part of the mvp matrix)
  modelMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
  modelMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
  modelMatrix.multiply(mdlMatrix);
  //mvp: projection * view * model matrix 
  mvpMatrix.set(vpMatrix);
  mvpMatrix.multiply(modelMatrix);

  // mvpMatrix.setPerspective(50, 1, 1, 100);
  // if(FirstMode){
  //   mvpMatrix.lookAt(F_cameraX, F_cameraY, F_cameraZ, 0, 0, 300, 0, 1, 0);  
  // } else{
  //   mvpMatrix.lookAt(cameraX, cameraY, cameraZ, 0, 0, 300, 0, 1, 0);  
  // }
  // mvpMatrix.multiply(modelMatrix);

  //normal matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniform3f(program.u_LightPosition, lightX, lightY, lightZ);
  gl.uniform3f(program.u_ViewPosition, cameraX, cameraY, cameraZ);
  gl.uniform1f(program.u_Ka, 0.2);
  gl.uniform1f(program.u_Kd, 0.7);
  gl.uniform1f(program.u_Ks, 1.0);
  gl.uniform1f(program.u_shininess, 10.0);
  // gl.uniform1i(program.u_ShadowMap, 0);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(program.u_modelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(program.u_normalMatrix, false, normalMatrix.elements);
  // gl.uniformMatrix4fv(program.u_MvpMatrixOfLight, false, mvpFromLight.elements);

  // gl.activeTexture(gl.TEXTURE0); 
  // gl.bindTexture(gl.TEXTURE_2D, fbo0.texture); 
  // gl.uniform1i(program.u_Sampler2, 2);
}

function drawOffScreen(obj, mdlMatrix){
  var mvpFromLight = new Matrix4();
  //model Matrix (part of the mvp matrix)
  let modelMatrix = new Matrix4();
  modelMatrix.setRotate(angleY, 1, 0, 0);
  modelMatrix.rotate(angleX, 0, 1, 0);
  modelMatrix.multiply(mdlMatrix);
  //mvp: projection * view * model matrix  
  mvpFromLight.setPerspective(50, offScreenWidth/offScreenHeight, 1, 15);
  mvpFromLight.lookAt(lightX, lightY, lightZ, 0, 0, 0, 0, 1, 0);
  mvpFromLight.multiply(modelMatrix);

  gl.uniformMatrix4fv(shadowProgram.u_MvpMatrix, false, mvpFromLight.elements);

  for( let i=0; i < obj.length; i ++ ){
    initAttributeVariable(gl, shadowProgram.a_Position, obj[i].vertexBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }
  return mvpFromLight;
}
async function loadOBJtoCreateVBO( objFile ){
  let objComponents = [];
  response = await fetch(objFile);
  text = await response.text();
  obj = parseOBJ(text);
  for( let i=0; i < obj.geometries.length; i ++ ){
    let o = initVertexBufferForLaterUse(gl, 
                                        obj.geometries[i].data.position,
                                        obj.geometries[i].data.normal, 
                                        obj.geometries[i].data.texcoord);
    objComponents.push(o);
  }
  return objComponents;
}

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

function mouseDown(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    if( rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom){
        mouseLastX = x;
        mouseLastY = y;
        mouseDragging = true;
    }
}

function mouseUp(ev){ 
    mouseDragging = false;
}

function mouseMove(ev){ 
    var x = ev.clientX;
    var y = ev.clientY;
    if( mouseDragging ){
        var factor = 100/canvas.height; //100 determine the spped you rotate the object
        var dx = factor * (x - mouseLastX);
        var dy = factor * (y - mouseLastY);

        angleX += dx; //yes, x for y, y for x, this is right
        angleY += dy;
    }
    mouseLastX = x;
    mouseLastY = y;

    draw();
}

function initTexture(gl, img, imgName){
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // Set the parameters so we can render any size image.
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  textures[imgName] = tex;

  texCount++;
  if( texCount == numTextures)draw();
}

function initCubeTexture(posXName, negXName, posYName, negYName, 
  posZName, negZName, imgWidth, imgHeight)
{
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
  {
  target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
  fName: posXName,
  }, {
  target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
  fName: negXName,
  }, {
  target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
  fName: posYName,
  }, {
  target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
  fName: negYName,
  }, {
  target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
  fName: posZName,
  }, {
  target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
  fName: negZName,
  },
  ];
  faceInfos.forEach((faceInfo) => {
  const {target, fName} = faceInfo;
  // setup each face so it's immediately renderable
  gl.texImage2D(target, 0, gl.RGBA, imgWidth, imgHeight, 0, 
  gl.RGBA, gl.UNSIGNED_BYTE, null);

  var image = new Image();
  image.onload = function(){
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  };
  image.src = fName;
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  return texture;
}
function keydown(ev){ 
  //implment keydown event here
  let rotateMatrix = new Matrix4();
  rotateMatrix.setRotate(angleY, 1, 0, 0);//for mouse rotation
  rotateMatrix.rotate(angleX, 0, 1, 0);//for mouse rotation
  var viewDir= new Vector3([cameraDirX, cameraDirY, cameraDirZ]);
  var newViewDir = rotateMatrix.multiplyVector3(viewDir);

  if(ev.key == 'w'){ 
  cameraX += (newViewDir.elements[0] * 0.1);
  cameraY += (newViewDir.elements[1] * 0.1);
  cameraZ += (newViewDir.elements[2] * 0.1);
  }
  else if(ev.key == 's'){ 
  cameraX -= (newViewDir.elements[0] * 0.1);
  cameraY -= (newViewDir.elements[1] * 0.1);
  cameraZ -= (newViewDir.elements[2] * 0.1);
  }
  if(ev.key == 't'){ 
    FirstMode = !FirstMode;
  }
  if(ev.key == 'i'){ 
    moveDistance = moveDistance + 0.1;
  } else if(ev.key == 'k'){ 
    moveDistance = moveDistance - 0.1;
  } else if(ev.key == 'l'){ 
    moveDistance2 = moveDistance2 - 0.1;
  } else if(ev.key == 'j'){ 
    moveDistance2 = moveDistance2 + 0.1;
  }
  console.log(cameraX, cameraY, cameraZ)
  draw();
}
function initFrameBuffer(gl){
  //create and set up a texture object as the color buffer
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, offScreenWidth, offScreenHeight,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  //create and setup a render buffer as the depth buffer
  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                          offScreenWidth, offScreenHeight);

  //create and setup framebuffer: linke the color and depth buffer to it
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                              gl.RENDERBUFFER, depthBuffer);
  frameBuffer.texture = texture;
  return frameBuffer;
}

function initFrameBufferForCubemapRendering(gl){
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  // 6 2D textures
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  for (let i = 0; i < 6; i++) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 
                  gl.RGBA, offScreenWidth, offScreenHeight, 0, gl.RGBA, 
                  gl.UNSIGNED_BYTE, null);
  }

  //create and setup a render buffer as the depth buffer
  var depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
                          offScreenWidth, offScreenHeight);

  //create and setup framebuffer: linke the depth buffer to it (no color buffer here)
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
                              gl.RENDERBUFFER, depthBuffer);

  frameBuffer.texture = texture;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return frameBuffer;
}

function renderCubeMap(camX, camY, camZ) {
  //camera 6 direction to render 6 cubemap faces
  var ENV_CUBE_LOOK_DIR = [
      [1.0, 0.0, 0.0],
      [-1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, -1.0, 0.0],
      [0.0, 0.0, 1.0],
      [0.0, 0.0, -1.0]
  ];

  //camera 6 look up vector to render 6 cubemap faces
  var ENV_CUBE_LOOK_UP = [
      [0.0, -1.0, 0.0],
      [0.0, -1.0, 0.0],
      [0.0, 0.0, 1.0],
      [0.0, 0.0, -1.0],
      [0.0, -1.0, 0.0],
      [0.0, -1.0, 0.0]
  ];

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, offScreenWidth, offScreenHeight);
  gl.clearColor(0.4, 0.4, 0.4,1);

  for (var side = 0; side < 6; side++){
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                            gl.TEXTURE_CUBE_MAP_POSITIVE_X+side, fbo.texture, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let vpMatrix = new Matrix4();
    vpMatrix.setPerspective(60, 1, 1, 100);
    vpMatrix.lookAt(camX, camY, camZ,   
                    camX + ENV_CUBE_LOOK_DIR[side][0], 
                    camY + ENV_CUBE_LOOK_DIR[side][1],
                    camZ + ENV_CUBE_LOOK_DIR[side][2], 
                    ENV_CUBE_LOOK_UP[side][0],
                    ENV_CUBE_LOOK_UP[side][1],
                    ENV_CUBE_LOOK_UP[side][2]);

    drawEnvMap(vpMatrix);
    drawRegularObjects(vpMatrix);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawEnvMap(_vpFromCameraInverse){
  //quad
  gl.useProgram(programEnvCube);
  gl.depthFunc(gl.LEQUAL);
  gl.uniformMatrix4fv(programEnvCube.u_viewDirectionProjectionInverse, 
                      false, _vpFromCameraInverse.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
  gl.uniform1i(programEnvCube.u_envCubeMap, 0);
  initAttributeVariable(gl, programEnvCube.a_Position, quadObj.vertexBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, quadObj.numVertices);
}

function drawObjectWithDynamicReflection(obj, modelMatrix, vpMatrix, colorR, colorG, colorB){
  gl.useProgram(programTextureOnCube);
  let mvpMatrix = new Matrix4();
  let normalMatrix = new Matrix4();
  mvpMatrix.set(vpMatrix);
  mvpMatrix.multiply(modelMatrix);

  //normal matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniform3f(programTextureOnCube.u_ViewPosition, cameraX, cameraY, cameraZ);
  gl.uniform3f(programTextureOnCube.u_Color, colorR, colorG, colorB);

  gl.uniformMatrix4fv(programTextureOnCube.u_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(programTextureOnCube.u_modelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(programTextureOnCube.u_normalMatrix, false, normalMatrix.elements);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, fbo.texture);
  gl.uniform1i(programTextureOnCube.u_envCubeMap, 0);

  for( let i=0; i < obj.length; i ++ ){
    initAttributeVariable(gl, programTextureOnCube.a_Position, obj[i].vertexBuffer);
    initAttributeVariable(gl, programTextureOnCube.a_Normal, obj[i].normalBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, obj[i].numVertices);
  }
}