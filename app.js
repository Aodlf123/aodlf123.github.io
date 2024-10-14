let socket;
let audioContext;
let serverTimeOffset = 0;
let localScore = 0;

const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const latencyDiv = document.getElementById('latency');
const lyricsDiv = document.getElementById('lyrics');
const scoreDiv = document.getElementById('score');

startBtn.addEventListener('click', startKaraoke);

function startKaraoke() {
    if (socket) {
        socket.disconnect();
    }
    
    // 실제 서버 주소로 변경해야 합니다.
    socket = io('https://aodlf123.github.io');

    socket.on('connect', () => {
        statusDiv.textContent = 'Connected';
        syncWithServer();
        startAudioStream();
    });

    socket.on('disconnect', () => {
        statusDiv.textContent = 'Disconnected';
    });

    socket.on('lyrics', (lyric) => {
        lyricsDiv.textContent = lyric;
    });

    socket.on('serverScore', (score) => {
        localScore = score;
        scoreDiv.textContent = `Score: ${score}`;
    });
}

function syncWithServer() {
    const startTime = Date.now();
    socket.emit('getServerTime', (serverTime) => {
        const endTime = Date.now();
        const latency = (endTime - startTime) / 2;
        serverTimeOffset = serverTime + latency - endTime;
        latencyDiv.textContent = `Latency: ${latency} ms`;
    });
}

function getServerTime() {
    return Date.now() + serverTimeOffset;
}

function startAudioStream() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

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
        .catch(err => {
            console.error('Error accessing microphone:', err);
            statusDiv.textContent = 'Microphone access denied';
        });
}

function sendAudioData(audioData) {
    // 실제 구현에서는 오디오 데이터를 압축하거나 필요한 특징만 추출하여 전송해야 합니다.
    socket.emit('audioData', {
        data: Array.from(audioData),
        timestamp: getServerTime()
    });
}

// 클라이언트 사이드 점수 예측 (실제로는 더 복잡한 알고리즘이 필요합니다)
function updateLocalScore(audioData) {
    // 간단한 예시: 오디오 데이터의 평균 진폭을 점수에 반영
    const amplitude = audioData.reduce((sum, value) => sum + Math.abs(value), 0) / audioData.length;
    localScore += amplitude * 100;
    scoreDiv.textContent = `Score: ${Math.round(localScore)}`;
}

// 주기적으로 서버와 시간 동기화
setInterval(syncWithServer, 5000);