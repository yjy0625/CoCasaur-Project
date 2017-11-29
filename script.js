var PRINT_CAM = false;
var SHOW_GUI = false;
var SHOW_STATS = false;

function load() {
	var camera, tick = 0,
		scene, renderer, clock = new THREE.Clock(),
		controls, container,
		options, spawnerOptions;

	var gui = null;
	if(SHOW_GUI) {
		gui = new dat.GUI( { width: 350 } );
	}

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

		if(SHOW_GUI) {
			gui.add( options, "velocityRandomness", 0, 3 );
			gui.add( options, "positionRandomness", 0, 3 );
			gui.add( options, "size", 1, 20 );
			gui.add( options, "sizeRandomness", 0, 25 );
			gui.add( options, "colorRandomness", 0, 1 );
			gui.add( options, "lifetime", .1, 10 );
			gui.add( options, "turbulence", 0, 1 );

			gui.add( spawnerOptions, "spawnRate", 10, 30000 );
			gui.add( spawnerOptions, "timeScale", -1, 1 );
		}

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

		if(!PRINT_CAM) {
			document.getElementById("video").style.display = "none";
		}
	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}

	function animate() {

		window.requestAnimationFrame(animate);

		for(var i = 0; i < particleSystems.length; i++) {
			var ps = particleSystems[i];
			ps.spawnerOptions.spawnRate -= 1000;

			updateParticleSystem(ps);

			// delete the particle system if its lifetime ends
			if(ps.spawnerOptions.spawnRate < -270000) {
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
		particleSystem.options.color = hslToHex(Math.random(), 1, 0.5);

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
			const maxDisplaySpeed = 1.0;

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
					// [startx, starty, endx, endy]
					var displayCoord = coord.slice(0);
					
					// Rescale coordinates from detector to video coordinate space:
					var drawWidth = canvas.width;
					var drawHeight = canvas.height;
					coord[0] *= drawWidth / detector.canvas.width;
					coord[1] *= drawHeight / detector.canvas.height;
					coord[2] *= drawWidth / detector.canvas.width;
					coord[3] *= drawHeight / detector.canvas.height;
					
					// Rescale coordinates from detector to three.js drawing coordinate space:
					var displayDrawWidth = drawWidth / 2;
					var displayDrawHeight = drawHeight / 2;
					var minX = -displayDrawWidth / 2;
					var maxX = displayDrawWidth / 2;
					var minY = -displayDrawHeight / 2;
					var maxY = displayDrawHeight / 2;

					displayCoord[0] = Math.floor(coord[0] * displayDrawWidth / drawWidth - displayDrawWidth / 2);
					displayCoord[1] = Math.floor(coord[1] * displayDrawHeight / drawHeight - displayDrawHeight / 2);
					displayCoord[2] = Math.ceil((coord[0] + coord[2]) * displayDrawWidth / drawWidth - displayDrawWidth / 2);
					displayCoord[3] = Math.ceil((coord[1] + coord[3]) * displayDrawHeight / drawHeight - displayDrawHeight / 2);

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
					if(PRINT_CAM) {
						context.beginPath();
						context.lineWidth = '2';
						context.fillStyle = fist_pos_old ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
						context.fillRect(coord[0], coord[1], coord[2], coord[3]);
						context.stroke();
					}
				} else fist_pos_old = null;
			}
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