let songStartTime = null;
let audioContextStarted = false;


//font
let pixelFont;

let hero;
let game_background;
let targetY = null;
let stepY = 0; 
// Destructure Matter.js for easy access to Engine, Render, World, Bodies
const { Engine, Render, World, Bodies } = Matter;

let engine;
let render;
let ball;
let ground;

let balls = [];

//music conversion
let song;
let fft;
let amp;
let beatThreshold = 0.2;
let previousEnergy = 0;
let beats = [];


//hero
let canTrigger = true;

//normalize music elements
let dynamicBassThreshold = 0;
let dynamicMidThreshold = 0;
let dynamicTrebleThreshold = 0;


//audio
let mic; 
let amplitude; 

//logging
let logInterval = 500;
let lastLogTime = 0;

//processing
let beatArray = [];
let threshold = 30;
let dynamicThreshold = 0;
let analysisComplete = false;


//orbs
let lanes = [];
let rhythmOrbs = [];
let beatData;
let orbColor;
let backgroundSpeed = 2;
let updateCounter = 0;
let updateBatchSize = 10;
let missedCounter;
let score = 0;


//moving ground
let groundOffsetX = 0;
let groundSpeed = 2;
let characterSpeed = 2;
let groundTexture;

let isMousePressed = false;

//bools
let menu = true;

//commands
let speechRec;
let songPlaying = false;

//noise cancellation
let smoothedLevel = 0;
const smoothingFactor = 0.5;
var line_threshold = 0.12;

let gameOver = false;
let speechon = false;
let sparkles = []; 


function preload() {
    pixelFont = loadFont('minecraft_standard/MinecraftStandard.otf');
    beatData = loadJSON('beats/hope.json', () => {
        console.log("Beats loaded successfully");
    });
    // orbi
    orbtexture = loadImage(
        'aseprite/Rhythm_orb.png',
        () => console.log("Orb texture loaded successfully."),
        () => {
            console.error("Failed to load orb texture. Using default ellipse.");
            orbtexture = null;
        }
    );
    groundTexture = loadImage('aseprite/nightsky.png');
    soundbarTexture = loadImage('aseprite/sound_bar_bigbig.png');
    soundtresholdTexture = loadImage('aseprite/treshold_bar.png');
    cityTexture = loadImage('aseprite/city.png');
    heroImage = loadImage("img/bl2_guy.gif");
    roadTexture = loadImage('aseprite/road.png');


    song = loadSound("music/worstinme.mp3", () => {
        console.log("Song loaded successfully");

        // 2 sekundi da orbi pridejo do sredine
        let silenceBuffer = new Float32Array(song.sampleRate() * 5);
        let originalBuffer = song.buffer;

        
        let newBuffer = new AudioBuffer({
            length: silenceBuffer.length + originalBuffer.length,
            numberOfChannels: originalBuffer.numberOfChannels,
            sampleRate: originalBuffer.sampleRate
        });

        
        for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
            newBuffer.copyToChannel(silenceBuffer, channel, 0);
            newBuffer.copyToChannel(originalBuffer.getChannelData(channel), channel, silenceBuffer.length);
        }

        song.buffer = newBuffer;

        console.log("Added 2 seconds of silence to the song.");
    });

    

    console.log(`${rhythmOrbs.length} orbs created from beats.json`);
}

function setup() {
    createCanvas(600, 400, P2D);
    textFont(pixelFont);
    frameRate(30);
    console.log("Frame rate set to 30 FPS");

    //     // Add a button to initialize audio context
    // let startButton = createButton("Start Audio Context");
    // startButton.position(10, 10);
    // startButton.mousePressed(() => {
    //     getAudioContext().resume().then(() => {
    //     console.log("Audio context resumed.");
    //     startButton.hide(); // Hide the button after interaction
    //     });
    // });

    fft = new p5.FFT();

    fft.setInput(song);

    amplitude = new p5.Amplitude();

    game_background = new Game_Background(groundTexture, 0.2, 300, height/1.4);
    city = new Game_Background(cityTexture, 1, 200, height/1.7);
    road = new Game_Background(roadTexture, 2, 200, height*1);
    mic = new p5.AudioIn();

    let micButton = createButton("");
    micButton.position(10, 10);

    micButton.size(64, 64);
    micButton.style('background-image', 'url("img/buttonImage.png")');
    micButton.style('background-size', 'contain');
    micButton.style('background-repeat', 'no-repeat');
    micButton.style('background-position', 'center');
    micButton.style('background-color', 'transparent');
    micButton.style('border', '2px solid white');
    micButton.style('border-radius', '8px');
    micButton.style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.3)');

    // Add functionality to the button
    micButton.mousePressed(enableMic);


    // Create a dropdown for microphone selection
    // deviceDropdown = createSelect();
    // deviceDropdown.position(width/2.75, 10);
    // deviceDropdown.option("Select a Microphone");
    // deviceDropdown.changed(selectMicrophone);

    // Fetch available audio input devices
    // navigator.mediaDevices.enumerateDevices().then((devices) => {
    //     devices.forEach((device) => {
    //         if (device.kind === "audioinput") {
    //             deviceDropdown.option(device.label || `Microphone ${device.deviceId}`, device.deviceId);
    //         }
    //     });
    // });
    // Initialize amplitude analyzer
    // Inside `setup()`, add a callback for the song ending
    song.onended(() => {
        if (!paused){
        gameOver = true;
        }
        displayFinalResults();
    });

    amplitude = new p5.Amplitude();

    if (!Array.isArray(beatData)) {
        console.log("Converting beatData to an array...");
        beatData = Object.values(beatData);
    }

    if (!beatData) {
        console.error("Beat data not loaded. Check beats.json file.");
        return;
    }

    console.log(`${Object.keys(beatData).length} beats loaded`);


    engine = Engine.create();
    ground = Bodies.rectangle(400, 500, 810, 60, { isStatic: true });
    World.add(engine.world, [ground]);
    Engine.run(engine);

    hero = new Character("Hero", 85, { x: 275, y: 0.55*height }, heroImage,50);

    // let playButton = createButton("Play Song");
    // playButton.position(10, 10);
    // playButton.mousePressed(() => {
    //     if (!song.isPlaying() && !song.delayedStart) {
    //         // Indicate a delayed start
    //         song.delayedStart = true;
    //         console.log("Starting song in 2 seconds...");

    //         // Start the song after a 2-second delay
    //         setTimeout(() => {
    //             song.play();
    //             // background.resume();
    //             song.delayedStart = false; // Reset the delayedStart flag
    //             songStartTime = millis(); // Record the start time in milliseconds
    //             console.log("Song is now playing");
    //         }, 2000); // 2-second delay
    //     } else if (song.isPlaying()) {

    //         song.pause();
    //         game_background.stop() //bugged
    //         // backgroundSpeed = 0
    //         songStartTime = null;
    //         console.log("Song is paused");
    //     }
    // });

    missedCounter = new MissedCounter(); // Initialize the missed counter
    

    // Create rhythm orbs
    // Initialize a narrow lane
    // Define horizontal lane properties
    let laneX = 0;
    let laneY = height - 50;
    let laneWidth = width;
    let laneHeight = 50;
    let laneColor = color(200);

    rhythmOrbs = [];
    console.log("Loaded beatData:", beatData);

    // Validate that `beatData` is an array
    if (!Array.isArray(beatData)) {
        console.error("beatData is not an array. Check beats.json format.");
        console.error("Loaded beatData:", beatData);
        return;
    }


    if (Array.isArray(beatData)) {
        for (let beat of beatData) {
            let orbX = laneX + laneWidth / 2;
            let orbY = -50;
            let orbSize = 20;
            let orbColor = color(255, 0, 0);
            rhythmOrbs.push(new RhythmOrb(orbX, orbY, orbColor, orbSize, beat));
        }
    } else {
        console.error("beatData is not an array. Check beats.json format.");
    }
}

function selectMicrophone() {
    let selectedDeviceId = deviceDropdown.value();
    if (selectedDeviceId === "Select a Microphone") return;

    // Stop any existing stream
    if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
    }

    // Request access to the selected microphone
    navigator.mediaDevices
        .getUserMedia({ audio: { deviceId: selectedDeviceId } })
        .then((stream) => {
            micStream = stream;

            // Create a MediaStreamSource and connect to p5.Amplitude
            let audioContext = getAudioContext();
            let source = audioContext.createMediaStreamSource(stream);
            amplitude.setInput(source);

            audioContext.resume().then(() => {
                console.log("Audio context started");
                audioContextStarted = true;
            });
        })
        .catch((err) => {
            console.error("Failed to access the selected microphone:", err);
        });
}

function draw(){
    if (gameOver) {
        displayFinalResults();
    } else {
        game();
    }

}

function game(){
    let currentTime = millis();


        // if (speechon){
        //     // speechtotext();
        // }
        background(120);


        game_background.update()
        game_background.display()
        city.update()
        city.display()
        road.update()
        road.display()
        missedCounter.display();
        if (!audioContextStarted) {
            fill(255);
            textSize(16);
            textAlign(CENTER, CENTER);
            text("Click the button to enable the microphone", width / 2, height / 2);
            return;
        }

        // Get the current volume level
        // let level = amplitude.getLevel();

        // // Map the volume level to a bar height
        // let barHeight = map(level, 0, 1, 0, height);

        // // Volume meter
        // fill(155, 0, 155);
        // noStroke();
        // rect(width - 50, height - barHeight, 50, barHeight);

        // // Display volume intensity text
        // fill(255);
        // textSize(16);
        // textAlign(CENTER, BOTTOM);
        // text(`Volume:\n ${nf(level, 1, 3)}`, width-50, height - 10);

        // if (level > 0.12 && canTrigger) {
        //     hero.togglePosition(); // Call the toggle position method
        //     canTrigger = false; // Disable further triggers until level goes below threshold
        // } else if (level <= 0.15) {
        //     canTrigger = true; // Re-enable triggering when level is below threshold
        // }

        let micLevel = amplitude.getLevel(); // Total input level

        // Only process song energy if fft is initialized and the song is playing
        let songEnergy = 0;
        if (fft && song.isPlaying()) {
            songEnergy = fft.getEnergy("bass") / 255; // Normalize FFT energy
        }

        // Subtract song's contribution and smooth the level
        let netLevel = micLevel - songEnergy;
        netLevel = max(0, netLevel); // Ensure non-negative values
        smoothedLevel = lerp(smoothedLevel, netLevel, smoothingFactor);
        level = smoothedLevel;


        let barHeight = map(level, 0, 1, 0, height);

        if (barHeight>0.3*height){
            barHeight = 0.3*height
        }

        let barHeighttresh = map(line_threshold, 0, 1, 0, height);

        // Volume meter
        fill(155, 0, 155);
        noStroke();
        rect(width - 40, height - barHeight - 20, 30, barHeight);
        // fill(155, 0, 0);
        // rect(width - 50, height-barHeighttresh, 50, 2);

        let imageX = width - 60; // Align with the bar's x position
        let imageY = height - barHeighttresh*3; // Align with the bar's y position
        let imageWidth = 62; // Match the bar's width
        let imageHeight = barHeighttresh*3; // Match the bar's height

        


        // Display volume intensity text
        // fill(255);
        // textSize(16);
        // textAlign(CENTER, BOTTOM);
        // text(`Volume:\n ${nf(level, 1, 3)}`, width-50, height - 10);

        if (smoothedLevel > line_threshold && canTrigger) {
            hero.togglePosition();
            canTrigger = false;
        } else if (smoothedLevel <= line_threshold) {
            canTrigger = true;
        }

        if (song.isPlaying()) {
            game_background.resume();
            let currentTime = song.currentTime() * 1000;
            console.log("Song is playing, orbs incoming!")
            
            for (let orb of rhythmOrbs) {
                if (currentTime >= orb.beatTime) {
                    orb.update();
                    // orb.display();

                if (orb.checkCollision(hero)) {
                    orb.color=(0,200,0);
                    console.log("Orb collected!");
                    hero.incrementHitCounter();
                }
                if (orb.missed && !orb.hit) {
                    hero.resetHitCounter();
                    orb.missed = false;
                }
                }
                orb.display();
            }
            //če se pesem igra, spawna orbe
            spawnOrbs()
    
            rhythmOrbs = rhythmOrbs.filter(orb => orb.active);
        } else {
            // If the song is not playing, display a message
            // fill(255);
            // textSize(20);
            // textAlign(CENTER, CENTER);
            // text("Press Play Song to Start", width / 2, height / 2);
            // game_background.stop();
            pausedScreen();

            for (let orb of rhythmOrbs) {
                orb.display();
            }
        }

        // let backgroundSpeed = 2; // Adjust speed as needed
        image(soundbarTexture, imageX, height*0.63, imageWidth, height*0.35);
        image(soundtresholdTexture, imageX + 15, height - barHeighttresh - 20, 40, 12);
        hero.updateMovement();
        hero.display()
        hero.displayHitCounter();
}


function resetGame() {
    console.log("Resetting game...");

    gameOver = false;
    song.stop();
    hero = new Character("Hero", 85, { x: 275, y: 0.55 * height }, heroImage, 50);
    rhythmOrbs = [];
    missedCounter.reset();
    hero.score = 0;
    hero.hitCounter = 0;

    beatData = loadJSON('beats/hope.json', () => {
        console.log("Beats loaded successfully");
    });

    songPlaying = false;
    songStartTime = null;

    console.log("Game reset complete.");
}

function displayFinalResults() {
    background(50, 50, 50);
    fill(255);
    textSize(30);
    textAlign(CENTER, CENTER);
    text("Results", width / 2, height / 4);

    textSize(20);
    text(`Score: ${hero.score}`, width / 2, height / 1.7);
    text(`Missed Orbs: ${missedCounter.count}`, width / 2, height / 2);

    textSize(40);
    let rating = calculateRating(hero.score, missedCounter.count);

    
    stroke(255);
    strokeWeight(3);

    switch (rating) {
        case "SS":
        case "S":
            fill(255, 223, 0);
            break;
        case "A":
            fill(0, 0, 255);
            break;
        case "B":
            fill(0, 255, 0);
            break;
        case "D":
            fill(255, 165, 0);
            break;
        case "F":
            fill(255, 0, 0);
            break;
        default:
            fill(255);
    }
    noStroke();
    // Sparkles for B or above
    if (["B","A", "S", "SS"].includes(rating)) {
        createSparkles(width / 2, height / 2.5); // Sparkles around the rating text
    }

    stroke(255);
    textSize(40);
    text(`${rating}`, width / 2, height / 2.5);


    // Reset stroke for other text
    noStroke();

    

    textSize(16);
    text("Say 'rhythm reset' to restart.", width / 2, height / 1.4);
}

function calculateRating(score, missed) {
    if (missed === 0) return "SS";
    if (score > 200000 && missed < 5) return "S";
    if (score > 100000 && missed < 10) return "A";
    if (score < 80000) return "B";
    if (score < 40000 && score > 20000) return "C";
    if (score < 20000 && score > 10000) return "D";
    if (score < 10000) return "F";
    return "Try Again";
}

function createSparkles(x, y) {
    
    for (let i = 0; i < 5; i++) { 
        sparkles.push({
            x: x + random(-50, 50),
            y: y + random(-30, 30),
            size: random(5, 8),
            alpha: 255,
            speedY: random(-1, 1),
            speedX: random(-1, 1),
        });
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
        let sparkle = sparkles[i];
        fill(255, random(200, 255), random(200, 255), sparkle.alpha);
        noStroke();
        rect(sparkle.x, sparkle.y, sparkle.size, sparkle.size);

        sparkle.x += sparkle.speedX;
        sparkle.y += sparkle.speedY;

        sparkle.alpha -= 5;

        if (sparkle.alpha <= 0) {
            sparkles.splice(i, 1);
        }
    }
}

function gotSpeech() {
    if (speechRec.resultValue) {
        let command = speechRec.resultString.toLowerCase();
        console.log("Heard:", command);

        if ((command === 'rhythm play')||(command === 'rhythm start')||(command === 'rhythm star')||(command === 'we can start') && !songPlaying) {
            if (!song.isPlaying()) {

                paused=false;
                // Calculate start time dynamically to account for resuming
                songStartTime = millis() - song.currentTime() * 1000;
                song.play();
                game_background.resume();
                city.resume();
                road.resume();
                hero.play();
                songPlaying = true;
                console.log("Song is now playing...");
            }
        } 
        
        else if (command === 'rhythm higher') {
            line_threshold*=1.5;
        }

        else if (command === 'rhythm lower') {
            line_threshold/=1.5;
        }
        
        else if (command === 'rhythm reset') {
            resetGame();
        }

        else if ((command === 'rhythm stop') || (command === 'even stop')|| (command === 'random stuff')|| (command === "you're going to stop")||(command === "smooth and stop")||(command === "moving stock")||(command === "getting start")||(command === "get him stop")||(command === "rhythm pause")||(command === "because i'm stopped")||(command === "give him stuff")||(command === "you didn't stop") && songPlaying) {
            paused=true
            song.pause();
            game_background.stop();
            city.stop();
            road.stop();
            hero.stop();
            songPlaying = false;
            console.log("Song has paused.");
        }
    }
}

class Game_Background {
    constructor(texture, speed, heightOffset, canvasHeight) {
        this.texture = texture;
        this.speed = speed;
        this.originalspeed = speed;
        this.offsetX = 0;
        this.heightOffset = heightOffset;
        this.canvasHeight = canvasHeight;
        this.isMoving = true;
    }

    update() {
        if (this.isMoving) {
            this.offsetX -= this.speed;
            if (this.offsetX <= -this.texture.width) {
                this.offsetX = 0;
            }
        }
    }

    display() {
        let scaledWidth = this.texture.width / 4;
        for (let x = this.offsetX; x < width; x += scaledWidth) {
            image(this.texture, x, this.canvasHeight - this.heightOffset, scaledWidth, this.heightOffset);
        }
    }

    stop() {
        this.isMoving = false;
        this.speed = 0;
    }

    resume() {
        this.isMoving = true;
        this.speed = this.originalspeed
    }

    // Adjust the speed dynamically
    setSpeed(newSpeed) {
        this.speed = newSpeed;
    }
}


function spawnOrbsBatch() {
    //poskus za manjši load, boljši performance
    let currentTime = song.currentTime() * 1000;
    let spawnAheadTime = 3000; //ne deluje

    let toSpawn = beatData.filter(beat => beat > currentTime && beat <= currentTime + spawnAheadTime);

    for (let beat of toSpawn) {
        let orbX = width + 20;
        let orbY = height / 2;
        let orbColor = color(255, 0, 0);
        let orbSize = 20;
        rhythmOrbs.push(new RhythmOrb(orbX, orbY, orbColor, orbSize, beat));

        beatData = beatData.filter(b => b !== beat);
    }
}


// function spawnOrbs() {
//     // Spawna orbe glede na beat array

//     if (songStartTime === null) return; // Do nothing if the song hasn't started

   
//     let currentTime = millis() - songStartTime;
    

//     // attempt delaya, ne deluje
//     let spawnTimeThreshold = currentTime + 2000;

    
//     for (let i = beatData.length - 1; i >= 0; i--) { 
//         if (beatData[i] <= spawnTimeThreshold && beatData[i] > currentTime) {
//             if (!orbtexture) {
//                 console.error("Orb texture is undefined at the time of orb creation.");
//             }
//             let orb = new RhythmOrb(width, height*0.7, color(255, 0, 0), 20, beatData[i], orbtexture);
//             rhythmOrbs.push(orb);

//             beatData.splice(i, 1);
//             console.log(`Spawned orb for beat at: ${beatData[i]} (current time: ${currentTime})`);
//         }
//     }
// }

function spawnOrbs() {
    if (!song.isPlaying()) return;

    let currentTime = song.currentTime() * 1000;

    for (let i = beatData.length - 1; i >= 0; i--) {
        if (beatData[i] <= currentTime) {
            let orb = new RhythmOrb(width, height * 0.7, color(255, 0, 0), 20, beatData[i], orbtexture);
            rhythmOrbs.push(orb);
            beatData.splice(i, 1);
        }
    }
}

function pausedScreen(){
    
    fill(50, 50, 50, 150);
    rect(0, 0, width, height);

    // Display a "Paused" message
    fill(255);
    textSize(30);
    textAlign(CENTER, CENTER);
    text("Paused", width / 2, height / 2);
    textAlign(LEFT, BOTTOM);
    textSize(8)
    text("'rhythm lower' - lower sound threshold\n'rhythm higher' - up threshold\n'rhythm play' - play song\n'rhythm stop' - stop song\nIf the speech commands aren't working click the mic icon", 0, height);
}




function detectBeatFromWaveform() {
    //prikaže frekvenčni spekter, za testiranje ampak bom v prihodnosti vključil zraven
    let waveform = fft.waveform();
    let sum = 0;

    
    for (let i = 0; i < waveform.length; i++) {
        sum += abs(waveform[i]);
    }
    let avgAmplitude = sum / waveform.length;

    
    if (millis() - lastLogTime > logInterval) {
        
        lastLogTime = millis();
    }
    
    if (avgAmplitude > 0.2) { 
        squareColor = 0;
    } else {
        squareColor = 255;
    }
}


// function detectBeat() {
//     let energy = fft.getEnergy("mid"); // Get energy in the bass range
//     let energy2 = fft.getEnergy("bass"); // Get energy in the midrange (vocals)
//     let energy3 = fft.getEnergy("treble"); // Get energy in the midrange (vocals)
//     let energy4 = fft.getEnergy("lowMid"); // Get energy in the midrange (vocals)

//     // Log the energy only if the time interval has passed
//     if (millis() - lastLogTime > logInterval) {
//         console.log("Midrange energy:", energy);
//         // Log the bass energy to see if it's changing
//         console.log("Bass energy:", energy2);
//         console.log("Treble energy:", energy3);
//         console.log("lowMid energy:", energy4);
//         lastLogTime = millis(); // Update the last log time
//     }
//     // Log the midrange energy to debug
    

//     // Check if energy exceeds the threshold and is a peak
//     if (energy > beatThreshold && energy > previousEnergy * 1.2) {
//         squareColor = 0; // Turn square black
//     } else {
//         squareColor = 255; // Turn square white
//     }
//     console.log("Bass energy:", fft.getEnergy("bass"));
//     previousEnergy = energy;
// }

function detectBeat() {
    let spectrum = fft.analyze();

    if (millis() - lastLogTime > logInterval) {
        // console.log("Spectrum:", spectrum);
        lastLogTime = millis();
    }
    let bassEnergy = fft.getEnergy("bass");
    let midEnergy = fft.getEnergy("mid");
    let trebleEnergy = fft.getEnergy("treble");

    // console.log(`Bass: ${bassEnergy}, Mid: ${midEnergy}, Treble: ${trebleEnergy}`);

    // Update dynamic thresholds
    dynamicBassThreshold = lerp(dynamicBassThreshold, bassEnergy * 1.2, 0.1); // 20% above recent average
    dynamicMidThreshold = lerp(dynamicMidThreshold, midEnergy * 1.2, 0.1);
    dynamicTrebleThreshold = lerp(dynamicTrebleThreshold, trebleEnergy * 1.2, 0.1);

    if (bassEnergy > dynamicBassThreshold) {
        console.log("Bass beat detected!");
        squareColor = color(255, 0, 0);
    } 
    else if (midEnergy > dynamicMidThreshold) {
        console.log("Mid beat detected!");
        squareColor = color(0, 255, 0); 
    } else if (trebleEnergy > dynamicTrebleThreshold) {
        console.log("Treble beat detected!");
        squareColor = color(0, 0, 255); 
    } 
    else {
        squareColor = 255;
    }
}

function drawSpectrum() {
    let spectrum = fft.analyze();

    noStroke();
    fill(0, 255, 0);
    for (let i = 0; i < spectrum.length; i++) {
        let x = map(i, 0, spectrum.length, 0, width);
        let h = map(spectrum[i], 0, 255, 0, height);
        rect(x, height, width / spectrum.length, -h);
    }
}

// retired enablemic
// function enableMic() {
//     console.log(getAudioContext().state);
//     // Browser misli, da je ves čs running zato sem tle dal samo true
//     if (true) {
//         console.log("inside");
//         getAudioContext().resume().then(() => {
//             console.log("Audio context started");
//             audioContextStarted = true;
//             speechRec = new p5.SpeechRec('en-US', gotSpeech);
//             speechRec.continuous = true; // Keep listening continuously
//             speechRec.interimResults = false; // Only finalize results are used
//             speechRec.start(); // Start listening
//         });
//     }

//     // Start the microphone
//     mic.start();
//     amplitude.setInput(mic); // Connect mic to amplitude analyzer
// }

function speechtotext(){
            console.log("Speech to text active");
            audioContextStarted = true;
            speechRec = new p5.SpeechRec('en-US', gotSpeech);
            speechRec.continuous = true; 
            speechRec.interimResults = false; 
            speechRec.start(); 

            let speechon = true;
}

// function enableMic() {
//     // Access the microphone with WebRTC audio constraints
//     navigator.mediaDevices.getUserMedia({
//         audio: {
//             echoCancellation: true,       // Enable echo cancellation
//             noiseSuppression: false,       // Enable noise suppression
//             autoGainControl: false,         // Enable auto-gain control
//             gain: 25
//         }
//     }).then((stream) => {
//         console.log("Microphone access granted with WebRTC enhancements.");
        
//         speechtotext();

//         // Create a MediaStreamSource from the stream
//         let audioContext = getAudioContext();
//         let source = audioContext.createMediaStreamSource(stream);



//         // Set the MediaStreamSource as input for p5.Amplitude
//         amplitude.setInput(source);
//         mic.start(); // Start the mic (optional in p5.js context)
//         audioContextStarted = true;
//     }).catch((err) => {
//         console.error("Error accessing microphone:", err);
//     });
// }

function enableMic() {
    // Access the microphone with WebRTC audio constraints
    navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,       // Enable echo cancellation
            noiseSuppression: false,      // Disable noise suppression to allow claps
            autoGainControl: false        // Disable browser's auto-gain control
        }
    }).then((stream) => {
        console.log("Microphone access granted with WebRTC enhancements.");

        speechtotext();

        let audioContext = getAudioContext();
        let source = audioContext.createMediaStreamSource(stream);

        let gainNode = audioContext.createGain();
        gainNode.gain.value = 10;

        source.connect(gainNode);

        amplitude.setInput(gainNode);

        mic.start(); 
        audioContextStarted = true;

        console.log("Gain applied without routing to speakers.");
    }).catch((err) => {
        console.error("Error accessing microphone:", err);
    });
}





function analyzeBeats() {
    console.log("Starting beat analysis...");
    song.play();
    song.pause();

    let duration = song.duration();
    let interval = 0.1;
    let currentTime = 0;

    let intervalID = setInterval(() => {
        if (currentTime >= duration) {
            clearInterval(intervalID);
            analysisComplete = true;
            console.log("Beat analysis complete:", beatArray);
            console.log("Beat analysis complete. Saving beat array...");
            saveJSON(beatArray, "beats.json");
            return;
        }

        
        song.jump(currentTime);

        
        song.play();
        setTimeout(() => {
            song.pause();

            
            fft.analyze();
            let bassEnergy = fft.getEnergy("bass");

            if (bassEnergy > threshold) {
                beatArray.push(currentTime * 1000);
                console.log(`Beat detected at ${currentTime} seconds`);
            }

            
            currentTime += interval;
        }, 50);
    }, interval * 1000);
}


function analyzeSongFrameByFrame() {
    let interval = 50;
    let duration = song.duration() * 1000;
    let currentTime = 0;

    
    let intervalID = setInterval(() => {
        if (currentTime >= duration) {
            clearInterval(intervalID);
            console.log("Beat analysis complete:", beatArray);
            return;
        }

        
        song.jump(currentTime / 1000);

        
        fft.analyze();
        let bassEnergy = fft.getEnergy("bass");

        if (bassEnergy > threshold) {
            beatArray.push(currentTime);
        }

        
        console.log("Analyzed frame at time:", currentTime);

        currentTime += interval;
    }, interval);
}


function drawWaveform() {
    let waveform = fft.waveform(); 
    let waveformWidth = 150; 
    let waveformHeight = 100; 
    let waveformX = 10; 
    let waveformY = 40; 

    noFill();
    stroke(255, 0, 0); 
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
        let x = map(i, 0, waveform.length, waveformX, waveformX + waveformWidth);
        let y = map(waveform[i], -1, 1, waveformY + waveformHeight, waveformY);
        vertex(x, y);
    }
    endShape();
}

function update() {
    
    Engine.update(engine, 1000 / 60);
    
    requestAnimationFrame(update);
}


function mousePressed() {
    
    isMousePressed = true;

    // Matter.Body.setPosition(ball, { x: mouseX, y: mouseY });
    // Matter.Body.setVelocity(ball, { x: 0, y: 0 });


}

function mouseReleased() {
    // Reset the flag
    isMousePressed = false;
    

    for (let ball of balls) {
        if (ball.isMouseOver()) {
            Matter.Body.setStatic(ball.body, false);
            
        }
    }

}

function keyPressed() {
    if (keyCode === 65) {
        balls.push(new Ball(400, 200, 30, 0.8));
    };
    if (keyCode === LEFT_ARROW) hero.move(hero.coords.x - 10, hero.coords.y);
    if (keyCode === RIGHT_ARROW) hero.move(hero.coords.x + 10, hero.coords.y);
    if (keyCode === UP_ARROW) {
        moveHero(hero.coords.x, hero.coords.y - 80, 5); // Move 120px up over 60 frames
    }
    if (keyCode === DOWN_ARROW) {
        
        moveHero(hero.coords.x, hero.coords.y + 80, 5);
        
    };
    if (key === "p" || key === "P") {
        hero.togglePosition();
    }
}

function moveHero(targetX, targetYCoord, frames) {
    targetY = targetYCoord;
    stepY = (targetY - hero.coords.y) / frames; 
}

class Ball {
    constructor(x, y, radius, restitution) {
        this.body = Bodies.circle(x, y, radius, {
            restitution: restitution
        });
        this.x=x;
        this.y=y;
        this.radius=radius;
        World.add(engine.world, this.body); 
    }

    isMouseOver() {
        let ballPos = this.body.position;
        
        let d = Math.sqrt(Math.pow(mouseX +10- ballPos.x, 2) + Math.pow(mouseY +10 -ballPos.y, 2));
    
        if (d <= this.radius) {
            return true;
        } else {
            return false;
        }
    }
}

class Character {
    constructor(name, hp, coords = { x: 0, y: 0 }, image,size = 100) {
        this.name = name; 
        this.hp = hp;    
        this.coords = coords;
        this.image = image;
        this.size = size;
        this.targetY = null;
        this.stepY = 0;
        this.positions = [0.55*height, 0.75*height];
        this.currentPositionIndex = 0;
        this.hitCounter = 0;
        this.isplaying=true;
        this.score=0;
        this.collisionOccurred = false;
        
    }

    // Increment hit counter
    incrementHitCounter() {
        
        this.hitCounter++;
        this.score = this.score + (this.hitCounter*100+100);
        this.collisionOccurred = true;
        
        
        
    }

    // Reset hit counter
    resetHitCounter() {
        this.hitCounter = 0;
        
    }



    togglePosition() {

        
        if (this.isplaying){
        this.currentPositionIndex = (this.currentPositionIndex + 1) % this.positions.length;
        this.setTargetY(this.positions[this.currentPositionIndex]);
        
        if (!this.collisionOccurred) {
            this.resetHitCounter();
            console.log("No collision detected, resetting hit counter.");
        }
        this.collisionOccurred = false;


        }

    }

    setTargetY(newTargetY) {
        this.targetY = newTargetY;
        this.stepY = (newTargetY - this.coords.y) / 10; 
    }

    updateMovement() {
        if (this.targetY !== null) {
            if (this.coords.y !== this.targetY) {
                this.coords.y += this.stepY*1.5;

                if ((this.stepY > 0 && this.coords.y >= this.targetY) || (this.stepY < 0 && this.coords.y <= this.targetY)) {
                    this.coords.y = this.targetY;
                    this.targetY = null;
                }
            }
        }
    }
    
    move(newX, newY) {
        this.coords.x = newX;
        this.coords.y = newY;
    }

   
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            console.log(`${this.name} has been defeated!`);
        }
    }

    display() {
        
        image(this.image, this.coords.x, this.coords.y, this.size, this.size);
       
        let centerX = this.coords.x + this.size / 2;
        let centerY = this.coords.y + this.size / 2;

        fill(160, 0, 140); 
        noStroke();
        ellipse(centerX, centerY, 7, 7); 
    }
    
    displayHitCounter() {
        fill(255);
        textSize(20);
        textAlign(RIGHT, TOP);
        text(`${this.hitCounter}x`, width - 10, 50);
        fill(255);
        textSize(15);
        textAlign(RIGHT, TOP);
        text(`Score: ${this.score}`, width - 10, 5);
    }

    
    
    getCenter() {
        return {
            x: this.coords.x + this.size / 2,
            y: this.coords.y + this.size / 2
        };
    }

    stop(){
        this.image.pause();
        this.isplaying=false;
    }
    play(){
        this.image.play();
        this.isplaying=true;
    }
}

class RhythmOrb {
    constructor(x, y, color, size, beatTime, image) {
        this.x = x;
        this.y = y;
        this.centerx = this.x+this.size/2
        this.centery = this.y+this.size/2
        this.image = image
        this.color = color;
        this.size = size;
        this.beatTime = beatTime;
        this.active = true;
        this.missed = false;
        this.hit = false;
        this.canbecounted = true;
        
    }

    
    display() {
        if (this.active) {
            noStroke();
            if (this.image) {
                image(this.image, this.x, this.y, this.size, this.size);
            } else {
                fill(this.color);
                ellipse(this.x, this.y, this.size, this.size);
            }
        }
    }

    
    update() {
        if (this.active && song.isPlaying()) {
            
            this.x -= backgroundSpeed;
            this.centerx = this.x + this.size / 2;
            this.centery = this.y + this.size / 2;
            
            if (this.x + this.size < 0) {
                this.active = false;
            }
            
            if (this.x < 250 && !this.hit && this.active && this.y > 0 && this.canbecounted) {
                this.canbecounted = false;
                console.log(`Orb missed at x=${this.x} y=${this.y}`); 
                this.markAsMissed();
                missedCounter.increment(); 
            }
        }
    }

    markAsMissed() {
        // this.active = false; // Deactivate orb
        this.missed = true;
    }

    checkCollision(character) {
        if (!this.active || this.hit) return false;


        let charCenter = character.getCenter();
        // premakn to v character class!!
        let orbCenterX = this.x + this.size / 2;
        let orbCenterY = this.y + this.size / 2;

        
        let distX = orbCenterX - charCenter.x;
        let distY = orbCenterY - charCenter.y;
        let distance = Math.sqrt(distX * distX + distY * distY);

        
        if (distance < this.size / 2) {
            this.color = color(0, 255, 0);
            this.active = false;
            this.hit = true;
            console.log(`Orb popped at (${this.x}, ${this.y})`);
            return true;
        }

        return false;
    }
}


class MissedCounter {
    constructor() {
        this.count = 0; 
    }

    increment() {
        this.count++;
    }

    reset() {
        this.count = 0;
    }

    display() {
        
        fill(255, 0, 0);
        textSize(15);
        textAlign(RIGHT, TOP);
        text(`Missed: ${this.count}`, width-10, 30);
    }
}




// class Lane {
//     constructor(x, y, width, height, color, rhythmOrbs) {
//         this.x = x; // X position of the lane
//         this.y = y; // Y position of the lane
//         this.width = width; // Width of the lane
//         this.height = height; // Height of the lane
//         this.color = color; // Lane color
//         this.rhythmOrbs = rhythmOrbs || []; // Array of RhythmOrb objects
//     }

//     // Move the lane to the left
//     update(speed) {
//         this.x -= speed; // Move the lane left
//         if (this.x + this.width < 0) {
//             // Reset the lane to the right side of the canvas
//             this.x = width;
//         }

//         // Update each orb's position
//         for (let orb of this.rhythmOrbs) {
//             orb.update();
//         }
//     }

//     // Draw the lane and its orbs
//     display() {
//         // Draw the lane
//         fill(this.color);
//         noStroke();
//         rect(this.x, this.y, this.width, this.height);

//         for (let i = 0; i < this.width; i += this.texture.width) {
//             image(this.texture, this.x + i, this.y, this.texture.width, this.height);
//         }
//         // Display the orbs
//         for (let orb of this.rhythmOrbs) {
//             orb.display();
//         }
//     }

//     // Remove inactive orbs
//     cleanup() {
//         this.rhythmOrbs = this.rhythmOrbs.filter(orb => orb.active);
//     }
// }

