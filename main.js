
document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const keyboardFrequencyMap = {
    '90': 261.625565300598634,  //Z - C
    '83': 277.182630976872096, //S - C#
    '88': 293.664767917407560,  //X - D
    '68': 311.126983722080910, //D - D#
    '67': 329.627556912869929,  //C - E
    '86': 349.228231433003884,  //V - F
    '71': 369.994422711634398, //G - F#
    '66': 391.995435981749294,  //B - G
    '72': 415.304697579945138, //H - G#
    '78': 440.000000000000000,  //N - A
    '74': 466.163761518089916, //J - A#
    '77': 493.883301256124111,  //M - B
    '81': 523.251130601197269,  //Q - C
    '50': 554.365261953744192, //2 - C#
    '87': 587.329535834815120,  //W - D
    '51': 622.253967444161821, //3 - D#
    '69': 659.255113825739859,  //E - E
    '82': 698.456462866007768,  //R - F
    '53': 739.988845423268797, //5 - F#
    '84': 783.990871963498588,  //T - G
    '54': 830.609395159890277, //6 - G#
    '89': 880.000000000000000,  //Y - A
    '55': 932.327523036179832, //7 - A#
    '85': 987.766602512248223,  //U - B
}



window.addEventListener('keydown', keyDown, false);
window.addEventListener('keyup', keyUp, false);
document.body.style.transition = 'background-color 200ms ease-in-out';
let activeOscillators = {};
function keyDown(event) {
    if (!audioCtx) return;
    const key = (event.detail || event.which).toString();
    if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
      changebg()  
      playNote(key);
    }
}

function changebg() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}
function keyUp(event) {
    const key = (event.detail || event.which).toString();
    if (keyboardFrequencyMap[key] && activeOscillators[key]) {
        const time = audioCtx.currentTime;
        const gainNode = activeOscillators[key].gain;
        gainNode.gain.cancelScheduledValues(time)
        gainNode.gain.setValueAtTime(gainNode.gain.value, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + adsr.release);
        activeOscillators[key].osc.forEach(o =>
            o.stop(time + adsr.release)
        );
        delete activeOscillators[key];
        //limitgains();
    }
}
let wavetype = 'sine';
const sineButton = document.querySelector('#sineButton');
sineButton.addEventListener('click', function () {
    wavetype = 'sine';
});

let synth = 'additive';
document.querySelector('#additive').addEventListener('click', function () {
    synth = 'additive';
});
document.querySelector('#AM').addEventListener('click', function () {
    synth = 'AM';
});
document.querySelector('#FM').addEventListener('click', function () {
    synth = 'FM';
});
const adsr = {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.3,
};

function syncAdsrFromUI() {
    adsr.attack = parseFloat(document.querySelector('#attack').value);
    adsr.decay = parseFloat(document.querySelector('#decay').value);
    adsr.sustain = parseFloat(document.querySelector('#sustain').value);
    adsr.release = parseFloat(document.querySelector('#release').value);
}

['attack', 'decay', 'sustain', 'release'].forEach(name => {
    const el = document.querySelector('#' + name);
    if (!el) return;
    el.addEventListener('input', function () {
        document.querySelector('#' + name + 'Value').textContent = el.value;
        syncAdsrFromUI();
    });
});
document.querySelector('#partials').addEventListener('input', function () {
    const el = document.querySelector('#partials');
    document.querySelector('#partialsValue').textContent = el.value;
});
document.querySelector('#modFreq').addEventListener('input', function () {
    const el = document.querySelector('#modFreq');
    document.querySelector('#modFreqValue').textContent = el.value;
});
syncAdsrFromUI();

const globalGain = audioCtx.createGain();

globalGain.gain.setValueAtTime(0.2, audioCtx.currentTime)
globalGain.connect(audioCtx.destination)

function limitgains() {
    const voices = Object.keys(activeOscillators).length;
    if (voices === 0) return;

    const perVoiceGain = 1 / voices;
    const time = audioCtx.currentTime;

    Object.values(activeOscillators).forEach(v => {
        v.gain.gain.cancelAndHoldAtTime(time);
        v.gain.gain.linearRampToValueAtTime(perVoiceGain * adsr.sustain, time + 0.02);
    });
}
function additive(fr, gainNode) {
        const time = audioCtx.currentTime;
        const numPartials = Math.max(1, Math.min(16, parseInt(document.querySelector('#partials').value, 10) || 3));
        const par = [];
        for (let i = 1; i <= numPartials; i++) {
            par.push({ ratio: i, amp: 0.6 / i });
        }
    
        const oscs = [];
    
        par.forEach(p => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.setValueAtTime(fr * p.ratio, time);
            osc.type = 'sine';
            gain.gain.value = p.amp;
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.frequency.setValueAtTime(5, time);   
            lfo.type = 'sine';
            lfoGain.gain.setValueAtTime(5, time);    
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain).connect(gainNode);
            osc.start();
            lfo.start();
            oscs.push(osc, lfo);
        });
    
        return oscs;

}
function AM(fr, gainNode) {
    const time = audioCtx.currentTime;
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const mGain = audioCtx.createGain();
    const dGain = audioCtx.createGain();
    carrier.frequency.setValueAtTime(fr, time);
    carrier.type = wavetype;
    const modFreq = Math.max(1, parseFloat(document.querySelector('#modFreq').value) || 100);
    modulator.frequency.setValueAtTime(modFreq, time);
    modulator.type = 'sine';
    dGain.gain.value = 0.5;
    mGain.gain.value = 0.5;
    modulator.connect(dGain).connect(mGain.gain);
    carrier.connect(mGain);
    mGain.connect(gainNode);
    carrier.start();
    modulator.start();
    return [carrier, modulator];
}
function FM(fr, gainNode) {
    const time = audioCtx.currentTime;
    const modFreq = Math.max(1, parseFloat(document.querySelector('#modFreq').value) || 100);
    const carrier = audioCtx.createOscillator();
    const modulator = audioCtx.createOscillator();
    const modindex = audioCtx.createGain();
    carrier.frequency.setValueAtTime(fr, time);
    carrier.type = wavetype;
    modulator.frequency.setValueAtTime(modFreq, time);
    modindex.gain.setValueAtTime(50, time);
    modulator.connect(modindex);
    modindex.connect(carrier.frequency);
    carrier.connect(gainNode);
    carrier.start();
    modulator.start();
    return [carrier, modulator];
}
    
function playNote(key) {
    //const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const time = audioCtx.currentTime
    const fr = keyboardFrequencyMap[key];
    gainNode.connect(globalGain);
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.7, time + adsr.attack);
    gainNode.gain.exponentialRampToValueAtTime(adsr.sustain, time + adsr.attack + adsr.decay);
    let oscn = [];
    if (synth === 'additive') {
        oscn = additive(fr, gainNode);
    } else if (synth === 'AM') {
        oscn = AM(fr, gainNode);
    } else if (synth === 'FM') {
        oscn = FM(fr, gainNode);
    }
    activeOscillators[key] = {
        osc: oscn,
        gain: gainNode
    };
    //limitgains();
  }
});