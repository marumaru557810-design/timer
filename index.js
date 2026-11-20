
/* ========================================
   HTML要素
======================================== */

const $ = id => document.getElementById(id);

const themeToggleBtn = $("theme-toggle-btn");
const workInput = $("work-input");
const breakInput = $("break-input");
const timerDisplay = $("timer");
const statusDisplay = $("status");
const progressBar = $("progress-bar");
const progressContainer = $("progress-container");

const startBtn = $("start-btn");
const stopBtn = $("stop-btn");
const resetBtn = $("reset-btn");
const soundTestBtn = $("sound-test-btn");

const ambienceAudio = $("ambience-audio");
const ambienceSelect = $("ambience-select");
const ambienceVolume = $("ambience-volume");
const volumeValue = $("volume-value");
const ambienceStatus = $("ambience-status");


/* ========================================
   タイマーの状態
======================================== */

let workTime = 25 * 60;
let breakTime = 5 * 60;

let timeLeft = workTime;
let totalTime = workTime;

let isWorking = true;
let timerId = null;
let endTimeoutId = null;


/* ========================================
   音声ファイル
======================================== */

const ambienceFiles = {
    rain: "./sounds/rain.mp3",
    forest: "./sounds/forest.mp3",
    ocean: "./sounds/ocean.mp3",
    cafe: "./sounds/cafe.mp3",
    river: "./sounds/river.mp3",
    fire: "./sounds/fire.mp3",
    wind: "./sounds/wind.mp3"
};

const ambienceNames = {
    rain: "雨の音",
    forest: "森・鳥のさえずり",
    ocean: "波の音",
    cafe: "カフェの雑音",
    river: "川のせせらぎ",
    fire: "焚き火の音",
    wind: "風の音",
    "white-noise": "ホワイトノイズ"
};


/* ========================================
   環境音の音量
======================================== */

let ambienceContext = null;
let noiseSource = null;
let noiseGain = null;

let ambiencePlaying = false;

let ambienceVolumeValue = 0.35;

ambienceAudio.volume = ambienceVolumeValue;


/* ========================================
   ホワイトノイズ生成
======================================== */

function createWhiteNoise() {

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        throw new Error("Web Audio APIに対応していません");
    }

    if (!ambienceContext) {
        ambienceContext = new AudioContextClass();
    }

    if (ambienceContext.state === "closed") {
        throw new Error("AudioContextが終了しています");
    }

    const sampleRate = ambienceContext.sampleRate;

    const buffer = ambienceContext.createBuffer(
        1,
        sampleRate * 3,
        sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    noiseSource = ambienceContext.createBufferSource();

    noiseGain = ambienceContext.createGain();

    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    noiseGain.gain.value = ambienceVolumeValue;

    noiseSource.connect(noiseGain);

    noiseGain.connect(ambienceContext.destination);

    noiseSource.start();

}


/* ========================================
   環境音の再生
======================================== */

async function startAmbience() {

    if (!timerId) {
        return;
    }

    const selected = ambienceSelect.value;

    stopAmbience(false);

    try {

        if (selected === "white-noise") {

            createWhiteNoise();

            if (ambienceContext.state === "suspended") {
                await ambienceContext.resume();
            }

        } else {

            const file = ambienceFiles[selected];

            if (!file) {
                throw new Error("音声ファイルが見つかりません");
            }

            ambienceAudio.src = file;
            ambienceAudio.loop = true;
            ambienceAudio.volume = ambienceVolumeValue;

            await ambienceAudio.play();
        }

        ambiencePlaying = true;

        ambienceStatus.textContent =
            "▶ 再生中：" + ambienceNames[selected];

    } catch (error) {

        console.error(error);

        ambiencePlaying = false;

        ambienceStatus.textContent =
            "再生できません。音声ファイルを確認してください。";
    }
}


/* ========================================
   環境音の停止
======================================== */

function stopAmbience(showStatus = true) {

    ambienceAudio.pause();
    ambienceAudio.currentTime = 0;

    if (noiseSource) {

        try {
            noiseSource.stop();
        } catch (error) {
            console.log("ノイズは停止済みです");
        }

        noiseSource.disconnect();
        noiseSource = null;
    }

    if (noiseGain) {
        noiseGain.disconnect();
        noiseGain = null;
    }

    ambiencePlaying = false;

    if (showStatus) {
        ambienceStatus.textContent = "停止中";
    }
}

/* ========================================
   音量調整
======================================== */

ambienceVolume.addEventListener("input", function () {

    const volume = Number(this.value);

    ambienceVolumeValue = volume / 100;

    volumeValue.textContent = volume + "%";

    ambienceAudio.volume = ambienceVolumeValue;

    if (noiseGain && ambienceContext) {
        noiseGain.gain.setTargetAtTime(
            ambienceVolumeValue,
            ambienceContext.currentTime,
            0.02
        );
    }

});


/* ========================================
   環境音切り替え
======================================== */

ambienceSelect.addEventListener("change", function () {

    // 選択を変更したら音を停止する
    stopAmbience(false);

    ambienceStatus.textContent =
        "選択中：" + ambienceNames[this.value];

});

/* ========================================
   AudioContextの後片付け
======================================== */

window.addEventListener("pagehide", function () {

    stopAmbience();

    if (ambienceContext &&
        ambienceContext.state !== "closed") {

        ambienceContext.close();

    }

});


/* ========================================
   タイマー終了音
======================================== */

let timerAudioContext = null;

function playEndSound() {

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    if (!timerAudioContext) {
        timerAudioContext = new AudioContextClass();
    }

    if (timerAudioContext.state === "suspended") {
        timerAudioContext.resume();
    }

    const now = timerAudioContext.currentTime;

    for (let i = 0; i < 3; i++) {

        const oscillator =
            timerAudioContext.createOscillator();

        const gain =
            timerAudioContext.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value = 1000;

        oscillator.connect(gain);

        gain.connect(timerAudioContext.destination);

        const start = now + i * 0.4;

        gain.gain.setValueAtTime(0.0001, start);

        gain.gain.exponentialRampToValueAtTime(
            0.3,
            start + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            start + 0.3
        );

        oscillator.start(start);

        oscillator.stop(start + 0.3);

    }

}


/* ========================================
   終了音テスト
======================================== */

soundTestBtn.addEventListener("click", function () {

    playEndSound();

});


/* ========================================
   ダークモード
======================================== */

function setTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    themeToggleBtn.textContent =
        theme === "dark" ? "☀️" : "🌙";

    try {
        localStorage.setItem("theme", theme);
    } catch (error) {
        console.warn("テーマを保存できませんでした");
    }

}


function toggleTheme() {

    const current =
        document.documentElement.getAttribute("data-theme");

    setTheme(current === "dark" ? "light" : "dark");

}


themeToggleBtn.addEventListener("click", toggleTheme);


// 初期テーマ

let savedTheme = null;

try {
    savedTheme = localStorage.getItem("theme");
} catch (error) {
    console.warn("テーマを読み込めませんでした");
}

const systemDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

setTheme(
    savedTheme ||
    (systemDark ? "dark" : "light")
);


/* ========================================
   タイマー表示
======================================== */

function updateDisplay() {

    const minutes = Math.floor(timeLeft / 60);

    const seconds = timeLeft % 60;

    timerDisplay.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

    const percent =
        totalTime > 0
            ? (timeLeft / totalTime) * 100
            : 0;

    progressBar.style.width = percent + "%";

    progressContainer.setAttribute(
        "aria-valuenow",
        String(Math.round(percent))
    );

}


/* ========================================
   モード切り替え
======================================== */

function switchMode() {

    isWorking = !isWorking;

    if (isWorking) {

        timeLeft = workTime;
        totalTime = workTime;

        statusDisplay.textContent =
            `集中時間（${workInput.value}分）`;

        statusDisplay.style.color =
            "var(--work-color)";

        progressBar.style.backgroundColor =
            "var(--work-color)";

    } else {

        timeLeft = breakTime;
        totalTime = breakTime;

        statusDisplay.textContent =
            `休憩時間（${breakInput.value}分）`;

        statusDisplay.style.color =
            "var(--break-color)";

        progressBar.style.backgroundColor =
            "var(--break-color)";

    }

    updateDisplay();

}


/* ========================================
   カウントダウン
======================================== */

function countdown() {

    if (timeLeft > 0) {

        timeLeft--;

        updateDisplay();

        return;

    }

    clearInterval(timerId);

    timerId = null;
    
    stopAmbience(false);

    startBtn.disabled = false;
    stopBtn.disabled = true;

    workInput.disabled = false;
    breakInput.disabled = false;

    playEndSound();

    // 1.2秒後に次のモードへ
    endTimeoutId = setTimeout(function () {

        switchMode();

        startTimer();

    }, 1200);

}


/* ========================================
   スタート
======================================== */

function startTimer() {

    if (timerId !== null) {
        return;
    }

    if (endTimeoutId !== null) {
        clearTimeout(endTimeoutId);
        endTimeoutId = null;
    }

    workInput.disabled = true;
    breakInput.disabled = true;

    startBtn.disabled = true;
    stopBtn.disabled = false;

    // タイマーを開始
    timerId = setInterval(countdown, 1000);

    // 環境音も自動再生
    startAmbience();

    
}


/* ========================================
   ストップ
======================================== */

function stopTimer() {

    if (timerId !== null) {

        clearInterval(timerId);

        timerId = null;
    }

    if (endTimeoutId !== null) {

        clearTimeout(endTimeoutId);

        endTimeoutId = null;
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;

    workInput.disabled = false;
    breakInput.disabled = false;

    // 環境音も自動停止
    stopAmbience(false);

    
}


/* ========================================
   リセット
======================================== */

function resetTimer() {

    stopTimer();

    isWorking = true;

    applyCustomTime();

}


/* ========================================
   時間設定
======================================== */

function applyCustomTime() {

    if (timerId !== null) {
        return;
    }

    const workMinutes = Math.min(
        Math.max(parseInt(workInput.value, 10) || 25, 1),
        180
    );

    const breakMinutes = Math.min(
        Math.max(parseInt(breakInput.value, 10) || 5, 1),
        60
    );

    workInput.value = workMinutes;
    breakInput.value = breakMinutes;

    workTime = workMinutes * 60;
    breakTime = breakMinutes * 60;

    if (isWorking) {

        timeLeft = workTime;
        totalTime = workTime;

        statusDisplay.textContent =
            `集中時間（${workMinutes}分）`;

        statusDisplay.style.color =
            "var(--work-color)";

        progressBar.style.backgroundColor =
            "var(--work-color)";

    } else {

        timeLeft = breakTime;
        totalTime = breakTime;

        statusDisplay.textContent =
            `休憩時間（${breakMinutes}分）`;

        statusDisplay.style.color =
            "var(--break-color)";

        progressBar.style.backgroundColor =
            "var(--break-color)";

    }

    updateDisplay();

}


workInput.addEventListener("change", applyCustomTime);
breakInput.addEventListener("change", applyCustomTime);


/* ========================================
   ボタンイベント
======================================== */

startBtn.addEventListener("click", startTimer);
stopBtn.addEventListener("click", stopTimer);
resetBtn.addEventListener("click", resetTimer);


/* ========================================
   初期化
======================================== */

applyCustomTime();

ambienceStatus.textContent = "タイマー作動中のみ再生できます";



console.log("勉強タイマーを起動しました");
