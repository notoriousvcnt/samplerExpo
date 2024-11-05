let margin;
let buttonSize;
let separation;
let buttons = [];

//RNBO specifics
const { createDevice, TimeNow, MessageEvent }  = RNBO; 
let device;
let context;
let micdB;
let micdBSpan;
let gainMicSlider;
let noteStatus;
let micGainParam;
let micGainSpan;
const sizeGrow = 0.3;
const  speedGrow = 0.05;

const SAMPLES_2961 = {"sampleSilbatoGrave": "media/audio/2961/2961_largo_suave_grave.wav","sampleSilbatoAgudo": "media/audio/2961/2961_largo_suave_agudo.wav"};
const sustainLoopPoints = {"grave": [269.5,4930], "agudo": [298.1, 2889]};

async function loadRNBOdevice(){
    let WAContext = window.AudioContext || window.webkitAudioContext;
    context = new WAContext();
    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);
    
    //fetch patcher
    let rawPatcher = await fetch("export/sampler.export.json");
    let patcher = await rawPatcher.json();

    //call the library
    device = await RNBO.createDevice({context, patcher});

    

    await loadSamples(device, SAMPLES_2961, 0.7);

    device.messageEvent.subscribe((event) => {
        if (event.tag === "out3"){
            micdB = event.payload;
            //micdBSpan.html(micdB.toFixed(2));
        }

        if (event.tag === "out4"){
            noteStatus = event.payload;
            console.log('note ', noteStatus);
            
        }
    });

    
   

    connectMicrophone(device);
    device.node.connect(outputNode);
    
   micGainParam = device.parametersById.get("micGain");
   micGainParam.value = 6; //hardcoded for samsung galaxy A15

    document.body.onclick = () => {
        context.resume(); 
        loop();
    }

    
    console.log("RNBO device loaded.");
}

loadRNBOdevice();

function setup() {
    createCanvas(windowWidth, windowHeight);
    margin = windowHeight*0.2;
    buttonSize = windowHeight*0.2;
    separation = windowHeight*0.1;

    buttons[0] = new Button(windowWidth/2, margin+buttonSize/2,'lowHighNote');

    //createP("gainMicSlider");
    micGainSlider = createSlider(-6,12,0,0.1);
    micGainSpan = createSpan("Mic Gain");
    micGainSpan.position(windowWidth-200, windowHeight-70);
    // micdBSpan = createSpan("Mic dB Level");
    // micdBSpan.position(windowWidth-300, windowHeight-70);
    micGainSlider.position(windowWidth-200, windowHeight-50);
    micGainSlider.id("micGainSlider");
    micGainSlider.input(displayValue);

    // slider = createSlider(0, 1.5,0.3,0.05);
    // slider.id("size change");
    // slider.input(displayValue);
    // slider.position(10, windowHeight);
    // slider.size(80);

    // speedSlider = createSlider(0, 1,0.05,0.05);
    // speedSlider.id("speed change");
    // speedSlider.input(displayValue);
    // speedSlider.position(100, windowHeight);
    // speedSlider.size(80);
   
    console.log('hi :)!'); 
    textSize(60);
    noLoop();
}

function displayValue(){
    console.log(this.id(),this.value());

    if (this.id() == "micGainSlider"){
        micGainParam.value = this.value();
        micGainSpan.html(this.value().toFixed(2) + ' dB');
    }
}

function windowResized(){
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(220);
    fill(0);
    let micdBMapped;
    if (device){	
        //text(micdB, windowWidth/2-margin, margin*3);
        micdBMapped = map(micdB,-60,0,1,1.5,true);
        //micdBSpan.html(micdB);
    }
    
    for (let button of buttons){
        button.show(micdBMapped);
        button.isPressed();
        button.sendBang();
    }
}

class Button{
    constructor(x,y,inportTag){
        this.x = x;
        this.y = y;
        this.size = buttonSize;
        this.colour = color(255,0,0);
        this.state = 0;
        this.lastState = 0;
        this.inportTag = inportTag;
    }

    show(factor){
        let Anoise;
        let amplitude = this.size*sizeGrow;
        let speed = speedGrow; 
        //console.log(amplitude);
        noStroke();
        fill(this.colour);
        beginShape();
        for (let i = 0; i < 100; i+=1){
            if (noteStatus == 1){
                Anoise = amplitude*noise(speed * frameCount);
            } else {    
                Anoise = 1;
                speed = speed - 0.01;
            }
            let angle = map(i,0,100,0,TWO_PI);
            let size = this.size/2 + Anoise;
            let x =  this.x + cos(angle)*size;
            let y =  this.y + sin(angle)*size;
            vertex(x,y);
  
        }
        endShape(CLOSE);
        // noStroke();
        // fill(this.colour);
        // beginShape();
        // for (let i = 0; i < 100; i++){
        //     let angle = map(i,0,100,0,TWO_PI);
        //     let realSize = this.size/2 * factor;
        //     let x = this.x + realSize * cos(angle);
        //     let y = this.y + realSize * sin(angle);
        //     vertex(x,y);
        // }
        // endShape(CLOSE);
    }

    isPressed(){
        let mouseRadius = dist(this.x,this.y,mouseX,mouseY);
        this.lastState = this.state;
        if (mouseRadius <= buttonSize/2 && mouseIsPressed){
            this.colour = color(255,0,0);
            this.state = 1;
        } else {
            this.colour = color(255,255,255);
            this.state = 0;
        }
    }

    sendBang(){
        if (this.state != this.lastState){
            //console.log('bang');
            sendMessageToInport(this.state,this.inportTag);
        }
    }
}




//RNBO Functions
async function loadSamples(device,samples, normalizeFactor){
    for (let id in samples){
        const url = samples[id];
        await loadSample(url,id,device);
    }
    //enableButtons();
    sendMessageToInport(normalizeFactor,"normalizeSampleBuffer");
}

async function loadSample(url,id,device){
    //load audio to buffer
   const fileResponse = await fetch(url);
   const arrayBuf = await fileResponse.arrayBuffer();

   //decode audio
   const audioBuf = await context.decodeAudioData(arrayBuf);
   await device.setDataBuffer(id,audioBuf);
}

function connectMicrophone(device){
    // Assuming you have a RNBO device already, and an audio context as well
    const handleSuccess = (stream) => {
        const source = context.createMediaStreamSource(stream);
        source.connect(device.node);
    }
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleSuccess);
}

function sendMessageToInport(message,inportTag){
    const event = new MessageEvent(TimeNow, inportTag, [message]);
    device.scheduleEvent(event);
}

function loadSustainLoopPoints(device){
    const lowStart = device.parametersById.get("initSustainGrave");
    lowStart.value = sustainLoopPoints["grave"][0];
    console.log(lowStart.value);

    const lowEnd = device.parametersById.get("endSustainGrave");
    lowEnd.value = sustainLoopPoints["grave"][1];

    const highStart = device.parametersById.get("initSustainAgudo");
    highStart.value = sustainLoopPoints["agudo"][0];

    const highEnd = device.parametersById.get("endSustainAgudo");
    highEnd.value = sustainLoopPoints["agudo"][1];

}