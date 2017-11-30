# Particlize

This is the semester project for CoCasaur group of USC Corpus Callosum in Fall 2017.

## Description

This project is a particle system creation laboratory. You can think of it as the MS Paint with particle systems as brushes. 

### Live Demo

[Click me to jump to the demo website](https://yjy0625.github.io/particlize/)

### Program Mode and Control

The program has two modes -- mouse mode and camera mode. The default mode is mouse mode. You can press `U` to switch between the two modes. 

In mouse mode, hold down key `D` and move your mouse to draw particle systems.

In camera mode, wave the fist of your right hand in front of the webcam of your laptop to draw particle systems. If you want to see the webcam video data printed on the screen, press `C` to toggle it. The hand detection algorithm is not very noise-proof so a relatively plain background is needed for better performance in camera mode.

### Options

Press `G` to switch on/off the control panel for more options. There are 4 sections in the control panel.

* Global Settings

- Show Title: whether the title and subtitle at the bottom of the screen are shown.
- Show Camera: whether the webcam video data is printed on the screen. Same functionality as key `C`.
- Use Camera: switches between the two modes. Same functionality as key `U`.

* Particle Appearance Options

A number of particle appearance settings to play with. For time constraint issues I will not describe each of them. Have fun changing every slider to see what happens!

* Particle Generation Options

- Spawn Rate: controls how fast particles are generated per frame.
- Time Scale: controls how fast time is. For example, if you set the value to 0.5, then time is slowed down by 50% and you will get a timelapse effect in the particle systems you create.

* Particle Color Options

- Color Is Random: whether each particle system created has a random color.
- Particle Color: the color of particle systems being created. Only takes effect when color is not set to random.

## Running the Project Locally

1. Clone the repository
2. Get into the repo by typing the command `cd your-folder-name`.
3. Run python simple http server using command `python -m SimpleHTTPServer`.
4. Open your Chrome browser (Safari doesn't have WebRTC, which is required for the demo) and visit `localhost:8000`.

## Libraries Used in the Project

* three.js
* three.js GPU Particle System Plugin
* js-objectdetect
* dat.GUI