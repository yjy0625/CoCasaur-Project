var scene, camera, renderer;
var controls;
var spheres = [];

var rows = 20;
var cols = 30;
var pad = 3;
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

	renderer = new THREE.WebGLRenderer( { alpha: true } );
	renderer.setClearColor( 0x000000, 0 );
	renderer.setSize(WIDTH, HEIGHT);

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
	parameters.z = -300;

	// ADD A BOX

	for(var x = minX; x <= maxX; x += pad) {
		for(var y = minY; y <= maxY; y+= pad) {
			var sphere = addSphere(1, {x: x, y: y, z: -270}, 0xffffff);
			spheres.push(sphere);
		}
	}

	// DEBUGGING

	gui = new dat.GUI();
	gui.add(parameters, 'z', -500, 100).onChange(updatePlacement);

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
	renderer.setClearColor( 0x000000, 0 );
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
	const SEGMENTS = 16;
	const RINGS = 16;
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

function setCubeColor(index, opacity) {
	spheres[index].material.opacity = opacity;
}

function detectHand() {
	var smoother = new Smoother([0.9995, 0.9995], [0, 0], 0),
		canvas = document.getElementById('canvas'),
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
		context.drawImage(video, 0, 0, canvas.clientWidth, canvas.clientHeight);
		
		if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
		
			// Prepare the detector once the video dimensions are known:
          	if (!detector) {
	      		var width = ~~(140 * video.videoWidth / video.videoHeight);
				var height = 140;
	      		detector = new objectdetect.detector(width, height, 1.1, objectdetect.handopen);
	      	}
      		
      		// Smooth rotation of the 3D object:
			angle = smoother.smooth(angle);

      		// Perform the actual detection:
			var coords = detector.detect(video, 1);
			
			if (coords[0]) {
				var coord = coords[0];
				
				// Rescale coordinates from detector to video coordinate space:
				var drawWidth = cols * 2;
				var drawHeight = rows * 2;
				coord[0] *= drawWidth / detector.canvas.width;
				coord[1] *= drawHeight / detector.canvas.height;
				coord[2] *= drawWidth / detector.canvas.width;
				coord[3] *= drawHeight / detector.canvas.height;

				document.getElementById("log").innerHTML = video.videoWidth + " " + video.videoHeight;

				var index = 0;
				for(var x = minX; x <= maxX; x += pad) {
					for(var y = maxY; y >= minY; y -= pad) {
						if(inRange(x - minX, coord[0], coord[2]) && inRange(y - minY, coord[1], coord[3])) {
							setCubeColor(index, 1.0);
						}
						else {
							setCubeColor(index, 0.0);
						}
						index++;	
					}
				}
				var log = document.getElementById("log").innerHTML;
				log += "<br/>" + coord[0].toFixed(2) + " " + coord[1].toFixed(2) + " " + coord[2].toFixed(2) + " " + coord[3].toFixed(2);
				document.getElementById("log").innerHTML = log;
				
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
				context.beginPath();
				context.lineWidth = '2';
				context.fillStyle = fist_pos_old ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
				context.fillRect(
					coord[0] / video.videoWidth * canvas.clientWidth,
					coord[1] / video.videoHeight * canvas.clientHeight,
					coord[2] / video.videoWidth * canvas.clientWidth,
					coord[3] / video.videoHeight * canvas.clientHeight);
				context.stroke();
			} else fist_pos_old = null;
		}
	}
}

function inRange(num, low, high) {
	return (num >= low) && (num <= high);
}