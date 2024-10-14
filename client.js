const socket = io();

let audioContext;
let serverTimeOffset = 0;
let songStartTime;

document.getElementById('startBtn').addEventListener('click', startKaraoke);

function startKaraoke() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    syncWithServer();
    startAudioStream();
}

function syncWithServer() {
    const startTime = Date.now();
    socket.emit('get_server_time', (serverTime) => {
        const endTime = Date.now();
        const latency = (endTime - startTime) / 2;
        serverTimeOffset = serverTime + latency - startTime;
        songStartTime = getServerTime();
        console.log('Synced with server, offset:', serverTimeOffset);
    });
}

function getServerTime() {
    return Date.now() + serverTimeOffset;
}

function startAudioStream() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(1024, 1, 1);
            
            processor.onaudioprocess = (e) => {
                const audioData = e.inputBuffer.getChannelData(0);
                sendAudioData(audioData);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
        })
        .catch(err => console.error('Error accessing microphone:', err));
}

function sendAudioData(audioData) {
    const timestamp = getServerTime() - songStartTime;
    socket.emit('audio_data', { audioData: Array.from(audioData), timestamp });
}

socket.on('receive_audio', ({ audioData, timestamp }) => {
    playAudioData(audioData, timestamp);
});

function playAudioData(audioData, timestamp) {
    const buffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate);
    buffer.getChannelData(0).set(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    const currentTime = getServerTime() - songStartTime;
    const playbackTime = audioContext.currentTime + (timestamp - currentTime) / 1000;
    source.start(Math.max(playbackTime, audioContext.currentTime));
}

// 간단한 가사 표시 기능 (실제 구현에서는 더 복잡할 수 있음)
const lyrics = [
    { time: 0, text: "첫 번째 가사" },
    { time: 5000, text: "두 번째 가사" },
    { time: 10000, text: "세 번째 가사" }
];

setInterval(() => {
    if (songStartTime) {
        const currentTime = getServerTime() - songStartTime;
        const currentLyric = lyrics.find(lyric => lyric.time <= currentTime);
        if (currentLyric) {
            document.getElementById('lyrics').textContent = currentLyric.text;
        }
    }
}, 100);