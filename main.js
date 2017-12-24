///////////////////shaders/////////////////////
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying mat4 v_MvpMatrix;\n' +
    'uniform float u_ambien;\n' +
    'varying float ambien;\n' +
    'uniform float u_intensity;\n' +
    'uniform float u_yellow;\n' +
    'uniform float u_red;\n' +
    'varying vec3 v_pos;\n' +
    'varying float intesity;\n' +
    'varying float yellow;\n' +
    'varying float red;\n' +
    'varying vec4 v_Normal;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    ' v_MvpMatrix = u_MvpMatrix;\n' +
    ' gl_Position =  v_MvpMatrix * a_Position;\n' +
    ' v_Color = a_Color;\n' +
    ' v_Normal = a_Normal;\n' +
    ' v_pos = a_Position.xyz;\n' +
    ' ambien = u_ambien;\n' +
    ' yellow = u_yellow;\n' +
    ' red = u_red;\n' +
    ' intesity = u_intensity;\n' +
    ' gl_PointSize = 5.0;\n' +
    '}\n';

var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'varying vec4 v_Color;\n' +
    'varying vec4 v_Normal;\n' +
    'varying float ambien;\n' +
    'varying float intesity;\n' +
    'varying vec3 v_pos;\n' +
    'varying float yellow;\n' +
    'varying float red;\n' +
    'void main() {\n' +
    'vec3 reflection = reflect( normalize(vec3(-1.0,-1.0,-1.0)), normalize(v_Normal.xyz));\n' +
    'vec3 yreflection = reflect( -normalize( vec3(0.0,0.0,-1.0) - v_pos), normalize(v_Normal.xyz));\n' +
    'reflection = normalize(reflection);\n' +
    'float speclight = red*pow(max(dot(reflection, normalize(vec3(0.0,0.0,1.0))), 0.0), intesity);\n' +
    'float yspeclight = yellow*pow(max(dot(yreflection, -normalize(vec3(0.0,0.0,1.0))), 0.0), intesity);\n' +
    'float yflat = yellow*max(dot(normalize(v_Normal.xyz),  -normalize( (v_pos - vec3(0.0,1.0,0.0)) ) ),0.0);\n' +
    'float rflat = red*max(dot(normalize(v_Normal.xyz),  -normalize( vec3(-1.0,-1.0,-1.0))  ),0.0);\n' +
    'gl_FragColor = v_Color;\n' +
    'gl_FragColor.b += ambien;\n' +
    'gl_FragColor.r = min(gl_FragColor.r + yflat + rflat + yspeclight , 1.0);\n' +
    'gl_FragColor.g = min(gl_FragColor.g + speclight + yflat + yspeclight, 1.0);\n' +
    '}\n';

/////////////// GLOBAL VARS //////////////////////
var vertexBuffer;
var threeBuffer;
var colorBuffer;
var u_MvpMatrix;
var gl; // web gl variable
var slider;
var intensity = 10;
var u_yellow;
var u_red;
var smooth = true;
var drawNormals = false;
var spec = true;
var cacheColor = [];
var yCache = [];
var agregateIndexes = [];
var agregateVertices = [];
var seperate = []; //seperates the coordinates into length 72 segments. 
var pointArray = []; //array for holding point pairs
var moreNorms = [];
var boolred = true;
var boolyellow = true;
var selected = false;
var objects = [];
var beingmod;
var currentObj = new gc([], 249);
var alphaCount = 249;


function gc(seperate, alpha) {
    this.seperate = seperate;
    this.selected = false;
    this.alphaindex = alpha;
    this.extent = [0, 0, 0];

}

function init() {

    var canvas = document.getElementById('canvas');

    gl = getWebGLContext(canvas);

    document.getElementById('canvas').oncontextmenu = function(event) {
        return false;
    }

    ///////////////BUFFERS//////////////////////

    vertexBuffer = gl.createBuffer();
    threeBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();

    if (!gl) {
        console.log('Failed to get the rendeM context for WebGL');
        return;
    }

    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    gl.clearColor(0.9, 0.9, 0.9, 1.0); //background set to white as per specs

    gl.clear(gl.COLOR_BUFFER_BIT);
    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position')
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    var u_ambien = gl.getUniformLocation(gl.program, 'u_ambien');
    var u_intensity = gl.getUniformLocation(gl.program, 'u_intensity');
    var u_red = gl.getUniformLocation(gl.program, 'u_red');
    var u_yellow = gl.getUniformLocation(gl.program, 'u_yellow');
    if (a_Position < 0 || a_Color < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }


    if (!vertexBuffer || !threeBuffer || !colorBuffer) {
        console.log('Failed to create a buffer object');
        return -1;
    }

    var mvpMatrix = new Matrix4();
    mvpMatrix.setOrtho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    gl.uniform1f(u_ambien, 0.2);
    gl.uniform1f(u_intensity, intensity);
    gl.uniform1f(u_red, 1.0);
    gl.uniform1f(u_yellow, 1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, threeBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Color);

    gl.enable(gl.DEPTH_TEST);

}

//indices for the cylinder connections

var indices = [13, 12, 0, 0, 1, 13, 14, 13, 1,

    1, 2, 14, 15, 14, 2, 2, 3, 15,

    16, 15, 3, 3, 4, 16, 17, 16, 4,

    4, 5, 17, 18, 17, 5, 5, 6, 18,

    19, 18, 6, 6, 7, 19, 20, 19, 7,

    7, 8, 20, 21, 20, 8, 8, 9, 21,

    22, 21, 9, 9, 10, 22, 23, 22, 10,

    10, 11, 23, 12, 23, 11, 11, 0, 12
];

///////////////GREEN ARRAY/////////////////////


var colors = new Float32Array(288);

//////////////RED ARRAY FOR NORMALS////////////

var normColors = new Float32Array(192);

////////////////REGULAR ORDER INDICES/////////////

fnd = [];

for (i = 0; i <= 71; i++) {
    fnd[i] = i;
}

var fixInd = new Uint16Array(fnd);


////////////////INDEX FIXER//////////////

function fix(arr) {
    //runs through the vertices and builds them into
    //a proper list of vertices
    //
    var newarr = [];

    for (i in indices) {
        newarr.push(arr[3 * indices[i]]);
        newarr.push(arr[3 * indices[i] + 1]);
        newarr.push(arr[3 * indices[i] + 2]);
    }

    return new Float32Array(newarr);

}

///////////////////////////////////////////

//replace this with shaders

function calcColors(colors, vertices) {
    //2 + 3*n = editable indices for color

    norm = [];

    vanillaNorm = [];

    for (i = 0; i < vertices.length; i += 9) {

        vec1x = vertices[i + 3] - vertices[i];
        vec1y = vertices[i + 4] - vertices[i + 1];
        vec1z = vertices[i + 5] - vertices[i + 2];

        vec2x = vertices[i + 3] - vertices[i + 6];
        vec2y = vertices[i + 4] - vertices[i + 7];
        vec2z = vertices[i + 5] - vertices[i + 8];

        normal = new Vector3([(vec1y * vec2z) - (vec2y * vec1z),
            (vec1z * vec2x) - (vec2z * vec1x),
            (vec1x * vec2y) - (vec2x * vec1y)
        ]);

        div = Math.sqrt((normal.elements[0] * normal.elements[0]) +
            (normal.elements[1] * normal.elements[1]) +
            (normal.elements[2] * normal.elements[2]));



        normal = new Vector3([normal.elements[0] / div,
            normal.elements[1] / div,
            normal.elements[2] / div
        ]);

        norm.push(((vertices[i] + vertices[i + 3] + vertices[i + 6]) / 3),
            ((vertices[i + 1] + vertices[i + 4] + vertices[i + 7]) / 3),
            ((vertices[i + 2] + vertices[i + 5] + vertices[i + 8]) / 3),
            normal.elements[0] / 12 + ((vertices[i] + vertices[i + 3] + vertices[i + 6]) / 3), 
            normal.elements[1] / 12 + ((vertices[i + 1] + vertices[i + 4] + vertices[i + 7]) / 3), 
            normal.elements[2] / 12 + ((vertices[i + 2] + vertices[i + 5] + vertices[i + 8]) / 3)
        );

        vanillaNorm.push(normal.elements[0], normal.elements[1], normal.elements[2]);




    }
    /////// SMOOTH COLORS ////////

    temp = [vanillaNorm[0] + vanillaNorm[69], 
            vanillaNorm[1] + vanillaNorm[70],
            vanillaNorm[2] + vanillaNorm[71]];

    div = Math.sqrt((temp[0] * temp[0]) +
        (temp[1] * temp[1]) +
        (temp[2] * temp[2]));

    temp = ([temp[0] / div,
        temp[1] / div,
        temp[2] / div
    ]);

    var cacheNorm = [];

    cacheNorm.push([temp[0], temp[1], temp[2]]);
    cacheNorm.push([temp[0], temp[1], temp[2]]);


    crtz = 2;

    //normalizes and stores normals and colors for smoothe

    for (var i = 3; i < 69; i += 6) {

        temp = [vanillaNorm[i] + vanillaNorm[i + 3], 
                vanillaNorm[i + 1] + vanillaNorm[i + 4], 
                vanillaNorm[i + 2] + vanillaNorm[i + 5]];

        div = Math.sqrt((temp[0] * temp[0]) +
            (temp[1] * temp[1]) +
            (temp[2] * temp[2]));

        temp = [temp[0] / div,
            temp[1] / div,
            temp[2] / div
        ];

        cacheNorm.push([temp[0], temp[1], temp[2]]);
        cacheNorm.push([temp[0], temp[1], temp[2]]);

    }


    moreNorms = []

    ctr = 0;

    for (var i = 0; i < colors.length; i += 12) {

        if (ctr >= 22) {

            if (ctr % 2) {
                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
                moreNorms.push(cacheNorm[0][0], cacheNorm[0][1], cacheNorm[0][2]);
                moreNorms.push(cacheNorm[0][0], cacheNorm[0][1], cacheNorm[0][2]);
            } else {
                moreNorms.push(cacheNorm[1][0], cacheNorm[1][1], cacheNorm[1][2]);
                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
            }

        } else {

            if (ctr % 2) {

                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
                moreNorms.push(cacheNorm[ctr + 1][0], cacheNorm[ctr + 1][1], cacheNorm[ctr + 1][2]);
                moreNorms.push(cacheNorm[ctr + 1][0], cacheNorm[ctr + 1][1], cacheNorm[ctr + 1][2]);
            } else {

                moreNorms.push(cacheNorm[ctr + 2][0], cacheNorm[ctr + 2][1], cacheNorm[ctr + 2][2]);
                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
                moreNorms.push(cacheNorm[ctr][0], cacheNorm[ctr][1], cacheNorm[ctr][2]);
            }

        }

        ctr++;
    }

    cacheColor = [];
    yCache = [];
    colors = [];

    normish = new Float32Array(norm);
    temp = [];
    for (var i = 0; i < 72; i += 3) {
        temp.push(vanillaNorm[i], vanillaNorm[i + 1], vanillaNorm[i + 2]);
        temp.push(vanillaNorm[i], vanillaNorm[i + 1], vanillaNorm[i + 2]);
        temp.push(vanillaNorm[i], vanillaNorm[i + 1], vanillaNorm[i + 2]);
    }
    temp = new Float32Array(temp);
    return [normish, temp];


}

////////////////////////MAIN DRAW CYLINDER CALL////////////////////


function drawcube() {


    var sqvertices = new Float32Array([ // Vertex coordinates
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0 // v4-v7-v6-v5 back
    ]);

    if (boolyellow) {

        yellowslam = new Float32Array([ // Colors
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
            1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983, 1, 1, 0.0002, 0.983,
        ]);

    } else {

        yellowslam = new Float32Array([ // Colors
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
            0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980, 0.4, 0.4, 0.4, 0.980,
        ]);


    }

    var sqindices = new Uint16Array([ // Indices of the vertices
        0, 1, 2, 0, 2, 3, // front
        4, 5, 6, 4, 6, 7, // right
        8, 9, 10, 8, 10, 11, // up
        12, 13, 14, 12, 14, 15, // left
        16, 17, 18, 16, 18, 19, // down
        20, 21, 22, 20, 22, 23 // back
    ]);

    var sqnormals = new Float32Array([ // Normal
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // v0-v1-v2-v3 front
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // v0-v3-v4-v5 right
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // v0-v5-v6-v1 up
        -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, // v1-v6-v7-v2 left
        0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, // v7-v4-v3-v2 down
        0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0, 0.0, 0.0, -0.0 // v4-v7-v6-v5 back
    ]);

    for (var i = 0; i <= 72; i += 3) {
        sqvertices[i] = sqvertices[i] * 0.05;
        sqvertices[i + 1] = sqvertices[i + 1] * 0.05 + 1;
        sqvertices[i + 2] = sqvertices[i + 2] * 0.05 + 0.2;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqnormals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, yellowslam, gl.STATIC_DRAW);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqindices, gl.STATIC_DRAW);


    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqvertices, gl.STATIC_DRAW);


    gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_SHORT, 0);

    line = new Float32Array([ // Vertex coordinates
        1.0, 1.02, 0.12, -0.02, 0.02, 0.12, -0.0, -0.0, 0.12, 1.0, 0.98, 0.12, // v0-v1-v2-v3 front
    ]);

    if (boolred) {
        var redslam = new Float32Array([ // Colors
            1, 0.000000002, 0, 0.992, 1, 0.000000002, 0, 0.992, 1, 0.000000002, 0, 0.992, 1, 0.000000002, 0, 0.992 // v0-v1-v2-v3 front
        ]);
    } else {
        var redslam = new Float32Array([ // Colors
            0.34, 0.34, 0.34, 0.988, 0.34, 0.34, 0.34, 0.988, 0.34, 0.34, 0.34, 0.988, 0.34, 0.34, 0.34, 0.988, // v0-v1-v2-v3 front
        ]);
    }

    lineind = new Uint16Array([ // Indices of the vertices
        0, 1, 2, 0, 2, 3, // front
    ]);

    linenorm = new Float32Array([ // Normal
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // v0-v1-v2-v3 front
    ]);


    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, linenorm, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, redslam, gl.STATIC_DRAW);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lineind, gl.STATIC_DRAW);


    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, line, gl.STATIC_DRAW);


    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

}

function drawCyl(arr, alpha, selected) {

    var fixedArr = fix(arr);

    var norms = calcColors(colors, fixedArr);

    colors = new Float32Array(288);
    normcolors = new Float32Array(192);

    for (var i = 3; i <= 288; i += 4) {
        colors[i] = (alpha / 255.0);
        if (selected) {
            colors[i - 1] = 0.5;
            colors[i - 2] = 0.5;
            colors[i - 3] = 0.5;
        }
    }

    for (var i = 0; i <= 192; i += 1) {
        normcolors[i] = 1.0;
    }


    if (drawNormals == true) {


        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normColors, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, norms[0], gl.STATIC_DRAW);

        gl.drawArrays(gl.LINES, 0, 48);

    }

    nerms = new Float32Array(moreNorms);

    if (smooth) {

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, nerms, gl.STATIC_DRAW);

    } else {

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, norms[1], gl.STATIC_DRAW);

    }


    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, fixInd, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fixedArr, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, 72, gl.UNSIGNED_SHORT, 0);


    //draw line and draw the unit cube

}

//////////////////////////////////////////////////////////////////


function showNorms() {

    drawNormals = !drawNormals;
    skrrt = document.getElementById('skrrt');

    if (drawNormals) {
        skrrt.innerHTML = 'Hide Norms';
    } else {
        skrrt.innerHTML = 'Show Norms';
    }

    if (seperate.length != 0) {

        draw();

    }

}


function specular() {

    spec = !spec;

    skrrrt = document.getElementById('spec');

    if (spec) {
        skrrrt.innerHTML = 'Specular Off';
        var u_intensity = gl.getUniformLocation(gl.program, 'u_intensity');
        gl.uniform1f(u_intensity, intensity);
    } else {
        skrrrt.innerHTML = 'Specular On';
        var u_intensity = gl.getUniformLocation(gl.program, 'u_intensity');
        gl.uniform1f(u_intensity, 2000000.0);
    }


    draw();



}

function yellow() {
    boolyellow = true;
    var u_yellow = gl.getUniformLocation(gl.program, 'u_yellow');
    gl.uniform1f(u_yellow, 1.0);
}


function unyellow() { // yellow grey = 74 74 72
    boolyellow = false;
    var u_yellow = gl.getUniformLocation(gl.program, 'u_yellow');
    gl.uniform1f(u_yellow, 0.0);

}


function red() {
    boolred = true;
    var u_yellow = gl.getUniformLocation(gl.program, 'u_red');
    gl.uniform1f(u_yellow, 1.0);
}

function unred() { // yellow grey = 76 72 72
    boolred = false;
    var u_yellow = gl.getUniformLocation(gl.program, 'u_red');
    gl.uniform1f(u_yellow, 0.0);

}

function smoothe() {

    smooth = !smooth;

    skrrrrt = document.getElementById('smoothe');

    if (smooth) {
        skrrrrt.innerHTML = 'Smooth Off';
    } else {
        skrrrrt.innerHTML = 'Smooth On';
    }

    draw();

}

function draw() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (var i in objects) {
        for (var j in objects[i].seperate) {
            drawCyl(objects[i].seperate[j], objects[i].alphaindex, objects[i].selected);
        }
    }

    for (var i in seperate) {
        drawCyl(seperate[i], 255, false);
    }

    drawcube();

}

//////////////////MAIN//////////////////////////


function main() {

    init();

    drawcube();

    ////////////////////////////////////////////////////

    /////////////////////VARIABLES//////////////////////

    //end radius calculation

    var line = []; //contains line, converted to 32 bit float
    var counter = 0; //counts where we are in the polyline
    var counterNext = 0; // placeholder for last polyline
    var theta = 30;
    var r = 0.1;

    ///////////////////MATH HELPERS//////////////////////


    function realign(sArr, eArr) {
        //steps
        // for the first cyl,
        //construct a ray for each point
        //for second cyl do the same
        // find point of intersection for each
        // set the center points to thos points respectively for each

        //key: sarr 0-35, new the first circle, sarr 36-72: the second circle
        // earr '' , '' (same)
        //original indices + 36 is i leap from back to front 

        for (i = 0; i < 36; i += 3) {

            //code based on the formula
            //
            // M = C + ((FxCD)/(FxE))*E
            // where: M is the point of itnersection
            // CD is a vector between the starting points, C is the starting point
            // and F and E are the direction vectors of the two lines

            //z value---
            //     |
            //     \/
            var M = [0, 0, eArr[i + 2]]; // intersection point of the 2 2d vectors

            //second intersecting direction vector
            var D2X = eArr[i];
            var D2Y = eArr[i + 1]; //some fresh starting points
            var D1X = eArr[i + 36];
            var D1Y = eArr[i + 37];

            var C1X = sArr[i];
            C1Y = sArr[i + 1];
            var C2X = sArr[i + 36];
            var C2Y = sArr[i + 37];

            CD = [C1Y - D1Y, C1X - D1X];

            ////////setting up constants///////
            FxE = ((D2Y - D1Y) * (C2X - C1X)) -
                ((D2X - D1X) * (C2Y - C1Y));
            FxCD = ((D2X - D1X) * CD[0]) -
                ((D2Y - D1Y) * CD[1]);

            //this is the common FxCDoverFxEance, T , which must exist fit they are to
            FxCDoverFxE = FxCD / FxE;
            // if we cast these lines infinitely in both directions, they intersect here:
            //x part of E
            M[0] = C1X + (FxCDoverFxE * (C2X - C1X));
            //y part of E
            M[1] = C1Y + (FxCDoverFxE * (C2Y - C1Y));

            sArr[i + 36] = M[0];
            eArr[i] = M[0];
            sArr[i + 37] = M[1];
            eArr[i + 1] = M[1];
            sArr[i + 38] = M[2];
            eArr[i + 2] = M[2];

        }


    }

    ///////////////////////ROTATE/////////////////////////////////////////////

    function rotate(start, end, vector) {

        var endarr = []
        var points = []

        //rotates and then copies points into altArray in connection order
        for (var i = 0; i <= 11; i++) {

            rot = new Matrix4(); // the rotation matrix

            sTran = new Matrix4(); //translation matrix from start

            eTran = new Matrix4(); // translation matrix from end

            rot.setRotate((theta + theta * i), vector.elements[0], vector.elements[1], vector.elements[2]);

            sTran.setTranslate(start[0], start[1], 0);

            eTran.setTranslate(end[0], end[1], 0);

            sComb = sTran.multiply(rot);

            eComb = eTran.multiply(rot);

            temp = sComb.multiplyVector3(new Vector3([0, 0, r]));

            etemp = eComb.multiplyVector3(new Vector3([0, 0, r]));

            points[i * 3] = temp.elements[0];
            points[1 + i * 3] = temp.elements[1];
            points[2 + i * 3] = temp.elements[2];

            points[36 + i * 3] = etemp.elements[0];
            points[37 + i * 3] = etemp.elements[1];
            points[38 + i * 3] = etemp.elements[2];

        }

        return points;

    }

    //////////////////CLICK EVENTS///////////////////////


    var bool = 0;
    document.body.onmousedown = function(e) {
        bool = e.which;
    }
    document.body.onmouseup = function() {
        bool = 0;
    }

    var xdelta;
    var ydelta;
    canvas.onmousemove = function(e) {


        var rect = e.target.getBoundingClientRect();
        var x = e.clientX; // x coordinate of a mouse pointer
        var y = e.clientY; // y coordinate of a mouse pointer
        x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
        y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

        if (selected) {
            rotmat = new Matrix4();
            transmat = new Matrix4();
            untransmat = new Matrix4();

            transmat.setTranslate(-objects[beingmod].extent[0], -objects[beingmod].extent[1],
                0)

            untransmat.setTranslate(objects[beingmod].extent[0],
                objects[beingmod].extent[1],
                0)
        }

        if (selected && bool == 3) {

            if (Math.abs(x - xdelta) > Math.abs(y - ydelta)) {

                rotmat = rotmat.setRotate(-Math.sign(x - xdelta) * 8, 0, 0, 1);



                for (var j = 0; j < objects[beingmod].seperate.length; j++) {
                    for (var k = 0; k < objects[beingmod].seperate[j].length; k += 3) {

                        tempvec = new Vector3([objects[beingmod].seperate[j][k],
                            objects[beingmod].seperate[j][k + 1],
                            objects[beingmod].seperate[j][k + 2]
                        ]);

                        tempvec = transmat.multiplyVector3(tempvec);

                        tempvec = rotmat.multiplyVector3(tempvec);

                        tempvec = untransmat.multiplyVector3(tempvec);

                        objects[beingmod].seperate[j][k] = tempvec.elements[0];
                        objects[beingmod].seperate[j][k + 1] = tempvec.elements[1];
                        objects[beingmod].seperate[j][k + 2] = tempvec.elements[2];
                    }
                }

                calcextent(objects[beingmod]);

            } else {


                rotmat = rotmat.setRotate(-Math.sign(y - ydelta) * 8, 1, 0, 0);

                for (var j = 0; j < objects[beingmod].seperate.length; j++) {
                    for (var k = 0; k < objects[beingmod].seperate[j].length; k += 3) {

                        tempvec = new Vector3([objects[beingmod].seperate[j][k],
                            objects[beingmod].seperate[j][k + 1],
                            objects[beingmod].seperate[j][k + 2]
                        ]);

                        tempvec = transmat.multiplyVector3(tempvec);

                        tempvec = rotmat.multiplyVector3(tempvec);

                        tempvec = untransmat.multiplyVector3(tempvec);

                        objects[beingmod].seperate[j][k] = tempvec.elements[0];
                        objects[beingmod].seperate[j][k + 1] = tempvec.elements[1];
                        objects[beingmod].seperate[j][k + 2] = tempvec.elements[2];

                    }
                }

                calcextent(objects[beingmod]);

            }
        } else if (selected && bool == 1) {

            rotmat = rotmat.setTranslate(x - xdelta, y - ydelta, 0);

            for (var j = 0; j < objects[beingmod].seperate.length; j++) {
                for (var k = 0; k < objects[beingmod].seperate[j].length; k += 3) {

                    tempvec = new Vector3([objects[beingmod].seperate[j][k],
                        objects[beingmod].seperate[j][k + 1],
                        objects[beingmod].seperate[j][k + 2]
                    ]);

                    tempvec = rotmat.multiplyVector3(tempvec);

                    objects[beingmod].seperate[j][k] = tempvec.elements[0];
                    objects[beingmod].seperate[j][k + 1] = tempvec.elements[1];
                    objects[beingmod].seperate[j][k + 2] = tempvec.elements[2];
                }
            }

            calcextent(objects[beingmod]);
        } else if (selected && bool == 2) {

            rotmat = rotmat.setTranslate(0, 0, Math.abs(y - ydelta));

            for (var j = 0; j < objects[beingmod].seperate.length; j++) {
                for (var k = 0; k < objects[beingmod].seperate[j].length; k += 3) {

                    tempvec = new Vector3([objects[beingmod].seperate[j][k],
                        objects[beingmod].seperate[j][k + 1],
                        objects[beingmod].seperate[j][k + 2]
                    ]);

                    tempvec = rotmat.multiplyVector3(tempvec);

                    objects[beingmod].seperate[j][k] = tempvec.elements[0];
                    objects[beingmod].seperate[j][k + 1] = tempvec.elements[1];
                    objects[beingmod].seperate[j][k + 2] = tempvec.elements[2];
                }
            }

            calcextent(objects[beingmod]);
        }

        if (selected) {

            draw()

        }

        xdelta = x;
        ydelta = y;

    }


    canvas.onmousedown = function(e, a_Position) {

        var rect = e.target.getBoundingClientRect();

        draw()


        var xin = e.clientX - rect.left;
        var yin = canvas.height - (e.clientY - rect.top)
        var pixels = new Uint8Array(4);
        gl.readPixels(xin, yin, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        if (pixels[3] == 253) {
            unred();
        } else if (pixels[3] == 252) {
            red();
        } else if (pixels[3] == 251) {
            unyellow();
        } else if (pixels[3] == 250) {
            yellow();
        } else if (objects[pixels[3]] != undefined) {

            if (!selected) {
                objects[pixels[3]].selected = !objects[pixels[3]].selected;
                selected = !selected;
                beingmod = pixels[3];

            } else if (beingmod == objects[pixels[3]].alphaindex) {
                objects[pixels[3]].selected = !objects[pixels[3]].selected;
                selected = !selected;
                beingmod = null;
            } else {
                objects[pixels[3]].selected = true;
                objects[beingmod].selected = false;
                selected = true;
                beingmod = pixels[3];
            }

        } else if (!selected) {

            var x = e.clientX; // x coordinate of a mouse pointer
            var y = e.clientY; // y coordinate of a mouse pointer
            x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
            y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
            //////////////////LEFT CLICK/////////////////////////////  


            if (e.which === 1) {
                console.log('left click, x =' + x + ' y =' + y);
                counter += 2;


                line.push(x);
                line.push(y);
                line.push(0);

            }
            ///////////////////RIGHT CLICK////////////////////////////
            else if (e.which === 3) {
                console.log('Right click, polyline points');
                counter += 2;
                for (var i = counterNext; i < line.length; i += 3) {
                    console.log(' x = ' + line[i] + ' y =' + line[i + 1]);
                }
                counterNext = counter; //bookmark the array

                line.push(x);
                line.push(y);
                line.push(0);

            }

            ///////////////////////ALL////////////////////////////////////

            if (line.length >= 6) {

                var vertices = new Float32Array(line);

                var start = ((3 * counter / 2) - 6);

                var tempVec = new Vector3([vertices[start] - vertices[start + 3],
                    vertices[start + 1] - vertices[start + 4],
                    0
                ]);


                points = rotate([vertices[start], vertices[start + 1]], [vertices[start + 3], vertices[start + 4]],
                    tempVec);

                seperate.push(points.slice());

                if (seperate.length >= 2) {
                    realign(seperate[seperate.length - 2], seperate[seperate.length - 1]);
                }


                agregateVertices = [];
                agregateIndexes = [];

                for (i in seperate) {
                    agregateVertices = agregateVertices.concat(seperate[i]);
                    agregateIndexes = agregateIndexes.concat(indices);
                }

                currentObj.seperate = seperate;
            }



            if (e.which == 3 && line.length >= 6) {
                objects[(currentObj.alphaindex)] = currentObj;
                currentObj = new gc(0, alphaCount - 1);


                line = [];
                seperate = [];
                alphaCount--;
                counter = 0;

                //reset all the counters, line arrays , et cetera

            } else if (e.which == 3) {

                console.log("not enough data for a boy to make a new object");

            }


        }

        draw();

    };


    calcextent = function(gc) {

        var avgs = [999, -999, 999, -999];
        var tracker = 0;
        var counter = 0;

        for (var i in gc.seperate) {
            for (var k = 0; k < gc.seperate[i].length; k++) {
                if (tracker == 0) {

                    avgs[0] = Math.min(gc.seperate[i][k], avgs[0]);
                    avgs[1] = Math.max(gc.seperate[i][k], avgs[1]);

                } else if (tracker == 1) {

                    avgs[2] = Math.min(gc.seperate[i][k], avgs[2]);
                    avgs[3] = Math.max(gc.seperate[i][k], avgs[3]);

                }

                tracker = (tracker + 1) % 3;
                counter++;
            }
        }

        avgs = [(avgs[0] + avgs[1]) / 2, (avgs[2] + avgs[3]) / 2, 0];
        gc.extent = avgs;

    }


    //////////////////SHININESS SLIDER/////////////////

    var slider = document.getElementById("slider");

    slider.oninput = function() {

        var slider = document.getElementById("slider");

        intensity = this.value;


        if (spec) {
            var u_intensity = gl.getUniformLocation(gl.program, 'u_intensity');
            gl.uniform1f(u_intensity, intensity);
        } else {
            skrrrt.innerHTML = 'Specular On';
            var u_intensity = gl.getUniformLocation(gl.program, 'u_intensity');
            gl.uniform1f(u_intensity, 20000000.0);
        }

        draw();

    }
    ////////////////////////////////////////////////////
}