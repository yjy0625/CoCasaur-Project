var PRINT_CONTROL = false;
var PRINT_CAM = false;

var scene, camera, renderer;
var controls;
var spheres = [];

var rows = 20;
var cols = 30;
var pad = 2;
var minX = -cols * pad;
var maxX = cols * pad;
var minY = -rows * pad;
var maxY = rows * pad;

var gui;

function init() {
	createScene();
	animate();
	detectHand();
}

function createScene() {
	// SETUP

	const WIDTH = window.innerWidth;
	const HEIGHT = window.innerHeight;

	const VIEW_ANGLE = 45;
	const ASPECT = WIDTH / HEIGHT;
	const NEAR = 0.1;
	const FAR = 10000;

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );

	renderer = new THREE.WebGLRenderer( { alpha: true } );
	renderer.setSize(WIDTH, HEIGHT);
	renderer.setClearColor( 0x000000, 0 );

	camera = new THREE.PerspectiveCamera(
		VIEW_ANGLE,
		ASPECT,
		NEAR,
		FAR
	);
	scene.add(camera);

	const container = document.querySelector('#container');
	container.appendChild(renderer.domElement);

	var parameters = {};
	parameters.z = -80;

	// ADD A BOX

	for(var x = minX; x <= maxX; x += pad) {
		for(var y = minY; y <= maxY; y+= pad) {
			var randRadius = Math.sqrt(Math.random());
			var randHue = Math.floor(Math.random() * 360) + 1;
			var sphere = addSphere(randRadius, {x: x, y: y, z: -270}, "hsla(" + randHue + ", 100%, 50%, 1)");
			spheres.push(sphere);
		}
	}

	// DEBUGGING

	if(PRINT_CONTROL) {
		gui = new dat.GUI();
		gui.add(parameters, 'z', -500, 100).onChange(updatePlacement);
	}

	// LIGHTS

	const pointLight = new THREE.PointLight(0xffffff);

	pointLight.position.set(13, 30, -130);
	scene.add(pointLight);

	// CONTROL

	controls = new THREE.OrbitControls(camera, renderer.domElement);

	// RENDER

	render();

	updatePlacement();

	function updatePlacement() {
		var index = 0;
		for(var x = minX; x <= maxX; x += pad) {
			for(var y = maxY; y >= minY; y -= pad) {
				spheres[index].position.z = parameters.z;
				index++;
			}
		}
	}
}

function render() {
	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

function animate() {
    requestAnimationFrame(animate);
    render();
    controls.update();
}

// SHAPES

function addBox(sidelength, position, color) {
	var material = new THREE.MeshBasicMaterial( {color: color} );
	var cube = new THREE.Mesh( 
		new THREE.BoxGeometry( sidelength, sidelength, sidelength ), 
		material 
	);
	cube.position.x = position.x;
	cube.position.y = position.y;
	cube.position.z = position.z;
	scene.add( cube );
	return cube;
}

function addSphere(radius, position, color) {
	const SEGMENTS = 5;
	const RINGS = 5;
	var material = new THREE.MeshBasicMaterial( {color: color, transparent: true, opacity: 0.0} );
	var sphere = new THREE.Mesh( 
		new THREE.SphereGeometry( radius, SEGMENTS, RINGS ), 
		material 
	);
	sphere.position.x = position.x;
	sphere.position.y = position.y;
	sphere.position.z = position.z;
	scene.add( sphere );
	return sphere;
}

function setSphereOpacity(index, opacity) {
	if(spheres[index].material.opacity < opacity)
		spheres[index].material.opacity = opacity;
}

function increaseSphereOpacity(index, amount) {
	spheres[index].material.opacity = spheres[index].material.opacity + amount;
}

function decreaseSphereOpacity(index, amount) {
	spheres[index].material.opacity = spheres[index].material.opacity - amount;
}

function detectHand() {
	var smoother = new Smoother([0.9995, 0.9995], [0, 0], 0),
		canvas = document.getElementById('video'),
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

	var fist_pos_old, angle = [0, 0];
	
	function play() {
		compatibility.requestAnimationFrame(play);
		if (video.paused) video.play();
        
        // Draw video overlay:
		canvas.width = ~~(100 * video.videoWidth / video.videoHeight);
		canvas.height = 100;
		if(PRINT_CAM) {
			context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
		}
		
		if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
		
			// Prepare the detector once the video dimensions are known:
          	if (!detector) {
	      		var width = ~~(140 * video.videoWidth / video.videoHeight);
				var height = 140;
	      		detector = new objectdetect.detector(width, height, 1.1, objectdetect.handfist);
	      	}
      		
      		// Smooth rotation of the 3D object:
			angle = smoother.smooth(angle);

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
				var displayDrawWidth = cols * 2 * pad;
				var displayDrawHeight = rows * 2 * pad;
				displayCoord[0] = Math.floor(coord[0] * displayDrawWidth / drawWidth - displayDrawWidth / 2);
				displayCoord[1] = Math.floor(coord[1] * displayDrawHeight / drawHeight - displayDrawHeight / 2);
				displayCoord[2] = Math.ceil((coord[0] + coord[2]) * displayDrawWidth / drawWidth - displayDrawWidth / 2);
				displayCoord[3] = Math.ceil((coord[1] + coord[3]) * displayDrawHeight / drawHeight - displayDrawHeight / 2);

				// log canvas sizes
				document.getElementById("log").innerHTML  = "The Min & max of x & y: " + minX + "," + maxX + "," + minY + "," + maxY;
				document.getElementById("log").innerHTML += "<br/>Original: " + detector.canvas.width + " " + detector.canvas.height;
				document.getElementById("log").innerHTML += "<br/>Video: " + drawWidth + " " + drawHeight;
				document.getElementById("log").innerHTML += "<br/>Display: " + displayDrawWidth + " " + displayDrawHeight;

				// draw on three.js if recognition is stable
				if (fist_pos_old) {
					drawInRect(displayCoord);
				}
				else {
					drawInRect([1000,1000,1000,1000]);
				}
				
				// log coordinate positions
				var log = document.getElementById("log").innerHTML;
				log += "<br/>Original Coords: " 
					+ coords[0][0].toFixed(2) + " " 
					+ coords[0][1].toFixed(2) + " " 
					+ coords[0][2].toFixed(2) + " " 
					+ coords[0][3].toFixed(2);
				log += "<br/>Video Coords: " 
					+ coord[0].toFixed(2) + " " 
					+ coord[1].toFixed(2) + " " 
					+ coord[2].toFixed(2) + " " 
					+ coord[3].toFixed(2);
				log += "<br/>Display Coords: [ " 
					+ displayCoord[0] + " ~ " + displayCoord[2] 
					+ " , " 
					+ displayCoord[1] + " ~ " + displayCoord[3]
					+ " ]";
				document.getElementById("log").innerHTML = log;
				
				// keep a record of fist position
				var fist_pos = [coord[0] + coord[2] / 2, coord[1] + coord[3] / 2];
				if (fist_pos_old) {
					var dx = (fist_pos[0] - fist_pos_old[0]) / video.videoWidth,
						dy = (fist_pos[1] - fist_pos_old[1]) / video.videoHeight;
					
					if (dx*dx + dy*dy < 0.2) {
						angle[0] += 5.0 * dx;
						angle[1] += 5.0 * dy;
					}
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

function inRange(num, low, high) {
	return (num >= low) && (num <= high);
}

function inCircle(coords, center, radius) {
	return Math.pow(coords[1] - center[1], 2.0) + Math.pow(coords[0] - center[0], 2.0) <= radius * radius;
}

function getIntensityBasedOnDistance(coords, center, radius) {
	var dist = Math.sqrt(Math.pow(coords[1] - center[1], 2.0) + Math.pow(coords[0] - center[0], 2.0));
	if(dist >= radius) return 0;
	else {
		var ratio = dist / radius;
		return Math.cos(ratio * Math.PI / 2);
	}
}

function drawInRect(coords) {
	var center = [(coords[0] + coords[2]) / 2, (coords[1] + coords[3]) / 2];
	var radius = ((coords[2] - coords[0]) / 2 + (coords[3] - coords[1]) / 2) / 2;
	
	var draw = coords.length >= 4;
	index = 0;
	for(var x = maxX; x >= minX; x -= pad) {
		for(var y = maxY; y >= minY; y -= pad) {
			if(draw) {
				if(inCircle([x,y], center, radius)) {
					setSphereOpacity(index, getIntensityBasedOnDistance([x,y], center, radius));
				}
				else {
					decreaseSphereOpacity(index, 0.1);
				}
			}
			else {
				decreaseSphereOpacity(index, 0.1);
			}
			index++;	
		}
	}
}