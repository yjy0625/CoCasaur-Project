var Globals = {
	ShowTitle: true,
	ShowCamera: false,
	UseCamera: true,
	ColorIsRandom: true,
	ParticleColor: [255, 255, 255]
};

var SHOW_GUI = false;
var SHOW_STATS = false;
var IS_DRAWING = false;

var mousePosition = [window.innerWidth / 2, window.innerHeight / 2];

function load() {
	var camera, tick = 0,
		scene, renderer, clock = new THREE.Clock(),
		controls, container,
		options, spawnerOptions;

	var gui = null;
	gui = new dat.GUI( { width: 350 } );
	document.getElementsByClassName("ac")[0].style.visibility = "hidden";

	var particleSystems = [];
	var controllingParticleSystem = null;

	var stats;

	initDisplay();
	animate();
	detectHand();

	function initDisplay() {

		//

		container = document.getElementById( 'container' );

		camera = new THREE.PerspectiveCamera( 28, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 100;

		scene = new THREE.Scene();

		// options passed during each spawned

		options = {
			position: new THREE.Vector3(),
			positionRandomness: .3,
			velocity: new THREE.Vector3(),
			velocityRandomness: .5,
			color: 0xffffff,
			colorRandomness: .2,
			turbulence: .5,
			lifetime: 10,
			size: 5,
			sizeRandomness: 1
		};

		spawnerOptions = {
			spawnRate: 20000,
			horizontalSpeed: 1.5,
			verticalSpeed: 1.33,
			timeScale: 1
		};

		//

		var globalFolder = gui.addFolder('Global Settings');
		globalFolder.add(Globals, 'ShowTitle').listen();
		globalFolder.add(Globals, 'ShowCamera').listen();
		globalFolder.add(Globals, 'UseCamera').listen();

		var optionsFolder = gui.addFolder('Particle Appearance Options');
		optionsFolder.add( options, "velocityRandomness", 0, 3 );
		optionsFolder.add( options, "positionRandomness", 0, 3 );
		optionsFolder.add( options, "size", 1, 20 );
		optionsFolder.add( options, "sizeRandomness", 0, 25 );
		optionsFolder.add( options, "colorRandomness", 0, 1 );
		optionsFolder.add( options, "lifetime", .1, 10 );
		optionsFolder.add( options, "turbulence", 0, 1 );

		var spawnerOptionsFolder = gui.addFolder('Particle Generation Options');
		spawnerOptionsFolder.add( spawnerOptions, "spawnRate", 10, 20000 );
		spawnerOptionsFolder.add( spawnerOptions, "timeScale", 0.1, 1 );

		var colorOptionsFolder = gui.addFolder('Particle Color Options');
		colorOptionsFolder.add( Globals, "ColorIsRandom" );
		colorOptionsFolder.addColor( Globals, "ParticleColor" );

		//

		if(SHOW_STATS) {
			stats = new Stats();
			container.appendChild( stats.dom );
		}

		//

		renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		container.appendChild( renderer.domElement );

		//

		controls = new THREE.TrackballControls( camera, renderer.domElement );
		controls.rotateSpeed = 5.0;
		controls.zoomSpeed = 2.2;
		controls.panSpeed = 1;
		controls.dynamicDampingFactor = 0.3;

		window.addEventListener( 'resize', onWindowResize, false );
		window.addEventListener( 'mousemove', onMouseMove, false );
		window.addEventListener( 'keydown', onKeyDown, false );
		window.addEventListener( 'keyup', onKeyUp, false );

		//

	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}

	function onMouseMove(e) {

		mousePosition = [e.pageX, e.pageY];

	}

	function onKeyDown(e) {

		var key = e.key;

		if(key == 'd') {
			IS_DRAWING = true;
		}

	}

	function onKeyUp(e) {

		var key = e.key;

		if(key == 'c') {
			Globals.ShowCamera = !Globals.ShowCamera;
		}
		else if(key == 'g') {
			SHOW_GUI = !SHOW_GUI;
			if(SHOW_GUI) {
				document.getElementsByClassName("ac")[0].style.visibility = "visible";
			}
			else {
				document.getElementsByClassName("ac")[0].style.visibility = "hidden";
			}
		}
		else if(key == 'u') {
			Globals.UseCamera = !Globals.UseCamera;
		}
		else if(key == 't') {
			Global.ShowTitle = !Globals.ShowTitle;
		}
		else if(key = 'd') {
			IS_DRAWING = false;
		}

	}

	function animate() {

		window.requestAnimationFrame(animate);

		if(Globals.ShowTitle) {
			document.getElementById("title").style.visibility = "visible";
			document.getElementById("subtitle").style.visibility = "visible";
		}
		else {
			document.getElementById("title").style.visibility = "hidden";
			document.getElementById("subtitle").style.visibility = "hidden";
		}

		for(var i = 0; i < particleSystems.length; i++) {
			var ps = particleSystems[i];
			ps.spawnerOptions.spawnRate -= 1000;

			updateParticleSystem(ps);

			// delete the particle system if its lifetime ends
			if(ps.spawnerOptions.spawnRate < -270000 / ps.spawnerOptions.timeScale) {
				scene.remove(ps);
				particleSystems.splice(i, 1);
				i--;
			}
		}

		if(controllingParticleSystem != null) {
			updateParticleSystem(controllingParticleSystem);
		}

		render();

		if(SHOW_STATS) {
			stats.update();
		}

	}

	function createParticleSystem() {

		controls.update();

		var particleSystem = new THREE.GPUParticleSystem( {
			maxParticles: 250000
		} );

		particleSystem.options = clone(options);
		particleSystem.options.speed = {x: 0.0, y: 0.0, z: 0.0};
		particleSystem.options.tick = 0;
		particleSystem.options.clock = new THREE.Clock();

		if(Globals.ColorIsRandom) {
			particleSystem.options.color = hslToHex(Math.random(), 1, 0.5);
		}
		else {
			particleSystem.options.color = rgbToHex(Globals.ParticleColor);
		}

		particleSystem.spawnerOptions = clone(spawnerOptions);

		scene.add( particleSystem );

		return particleSystem;

	}

	function updateParticleSystem(particleSystem) {

		var delta = particleSystem.options.clock.getDelta() * particleSystem.spawnerOptions.timeScale;

		particleSystem.options.tick += delta;
		var tick = particleSystem.options.tick;

		if ( tick < 0 ) {
			particleSystem.options.tick = 0;
			tick = 0;
		}

		// get location offset
		var targetPosition = particleSystem.options.targetPosition;
		var position = particleSystem.options.position;
		if(targetPosition != null) {
			var cameraOffset = getVector(position, targetPosition);
			var cameraMagnitude = getMagnitude(cameraOffset);

			const maxCameraSpeed = 20.0;
			const maxDisplaySpeed = 1.0 * (Globals.UseCamera? 1.0: 5.0);

			var displaySpeed = maxDisplaySpeed;
			if(cameraMagnitude < maxCameraSpeed) {
				var percentage = cameraMagnitude / maxCameraSpeed;
				displaySpeed = percentage * percentage * maxDisplaySpeed;
			}

			var speedMultiplier = (cameraMagnitude <= 10e-6)? 0: displaySpeed / cameraMagnitude;
			var displayOffset = {
				x: cameraOffset.x * speedMultiplier,
				y: cameraOffset.y * speedMultiplier,
				z: cameraOffset.z * speedMultiplier
			};

			particleSystem.options.speed = displayOffset;

			var newPosition = particleSystem.options.position;
			newPosition.x += particleSystem.options.speed.x;
			newPosition.y += particleSystem.options.speed.y;
			newPosition.z += particleSystem.options.speed.z;
			particleSystem.options.position = newPosition;
		}

		if ( delta > 0 ) {

			for ( var x = 0; x < particleSystem.spawnerOptions.spawnRate * delta; x++ ) {

				particleSystem.spawnParticle( particleSystem.options );

			}

		}

		particleSystem.update( tick );

	}

	function render() {

		renderer.render( scene, camera );

	}

	function detectHand() {

		var canvas = document.getElementById('video'),
			context = canvas.getContext('2d'),
			video = document.createElement('video'),
			detector;

		video.className = "video";

		try {
			compatibility.getUserMedia({video: true}, function(stream) {
				try {
					video.src = compatibility.URL.createObjectURL(stream);
				} catch (error) {
					video.src = stream;
				}
				compatibility.requestAnimationFrame(play);
			}, function (error) {
				alert("WebRTC not available");
			});
		} catch (error) {
			alert(error);
		}

		var fist_pos_old;
		
		function play() {
			compatibility.requestAnimationFrame(play);
			if (video.paused) video.play();

			if(Globals.UseCamera) {
				performCamDetection();
			}
			else {
				performMouseDetection();
			}
		}

		function performCamDetection() {
			if(Globals.ShowCamera) {
				document.getElementById("video").style.visibility = "visible";
			}
			else {
				document.getElementById("video").style.visibility = "hidden";
			}

	        // Draw video overlay:
			canvas.width = ~~(100 * video.videoWidth / video.videoHeight);
			canvas.height = 100;
			context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
			
			if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
			
				// Prepare the detector once the video dimensions are known:
	          	if (!detector) {
		      		var width = ~~(140 * video.videoWidth / video.videoHeight);
					var height = 140;
		      		detector = new objectdetect.detector(width, height, 1.1, objectdetect.handfist);
		      	}

	      		// Perform the actual detection:
				var coords = detector.detect(video, 1);
				
				if (coords[0]) {
					// [startx, starty, width, height]
					var coord = coords[0].slice(0);

					var dataSourceWidth = detector.canvas.width;
					var dataSourceHeight = detector.canvas.height;

					var displayCoord = translateCoordinates(coord, dataSourceWidth, dataSourceHeight);

					// draw on three.js if recognition is stable
					if (fist_pos_old) {
						drawInRect(displayCoord);
					}
					else {
						drawInRect([]);
					}
					
					// keep a record of fist position
					var fist_pos = [coord[0] + coord[2] / 2, coord[1] + coord[3] / 2];
					if (fist_pos_old) {
						var dx = (fist_pos[0] - fist_pos_old[0]) / video.videoWidth,
							dy = (fist_pos[1] - fist_pos_old[1]) / video.videoHeight;
						
						fist_pos_old = fist_pos;
					} else if (coord[4] > 2) {
						fist_pos_old = fist_pos;
					}
				
					// Draw coordinates on video overlay:
					if(Globals.ShowCamera) {
						context.beginPath();
						context.lineWidth = '2';
						context.fillStyle = fist_pos_old ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
						context.fillRect(coord[0], coord[1], coord[2], coord[3]);
						context.stroke();
					}
				} else fist_pos_old = null;
			}
		}

		function performMouseDetection() {

			var coord = [window.innerWidth - mousePosition[0], mousePosition[1], 0, 0];

			document.getElementById("video").style.visibility = "hidden";

			// Rescale coordinates from mouse coordinate space to video coordinate space:
			var dataSourceWidth = window.innerWidth;
			var dataSourceHeight = window.innerHeight;
			
			var displayCoord = translateCoordinates(coord, dataSourceWidth, dataSourceHeight, 0.5);

			if(IS_DRAWING) {
				drawInRect(displayCoord);
			}
			else {
				drawInRect([]);
			}

		}

		function translateCoordinates(coord, dataSourceWidth, dataSourceHeight, multiplier = 1.0) {

			// [startx, starty, endx, endy]
			var displayCoord = coord.slice(0);
			
			// Rescale coordinates from detector to three.js drawing coordinate space:
			var displayWidth = canvas.width;
			var displayHeight = canvas.height;
			var minX = -displayWidth / 2;
			var maxX = displayWidth / 2;
			var minY = -displayHeight / 2;
			var maxY = displayHeight / 2;

			displayCoord[0] = Math.floor(coord[0] * displayWidth / dataSourceWidth - displayWidth / 2) * multiplier;
			displayCoord[1] = Math.floor(coord[1] * displayHeight / dataSourceHeight - displayHeight / 2)* multiplier;
			displayCoord[2] = Math.ceil((coord[0] + coord[2]) * displayWidth / dataSourceWidth - displayWidth / 2)* multiplier;
			displayCoord[3] = Math.ceil((coord[1] + coord[3]) * displayHeight / dataSourceHeight - displayHeight / 2)* multiplier;

			return displayCoord;

		}

	}

	function drawInRect(coords) {
		var center = {
			x: -(coords[0] + coords[2]) / 2,
			y: -(coords[1] + coords[3]) / 2,
			z: 0
		};

		var draw = coords.length >= 4;
		var isControlling = (controllingParticleSystem != null);
		var state = (isControlling? 1: 0) * 2 + (draw? 1: 0);
		// console.log("State: " + state + "; center: [" + center.x + "," + center.y + "]; System size: " + particleSystems.length);

		// ASCII State Diagram
		//
		//  /---\     /---\     /---\     /---\
		//  | 0 | --> | 1 | --> | 3 | --> | 2 | 
		//  \---/     \---/     \---/     \---/
		//	  A						        |
		//    |                             |
		//	  \-----------------------------/
		//
		switch(state) {
		case 0: // x draw, x control
			break;
		case 1: // √ draw, x control -- first appearance of fist
			var newParticleSystem = createParticleSystem();
			newParticleSystem.options.position = center;
			newParticleSystem.options.targetPosition = center;
			controllingParticleSystem = newParticleSystem;
			break;
		case 2: // x draw, √ control
			controllingParticleSystem.targetPosition = null;
			particleSystems.push(controllingParticleSystem);
			controllingParticleSystem = null;
			break;
		case 3: // √ draw, √ control
			controllingParticleSystem.options.targetPosition = center;
			break;
		default:
			console.log("There is an error in your code! Life sucks.");
		}
	}
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function getVector(pt1, pt2) {
	return {x: pt2.x - pt1.x, y: pt2.y - pt1.y, z: 0};
}

function getMagnitude(v) {
	return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function hslToHex(h, s, l) {
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function rgbToHex(rgb) {
	var r = rgb[0];
    var g = rgb[1];
    var b = rgb[2];

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}