// GLOBAL VARIABLES
var canvas;                     //webGL visualization canvas
var canvas2d;                   //2d visualization canvas

var gl;                         // For initializing webGL
var twoD;                       // For initializing 2d canvas
var shaderProgram;              // For initializing the webGL shaders
var mvMatrix = mat4.create();   // Creates the matrix
var mvMatrixStack = [];         // Creates the matrixStack array
var pMatrix = mat4.create();    // Creates the pMatrix

var DBVertexPositionBuffer;     // Stores the Decibel bar position buffer
var freqVertexPositionBuffer;   // Stores the Frequency bar position buffer
var WFVertexPositionBuffer;     // Stores the Waveform bar position buffer
var DBVertexColorBuffer;        // Stores the Decibel bar color buffer
var freqVertexColorBuffer;      // Stores the Frequency bar color buffer
var WFVertexColorBuffer;        // Stores the Waveform bar color buffer
var DBVertexIndexBuffer;        // Stores the Decibel bar vertex buffer
var freqVertexIndexBuffer;      // Stores the Frequency bar vertex buffer
var VFVertexIndexBuffer         // Stores the Waveform bar vertex buffer

var barArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10,];

var vertexPositionBuffer = Array();
var vertexColorBuffer = Array();
var vertexIndexBuffer = Array();

var DBHeight=1.0;               // Used for altering the height of the Decibel bar
var freqHeight=1.0;             // Used for altering the height of the Frequency bar
var WFHeight=1.0;               // Used for altering the height of the Waveform bar

var TICK_FREQ = 20;             // soundJS tick frequency
var thirdTime = true;           // For updating every three frames
var frameCt = 0;                // Keeps track of what frame we're on
var lastTime = 0;               // Gate to see if it's the last time we want to do something
var flag = true;                // Flag for updating the music or not

var analyserNode;               // The analyser node that allows us to visualize the audio
var freqFloatData;              // This will store the decibel data
var freqByteData;               // This will store the frequency data
var timeByteData;               // This will store the waveform data
var playing=false;              // Gate to check if we're playing audio
var zero = -90;                 // Move the decibel zero marker
var FFTSIZE = 32;               // Number of samples for the analyser node FFT, min 32
var src;                        // The audio src we are trying to play
var soundInstance;              // The soundInstance returned by Sound when we create or play a src

var artist;                     // The artist of the song (will hold a DOM element)
var songName;                   // The name of the song (will hold a DOM element)
var timeTracker;                // The time value of the song
var positionInterval;           // Used by the time slider
var seeking=false;              // Used by the time slider
var nameOfSong;                 // The name of the song (for appending to the src)
var dragOffset;                 // Used by the time slider
var minutes = 0;                // How many minutes the song is at
var seconds = 0;                // How many seconds the song is at
var binPlayButton = 0;          // Keeps track of whether or not music is playing, used by the music player buttons

var reverb;
var colorScheme = 1;
var colorWheel = 1;
var oneTime = true;

var selectedVis = 0;            // Keeps track of the current visualization

var mouseX;                     // Keeps track of the mouse x coord
var mouseY;                     // Keeps track of the mouse y coord

// Keeps track of the past 20 circles drawn
var myCircles = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];


// HANDLES WINDOW RESIZE
function onResize() {
    if(selectedVis == 1) {webGLStart() }
    if(selectedVis == 2) { 
	canvas2d.width = window.innerWidth-20;
	canvas2d.height = window.innerHeight-20;
    }
    
}


// STARTS THE SOUNDJS PROCESS
function init() {
    canvas = document.getElementById("webVis-canvas");
    canvas2d = document.getElementById("2d-canvas");

    if (window.top != window) {
        document.getElementById("header").style.display = "none";
    }

    // this does two things, it initializes the default plugins, and if that fails the if statement triggers and we display an error
    if (!createjs.Sound.initializeDefaultPlugins()) {
        document.getElementById("error").style.display = "block";
        document.getElementById("content").style.display = "none";
        return;
    }

    // check if we are on a mobile device, as these currently require us to launch sound inside of a user event
    if (createjs.Sound.BrowserDetect.isIOS || createjs.Sound.BrowserDetect.isAndroid) {
        document.getElementById("mobile").style.display = "block";
        document.getElementById("content").style.display = "none";
        return;
    }

    $("#position").css("display", "none");      // Clear the display of the position element
    $("#playPauseBtn").attr("disabled", true);  // Disable the play/pause button
    $("#stopBtn").attr("disabled", true);       // Disable the stop button
    $("#track").css("display", "none");         // Clear the display of the time tracker

    // store the DOM elements so we do not have to keep looking them up
    displayStatus = document.getElementById("status");
    artist = document.getElementById("artist");
    songName = document.getElementById("song");
    timeTracker = document.getElementById("time");

    // Create a single item to load.
    var assetsPath = "assets/";
    nameOfSong = "Harder Better Faster Stronger.mp3";//"Sweet Georgia Brown.m4a";//"In One Ear.mp3";//"Don't Worry Be Happy.m4a";//"Moanin'.mp3";//"Que' Onda Guero.mp3";//"Kokiriko Bushi.mp3";//"Oshogatsu.mp3";//"18-machinae_supremacy-lord_krutors_dominion.mp3";
    src = assetsPath+nameOfSong;

    songName.innerHTML = "Loading mp3...";  // Let the user know what's happening
    artist.innerHTML = "Loading mp3...";    // Maybe put an animation here?

    createjs.Sound.alternateExtensions = ["mp3"];               // add other extensions to try loading if the src file extension is not supported
    createjs.Sound.onLoadComplete = playSound;                  // add a callback for when load is completed
    createjs.Sound.addEventListener("fileload", playSound);     // add an event listener for when load is completed
    createjs.Sound.registerSound(src);                          // register sound, which preloads by default



    //webGLStart();
}

/*function setReverbImpulseResponse(url) {
    // Load impulse response asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onload = function() { 
        context.decodeAudioData(
            request.response,
            function(buffer) {
                convolver.buffer = buffer;
            },

            function(buffer) {
                console.log("Error decoding impulse response!");
            }
        );
    }

    request.send();
}*/

// PLAYS THE SOUND WE LOADED

function playSound(event) {
    
    $("#track").css("display", "block");    // Put display in the track element
    $("#progress").css("display", "none");  // Clear the progress element
    $("#position").css("display", "block"); // Put display in the position element

    var context = createjs.WebAudioPlugin.context;                      // Get the context.  NOTE to connect to existing nodes we need to work in the same context.

    // CREATE AN ANALYSER NODE
    analyserNode = context.createAnalyser();
    analyserNode.fftSize = FFTSIZE;                                     // The size of the FFT used for frequency-domain analysis. This must be a power of two
    analyserNode.smoothingTimeConstant = 0.85;                          // A value from 0 -> 1 where 0 represents no time averaging with the last analysis frame
    analyserNode.connect(context.destination);                          // Connect to the context.destination, which outputs the audio
                                                                        // Attach visualizer node to our existing dynamicsCompressorNode, which was connected to context.destination
   // reverb = context.createConvolver();
  //  setReverbImpulseResponse(reverb, event.src);

    var dynamicsNode = createjs.WebAudioPlugin.dynamicsCompressorNode;
    dynamicsNode.disconnect();                                          // Disconnect from destination
    dynamicsNode.connect(analyserNode);

    freqFloatData = new Float32Array(analyserNode.frequencyBinCount);   // Will hold Decibel info
    freqByteData = new Uint8Array(analyserNode.frequencyBinCount);      // Will hold Frequency info
    timeByteData = new Uint8Array(analyserNode.frequencyBinCount);      // Will hold Waveform info

    playing = true;
    soundInstance = createjs.Sound.play(event.src, {loop:-1});          // start playing the sound we just loaded, storing the playing instance, and loop it
    
// WHEN THE SOUND IS LOADED    
    soundInstance.onComplete = function() {
        clearInterval(positionInterval);
        $("#playBtn").removeClass("pauseBtn").addClass("playBtn")   // Display the play button
        $("#stopBtn").attr("disabled", true);                       // Enable the stop button
    }

    $("#playPauseBtn").attr("disabled", false);                     // Enable play/pause button
    $("#playBtn").removeClass("playBtn").addClass("pauseBtn");      // Display the pause button

// WHEN THE USER CLICKS THE PLAY/PAUSE BUTTON
    $("#playBtn").click(function(event){
        if (soundInstance.playState == createjs.Sound.PLAY_FINISHED) {              // Play the mp3 if it's not playing
            soundInstance.play();
            $("#playBtn").removeClass("playBtn").addClass("pauseBtn");              // Display the pause button
            trackTime();                                                            // Call the track time function for the slider
            return;
        } else {
            soundInstance.paused ? soundInstance.resume() : soundInstance.pause();  // No idea
        }

        if (binPlayButton == 0) {
            $("#playBtn").removeClass("pauseBtn").addClass("playBtn");              // If mp3 is playing, display play button
            binPlayButton += 1;
        }
        else {
            binPlayButton = 0;
            soundInstance.play();
            $("#playBtn").removeClass("playBtn").addClass("pauseBtn");              // If mp3 is paused, play it and display pause button
            trackTime();                                                            // Call the track time function for the slider
            return;   
        }
    });

// WHEN THE USER CLICKS THE STOP BUTTON
    $("#stopBtn").click(function(event){
        soundInstance.stop();                                       // Stop the music
        clearInterval(positionInterval);
        $("#playBtn").removeClass("pauseBtn").addClass("playBtn");  // Display the play button
        $("#thumb").css("left", 0);
        minutes = 0;                                                // Reset minutes and seconds
        seconds = 0;
    });
    $("#stopBtn").attr("disabled", false);

    trackTime();                                                    // Call the track time function for the slider

// WHEN THE USER PUTS THE MOUSE DOWN ON THE SLIDER
    $("#thumb").mousedown(function(event) {
        /* BEGIN: Magic */
        var div = $();
        $("#player").append($("<div id='blocker'></div>"));
        seeking = true;
        $("#player").mousemove(function(event){
            if(typeof event.offsetX === "undefined") {
                var targetOffset = $(event.target).offset();
                event.offsetX = event.pageX - targetOffset.left;
            }
            $("#thumb").css("left", Math.max(0, Math.min($("#track").width()-$("#thumb").width(), event.offsetX-$("#track").position().left)));
        })
        $("#player").mouseup(function(event){
            seeking = false;
            $(this).unbind("mouseup mousemove");
            var pos = $("#thumb").position().left/$("#track").width();
            soundInstance.setPosition(pos*soundInstance.getDuration());
            $("#blocker").remove();
            if(seconds < 0)
                seconds = 0;
            if(minutes < 0)
                minutes = 0;
        });
        /* END: Magic */
    });

// WHEN THE USER CLICKS THE MENU BUTTON
    /*$("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled"); // Change the class to toggled (this will begin the css easing animation)
    });*/

// WHEN THE USER MOVES THE VOLUME SLIDER
    $("#volumeSlider").bind("slider:changed", function (event, data) {
        createjs.Sound.setVolume(data.value); // Set the volume data
    });

// WHEN THE USER MOVES THE PAN SLIDER
    $("#panSlider").bind("slider:changed", function (event, data) {
        soundInstance.setPan(data.value);
    });

    $("#reverbSlider").bind("slider:changed", function (event, data) {
        // SoundJS has no built in reverb funciton :-(
    });

    $("#colorScheme").click(function(e) {
        if(colorScheme < 2)
            colorScheme += 1;
        else if(colorScheme > 1)
            colorScheme = 1;
    });
                                                                        
    songName.innerHTML = "Song: " + nameOfSong; // Set the media player's innerHTML to display song name and artist
    artist.innerHTML = "Artist: Daft Punk";

    createjs.Ticker.addEventListener("tick", tick);
    createjs.Ticker.setInterval(TICK_FREQ);         // Start the tick and point it at the window so we can do some work before updating the stage:
}

// TRACK HOW LONG THE SONG HAS BEEN PLAYING FOR 

function trackTime() {
    positionInterval = setInterval(function(event) {
        if(seeking) { return; }
        $("#thumb").css("left", soundInstance.getPosition()/soundInstance.getDuration() * $("#track").width());             // Move the thumb along the slider
        if(minutes < 0)                                                                                                     // Reset minutes/seconds if they go negative
            minutes = 0;
        if(seconds < 0)
            seconds = 0;
        seconds = Math.floor(soundInstance.getPosition()/soundInstance.getDuration() * $("#track").width()) - (minutes*60); // Set the seconds value and display it below
        if(minutes < 10 && seconds < 10)
            timeTracker.innerHTML = "0" + minutes + ":" + "0" + seconds;
        else if(minutes > 9 && seconds < 10)
            timeTracker.innerHTML = minutes + ":" + "0" + seconds;
        else if(minutes < 10 && seconds > 9)
            timeTracker.innerHTML = "0" + minutes + ":" + seconds;
        else if(minutes > 9 && seconds > 9)
            timeTracker.innerHTML = minutes + ":" + seconds;                                            
        if(seconds > 60)                                                                                                    // Increment minutes
        {
            minutes += 1;
            seconds = 0;
        }
    }, 30);
}

// GAME

function game() {
    selectedVis = 2;
    //Hide webGL canvas
    canvas.width=0;
    canvas.height=0;
    //Show 2d canvas
    canvas2d.width = window.innerWidth-20;
    canvas2d.height = window.innerHeight-20;
    twoD = canvas2d.getContext("2d");
    tick2D();
}

function tick2D() {
    if(selectedVis == 2) {
	var wfColors;
	analyserNode.getFloatFrequencyData(freqFloatData);
	analyserNode.getByteFrequencyData(freqByteData);
	analyserNode.getByteTimeDomainData(timeByteData);
	var sum = 0;
	for(var i=0; i<freqFloatData.length; i++) {
	    sum += freqFloatData[i];
	}
	var avgD = sum/freqFloatData.length;
	sum = 0;
	for(var i=0; i<freqByteData.length; i++) {
	    sum += freqByteData[i];
	}
	var avgF = sum/freqByteData.length;
	sum = 0;
	for(var i=0; i<timeByteData.length; i++) {
	    sum += timeByteData[i];
	}
	var avgWF = sum/timeByteData.length;
	if (avgWF > 140) {
	    wfColors = "red";
	} else if(avgWF > 120) {
	    wfColors = "green";
	} else if(avgWF > 100) {
	    wfColors = "blue";
	} else if(avgWF > 80){
	    wfColors = "purple";
	} else {
	    wfColors = "yellow";
	}
	$("#2d-canvas").mousemove(function(e){
	    mouseX = e.clientX;
	    mouseY = e.clientY;
	});
	requestAnimationFrame(tick2D);
	drawScene2D(avgD, avgF, wfColors);
    }
}

function drawScene2D(deci, freq, wf) {
    twoD.clearRect(0,0,window.innerWidth-20,window.innerHeight-20);
    // Initialize past 20 circles
    var size = myCircles.length;
    for (var i=0; i<(myCircles.length-1); i++) {
	myCircles[i] = myCircles[i+1];
    }
    myCircles[size-1] = [mouseX,mouseY,((-4/deci)*(12.5*freq)),0*Math.PI,2*Math.PI,wf];
    // Draw past 20 circles
    for (var i=0; i<myCircles.length; i++) {
	twoD.beginPath();
	twoD.arc(myCircles[i][0], myCircles[i][1], myCircles[i][2], myCircles[i][3], myCircles[i][4]);
	twoD.strokeStyle="black";
	twoD.stroke();
	twoD.fillStyle=myCircles[i][5];
	twoD.fill();
    }
    // Keeps top circle a solid color
    /*twoD.beginPath();
    twoD.arc(myCircles[size-1][0], myCircles[size-1][1], myCircles[size-1][2], myCircles[size-1][3], myCircles[size-1][4]);
    twoD.strokeStyle="black";
    twoD.stroke();
    twoD.fillStyle="purple";
    twoD.fill();*/
}



// STARTS THE WEBGL PROCESS            

function webGLStart() {
    selectedVis = 1;
    //Hide 2d canvas
    canvas2d.width=0;
    canvas2d.height=0;
    //Show webGL canvas
    canvas.width = window.innerWidth-20;
    canvas.height = window.innerHeight-20;
    initGL(canvas);
    initShaders()
    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    tick();
}

// INITALIZE WEBGL

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");   // Set the context
        gl.viewportWidth = canvas.width;                // Set the canvas width
        gl.viewportHeight = canvas.height;              // Set the canvas height
    } catch (e) {
    }
    if (!gl) {                                          // Display an error if we can't initialize webGL
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// INITIALIZE SHADERS

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}    

// SET UP SHADERS

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

// INITIALIZE THE BUFFERS        

function initBuffers() {
    barArray.forEach(function(bar, ind) {
        vertexPositionBuffer[ind] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer[ind]);
        var vertices = [
            // Front face
            -1.0, -1.0,  1.0,
             1.0, -1.0,  1.0,
             1.0,  10.0,  1.0,
            -1.0,  10.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  10.0, -1.0,
             1.0,  10.0, -1.0,
             1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
             1.0, -1.0, -1.0,
             1.0,  10.0, -1.0,
             1.0,  10.0,  1.0,
             1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  10.0,  1.0,
            -1.0,  10.0, -1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        vertexPositionBuffer[ind].itemSize = 3;
        vertexPositionBuffer[ind].numItems = 24;

        vertexColorBuffer[ind] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);
        if(ind%3 == 0) {
            var colors = [
                [1.0, 0.0, 0.0, 1.0], // Front face
                [1.0, 0.0, 0.0, 1.0], // Back face
                [1.0, 1.0, 0.0, 1.0], // Top face
                [0.5, 0.0, 1.0, 1.0], // Bottom face
                [1.0, 1.0, 1.0, 1.0], // Right face
                [1.0, 1.0, 1.0, 1.0]  // Left face
            ];
        }
        else if(ind%3 == 1) {
            var colors = [
                [0.0, 1.0, 0.0, 1.0], // Front face
                [0.0, 1.0, 0.0, 1.0], // Back face
                [0.0, 1.0, 1.0, 1.0], // Top face
                [0.0, 1.0, 1.0, 1.0], // Bottom face
                [1.0, 1.0, 1.0, 1.0], // Right face
                [1.0, 1.0, 1.0, 1.0]  // Left face
            ];
        }
        else if(ind%3 == 2) {
            var colors = [
                [0.0, 0.0, 1.0, 1.0], // Front face
                [0.0, 0.0, 1.0, 1.0], // Back face
                [1.0, 0.0, 1.0, 1.0], // Top face
                [1.0, 0.0, 1.0, 1.0], // Bottom face
                [1.0, 1.0, 1.0, 1.0], // Right face
                [1.0, 1.0, 1.0, 1.0]  // Left face
            ];
        }
        var unpackedColors = [];
        for (var i in colors) {
            var color = colors[i];
            for (var j=0; j < 4; j++) {
                unpackedColors = unpackedColors.concat(color);
            }
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);
        vertexColorBuffer[ind].itemSize = 4;
        vertexColorBuffer[ind].numItems = 24;

        vertexIndexBuffer[ind] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer[ind]);
        var vertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.DYNAMIC_DRAW);
        vertexIndexBuffer[ind].itemSize = 1;
        vertexIndexBuffer[ind].numItems = 36;
    });
}


// DEFINE PUSHMATRIX, WILL BE USED TO PUSH BUFFERS ONTO THE CANVAS LATER

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

// DEFINE POPMATRIX, WILL BE USED TO POP BUFFERS OFF OF THE CANVAS LATER

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

// DEFINE SETMATRIXUNIFORMS, WILL BE USED TO CONNECT THE SHADERS TO THE BUFFERS

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

// DEGTORAD FUNCTION CONVERTS DEGREES TO RADIANS

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// TICK FUNCTION: CALLED EVERY FRAME, IT'S THE SAME FOR SOUNDJS AS IT IS FOR WEBGL            

function tick() {
    if(selectedVis == 1) {
	if(playing == true) {
            analyserNode.getFloatFrequencyData(freqFloatData);  // this gives us the dBs
            analyserNode.getByteFrequencyData(freqByteData);    // this gives us the frequency
            analyserNode.getByteTimeDomainData(timeByteData);   // this gives us the waveform
	}
	requestAnimFrame(tick);
	drawScene();                                            // Draw the scene and animate it
	animate();
    }
}

// DRAW TO THE SCREEN

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);

    mat4.translate(mvMatrix, [-13.75, -5.0, -17.5]);                                                                                  // Translate the cube to be at the center
    
    barArray.forEach(function(bar, ind) {
        mat4.translate(mvMatrix, [2.5, 0.0, 0.0]);                                                                                // Translate the cube to be at the center
        mvPushMatrix();                                                                                                             // Push cube onto the matrix
        mat4.rotate(mvMatrix, degToRad(-(ind*6)), [0, 1, 0]);                                                                             // Rotate it a little bit to see the full 3D effect

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer[ind]);                                                                   // Bind position, color, and vertices
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer[ind].itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer[ind].itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer[ind]);
        
        setMatrixUniforms();                                                                                                        // Set the Matrix and draw the cube
        gl.drawElements(gl.TRIANGLES, vertexIndexBuffer[ind].numItems, gl.UNSIGNED_SHORT, 0);

        mvPopMatrix();
    });
}

// ANIMATION: CALLED EVERY FRAME            

function animate() {
    barArray.forEach(function(bar, ind) {
        if(ind%3 == 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer[ind]);
            if(freqHeight < 3)                                                // If our value is negative, log it so we know about it
                freqHeight = 2.5;
            var vertices = [                                                    // Update the cube to be of a new height
                // Front face
                -1.0, -1.0,  1.0,
                 1.0, -1.0,  1.0,
                 1.0,  (freqHeight-3)+ind/1.75,  1.0,
                -1.0,  (freqHeight-3)+ind/1.75,  1.0,

                // Back face
                -1.0, -1.0, -1.0,
                -1.0,  (freqHeight-3)+ind/1.75, -1.0,
                 1.0,  (freqHeight-3)+ind/1.75, -1.0,
                 1.0, -1.0, -1.0,

                // Top face
                -1.0,  (freqHeight-3)+ind/1.75, -1.0,
                -1.0,  (freqHeight-3)+ind/1.75,  1.0,
                 1.0,  (freqHeight-3)+ind/1.75,  1.0,
                 1.0,  (freqHeight-3)+ind/1.75, -1.0,

                // Bottom face
                -1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                // Right face
                 1.0, -1.0, -1.0,
                 1.0,  (freqHeight-3)+ind/1.75, -1.0,
                 1.0,  (freqHeight-3)+ind/1.75,  1.0,
                 1.0, -1.0,  1.0,

                // Left face
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                -1.0,  (freqHeight-3)+ind/1.75,  1.0,
                -1.0,  (freqHeight-3)+ind/1.75, -1.0
            ];

            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
        
            var timeNow = new Date().getTime();
            var soundHeight = 10.0;   

            if(thirdTime == true) {                                             // Calls this every third frame
                var sum = 0;

                for(var number=0; number<freqByteData.length; number++){        // Get the average frequency level of the full decibel array (should be 175 at the highest)
                    sum += freqByteData[number];
                }
                var avg = sum/freqByteData.length;
                          
                freqHeight = avg/18;                                          // Divide by 18 to get value 0-10 THIS IS FOR FREQUENCY
                //DBHeight = (avg - zero)/4.2;                                  // Shift up by the zero val and divide by 4.2 to get value 0-10 THIS IS FOR DECIBELS
                //WFHeight = avg/18;                                              // Divide by 18 to get value 0-10 THIS IS FOR WAVEFORM
                
               //thirdTime = false;
            }
        }
        
        else if(ind%3 == 1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer[ind]);
            if(WFHeight < 3)                                                // If our value is negative, log it so we know about it
                WFHeight = 2.5;
            var vertices = [                                                    // Update the cube to be of a new height
                // Front face
                -1.0, -1.0,  1.0,
                 1.0, -1.0,  1.0,
                 1.0,  (WFHeight-3)+ind/1.75,  1.0,
                -1.0,  (WFHeight-3)+ind/1.75,  1.0,

                // Back face
                -1.0, -1.0, -1.0,
                -1.0,  (WFHeight-3)+ind/1.75, -1.0,
                 1.0,  (WFHeight-3)+ind/1.75, -1.0,
                 1.0, -1.0, -1.0,

                // Top face
                -1.0,  (WFHeight-3)+ind/1.75, -1.0,
                -1.0,  (WFHeight-3)+ind/1.75,  1.0,
                 1.0,  (WFHeight-3)+ind/1.75,  1.0,
                 1.0,  (WFHeight-3)+ind/1.75, -1.0,

                // Bottom face
                -1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                // Right face
                 1.0, -1.0, -1.0,
                 1.0,  (WFHeight-3)+ind/1.75, -1.0,
                 1.0,  (WFHeight-3)+ind/1.75,  1.0,
                 1.0, -1.0,  1.0,

                // Left face
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                -1.0,  (WFHeight-3)+ind/1.75,  1.0,
                -1.0,  (WFHeight-3)+ind/1.75, -1.0
            ];

            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
        
            var timeNow = new Date().getTime();
            var soundHeight = 10.0;   

            if(thirdTime == true) {                                             // Calls this every third frame
                var sum = 0;

                for(var number=0; number<timeByteData.length; number++){        // Get the average frequency level of the full decibel array (should be 175 at the highest)
                    sum += timeByteData[number];
                }
                var avg = sum/timeByteData.length;
                          
                //freqHeight = avg/18;                                          // Divide by 18 to get value 0-10 THIS IS FOR FREQUENCY
                //DBHeight = (avg - zero)/4.2;                                  // Shift up by the zero val and divide by 4.2 to get value 0-10 THIS IS FOR DECIBELS
                WFHeight = avg/18;                                              // Divide by 18 to get value 0-10 THIS IS FOR WAVEFORM
                
                
               //thirdTime = false;
            }
        }

        else if(ind%3 == 2) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer[ind]);
            if(DBHeight < 1)
            {                                               // If our value is negative, log it so we know about it
                if(ind==2)
                    DBHeight = 2.5;
                else if(ind == 5)
                    DBHeight = 1;
                else
                    DBHeight = 0;
            }
            var vertices = [                                                    // Update the cube to be of a new height
                // Front face
                -1.0, -1.0,  1.0,
                 1.0, -1.0,  1.0,
                 1.0,  (DBHeight-3)+ind/1.75,  1.0,
                -1.0,  (DBHeight-3)+ind/1.75,  1.0,

                // Back face
                -1.0, -1.0, -1.0,
                -1.0,  (DBHeight-3)+ind/1.75, -1.0,
                 1.0,  (DBHeight-3)+ind/1.75, -1.0,
                 1.0, -1.0, -1.0,

                // Top face
                -1.0,  (DBHeight-3)+ind/1.75, -1.0,
                -1.0,  (DBHeight-3)+ind/1.75,  1.0,
                 1.0,  (DBHeight-3)+ind/1.75,  1.0,
                 1.0,  (DBHeight-3)+ind/1.75, -1.0,

                // Bottom face
                -1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                // Right face
                 1.0, -1.0, -1.0,
                 1.0,  (DBHeight-3)+ind/1.75, -1.0,
                 1.0,  (DBHeight-3)+ind/1.75,  1.0,
                 1.0, -1.0,  1.0,

                // Left face
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                -1.0,  (DBHeight-3)+ind/1.75,  1.0,
                -1.0,  (DBHeight-3)+ind/1.75, -1.0
            ];

            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
        
            var timeNow = new Date().getTime();
            var soundHeight = 10.0;   
            

            if(thirdTime == true) {                                             // Calls this every third frame
                var sum = 0;

                for(var number=0; number<freqFloatData.length; number++){        // Get the average frequency level of the full decibel array (should be 175 at the highest)
                    sum += freqFloatData[number];
                }
                var avg = sum/freqFloatData.length;
                          
                //freqHeight = avg/18;                                          // Divide by 18 to get value 0-10 THIS IS FOR FREQUENCY
                DBHeight = (avg - zero)/4.2;                                  // Shift up by the zero val and divide by 4.2 to get value 0-10 THIS IS FOR DECIBELS
                //DBHeight = avg/18;                                              // Divide by 18 to get value 0-10 THIS IS FOR WAVEFORM
                
                
               thirdTime = false;
            }
        }
    });

    if(((DBHeight-3)+8/1.75) < 8) {
        oneTime = true;
    }

    if(((DBHeight-3)+8/1.75) > 8) {
        if(oneTime) {

            if(colorScheme == 1) {
                if(colorWheel == 1) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [0.0, 0.0, 1.0, 1.0], // Front face
                                [0.0, 0.0, 1.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [1.0, 0.0, 0.0, 1.0], // Front face
                                [1.0, 0.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);         
                    });
                    colorWheel += 1;
                }

                else if(colorWheel == 2) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [0.0, 0.0, 1.0, 1.0], // Front face
                                [0.0, 0.0, 1.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [1.0, 0.0, 0.0, 1.0], // Front face
                                [1.0, 0.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);         
                    });
                    colorWheel += 1;
                }

                else if(colorWheel == 3) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [1.0, 0.0, 0.0, 1.0], // Front face
                                [1.0, 0.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [0.0, 0.0, 1.0, 1.0], // Front face
                                [0.0, 0.0, 1.0, 1.0], // Back face
                                [1.0, 1.0, 0.0, 1.0], // Top face
                                [0.5, 0.0, 1.0, 1.0], // Bottom face
                                [1.0, 1.0, 1.0, 1.0], // Right face
                                [1.0, 1.0, 1.0, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);
                        colorWheel = 1;         
                    });
                }
            }
            else if(colorScheme == 2) {
                if(colorWheel == 1) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [0.3, 0.3, 0.9, 1.0], // Front face
                                [0.3, 0.3, 0.9, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [1.0, 0.7, 0.0, 1.0], // Front face
                                [1.0, 0.7, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);         
                    });
                    colorWheel += 1;
                }

                else if(colorWheel == 2) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [0.3, 0.3, 0.9, 1.0], // Front face
                                [0.3, 0.3, 0.9, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [1.0, 0.7, 0.0, 1.0], // Front face
                                [1.0, 0.7, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);         
                    });
                    colorWheel += 1;
                }

                else if(colorWheel == 3) {
                    barArray.forEach(function(bar, ind) {
                        
                        //vertexColorBuffer[ind] = gl.createBuffer();
                        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer[ind]);

                        if(ind%3 == 0) {
                            var colors = [
                                [1.0, 0.7, 0.0, 1.0], // Front face
                                [1.0, 0.7, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 1) {
                            var colors = [
                                [0.0, 1.0, 0.0, 1.0], // Front face
                                [0.0, 1.0, 0.0, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        else if(ind%3 == 2) {
                            var colors = [
                                [0.3, 0.3, 0.9, 1.0], // Front face
                                [0.3, 0.3, 0.9, 1.0], // Back face
                                [1.0, 1.0, 1.0, 1.0], // Top face
                                [1.0, 1.0, 1.0, 1.0], // Bottom face
                                [0.1, 0.1, 0.1, 1.0], // Right face
                                [0.1, 0.1, 0.1, 1.0]  // Left face
                            ];
                        }
                        var unpackedColors = [];
                        for (var i in colors) {
                            var color = colors[i];
                            for (var j=0; j < 4; j++) {
                                unpackedColors = unpackedColors.concat(color);
                            }
                        }
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.DYNAMIC_DRAW);
                        colorWheel = 1;         
                    });
                }
            }
            oneTime = false;
        }
    }


    frameCt += 1;                                                       // Update the frame count, and call every third time
    if(frameCt > 4)
    {
        thirdTime = true;
        frameCt = 0;
    }

    console.log(colorScheme);
}
