// Poki SDK Integration
let pokiSDK = null;
let pokiGameplayStartCalled = false;

// Initialize Poki SDK (with fallback for local testing)
function initPokiSDK() {
    try {
        if (window.PokiSDK) {
            pokiSDK = window.PokiSDK;
            pokiSDK.init().then(() => {
                console.log('Poki SDK initialized');
            }).catch((err) => {
                console.log('Poki SDK init failed (likely local testing):', err);
            });
        } else {
            console.log('Poki SDK not found (local testing mode)');
        }
    } catch (error) {
        console.log('Poki SDK error (safe to ignore in local testing):', error);
    }
}

// Poki SDK Event Helpers
function pokiGameplayStart() {
    if (pokiSDK && !pokiGameplayStartCalled) {
        try {
            pokiSDK.gameplayStart();
            pokiGameplayStartCalled = true;
        } catch (error) {
            console.log('Poki gameplayStart error:', error);
        }
    }
}

function pokiGameplayStop() {
    if (pokiSDK && pokiGameplayStartCalled) {
        try {
            pokiSDK.gameplayStop();
            pokiGameplayStartCalled = false;
        } catch (error) {
            console.log('Poki gameplayStop error:', error);
        }
    }
}

// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Scale canvas for responsive design
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const aspectRatio = 836 / 470;
    const maxWidth = Math.min(836, containerWidth - 20);
    const newWidth = maxWidth;
    const newHeight = newWidth / aspectRatio;
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
}

// Touch Controls
let touchKeys = {
    left: false,
    right: false,
    jump: false
};

// Game State
let gameState = 'start'; // 'start', 'playing', 'gameover', 'levelcomplete'
let score = 0;
let currentLevel = 1;
let maxLevel = 10;
let musicEnabled = true;
let soundEnabled = true;
let playerHealth = 100;
let maxHealth = 100;
let lives = 3;
let coinsCollected = 0;
let totalCoinsInLevel = 0;

// Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let musicGainNode = null;
let musicInterval = null;
let currentMusicTempo = 600;

// Notification System
const notifications = [];

// Particle System
const particles = [];

// Game Objects
const player = {
    x: 100,
    y: 350, // Adjusted for new canvas height (470 instead of 600)
    width: 40,
    height: 50,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    jumpPower: -15,
    onGround: false,
    color: '#4ECDC4',
    invulnerable: false,
    invulnerableTime: 0,
    powerUp: null,
    powerUpTime: 0
};

const platforms = [];
const obstacles = [];
const collectibles = [];
const enemies = [];
const powerUps = [];
const movingPlatforms = [];
let finishFlag = null; // Finish flag at end of level

// Camera offset for scrolling
let cameraX = 0;
let levelCompleteX = 0;
let levelStartX = 0;

// Initialize game
function init() {
    initPokiSDK();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    loadLevel(currentLevel);
    setupAudio();
    setupEventListeners();
    setupTouchControls();
    gameLoop();
}

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, duration);
}

// Level System - Y positions adjusted for 470px canvas height (was 600px)
const levelData = {
    1: {
        platforms: [
            { x: 0, y: 420, width: 200, height: 20 },
            { x: 300, y: 370, width: 150, height: 20 },
            { x: 550, y: 320, width: 150, height: 20 },
            { x: 800, y: 270, width: 150, height: 20 },
            { x: 1050, y: 220, width: 150, height: 20 },
            { x: 1300, y: 320, width: 200, height: 20 },
            { x: 1600, y: 270, width: 150, height: 20 }
        ],
        obstacles: [
            { x: 450, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 700, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 950, y: 200, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [],
        powerUps: [
            { x: 600, y: 270, type: 'health' },
            { x: 1100, y: 170, type: 'speed' }
        ],
        collectibles: 8,
        levelEndX: 1800,
        background: { top: '#87CEEB', mid: '#E0F6FF', bottom: '#98D8C8' }
    },
    2: {
        platforms: [
            { x: 0, y: 420, width: 150, height: 20 },
            { x: 250, y: 370, width: 100, height: 20 },
            { x: 450, y: 320, width: 100, height: 20 },
            { x: 650, y: 270, width: 100, height: 20 },
            { x: 850, y: 320, width: 100, height: 20 },
            { x: 1050, y: 220, width: 150, height: 20 },
            { x: 1300, y: 270, width: 100, height: 20 },
            { x: 1500, y: 320, width: 100, height: 20 },
            { x: 1700, y: 220, width: 150, height: 20 }
        ],
        obstacles: [
            { x: 400, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 600, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 800, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1000, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1200, y: 250, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 500, y: 300, width: 30, height: 30, speed: 2, direction: 1, patrolStart: 450, patrolEnd: 550 },
            { x: 1100, y: 200, width: 30, height: 30, speed: 2, direction: 1, patrolStart: 1050, patrolEnd: 1200 }
        ],
        powerUps: [
            { x: 700, y: 220, type: 'jump' },
            { x: 1400, y: 170, type: 'shield' }
        ],
        collectibles: 12,
        levelEndX: 1900,
        background: { top: '#4A90E2', mid: '#7B68EE', bottom: '#9370DB' }
    },
    3: {
        platforms: [
            { x: 0, y: 420, width: 120, height: 20 },
            { x: 200, y: 370, width: 80, height: 20 },
            { x: 350, y: 320, width: 80, height: 20 },
            { x: 500, y: 270, width: 80, height: 20 },
            { x: 650, y: 320, width: 80, height: 20 },
            { x: 800, y: 220, width: 100, height: 20 },
            { x: 1000, y: 270, width: 80, height: 20 },
            { x: 1150, y: 320, width: 80, height: 20 },
            { x: 1300, y: 220, width: 100, height: 20 },
            { x: 1500, y: 270, width: 80, height: 20 },
            { x: 1650, y: 320, width: 80, height: 20 },
            { x: 1800, y: 220, width: 120, height: 20 }
        ],
        obstacles: [
            { x: 300, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 450, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 600, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 750, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 950, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1100, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1250, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1400, y: 200, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 400, y: 300, width: 30, height: 30, speed: 2.5, direction: 1, patrolStart: 350, patrolEnd: 500 },
            { x: 700, y: 300, width: 30, height: 30, speed: 2.5, direction: 1, patrolStart: 650, patrolEnd: 800 },
            { x: 1050, y: 250, width: 30, height: 30, speed: 2.5, direction: 1, patrolStart: 1000, patrolEnd: 1150 },
            { x: 1350, y: 200, width: 30, height: 30, speed: 2.5, direction: 1, patrolStart: 1300, patrolEnd: 1500 }
        ],
        powerUps: [
            { x: 550, y: 220, type: 'health' },
            { x: 1200, y: 170, type: 'speed' }
        ],
        movingPlatforms: [
            { x: 900, y: 320, width: 80, height: 15, speedX: 0, speedY: -2, rangeY: 100, startY: 320 }
        ],
        collectibles: 15,
        levelEndX: 2000,
        background: { top: '#FF6B6B', mid: '#FFA07A', bottom: '#FFD700' }
    },
    4: {
        platforms: [
            { x: 0, y: 420, width: 100, height: 20 },
            { x: 180, y: 370, width: 70, height: 20 },
            { x: 320, y: 320, width: 70, height: 20 },
            { x: 460, y: 270, width: 70, height: 20 },
            { x: 600, y: 320, width: 70, height: 20 },
            { x: 740, y: 220, width: 80, height: 20 },
            { x: 900, y: 270, width: 70, height: 20 },
            { x: 1040, y: 320, width: 70, height: 20 },
            { x: 1180, y: 220, width: 80, height: 20 },
            { x: 1320, y: 270, width: 70, height: 20 },
            { x: 1460, y: 320, width: 70, height: 20 },
            { x: 1600, y: 220, width: 80, height: 20 },
            { x: 1740, y: 270, width: 70, height: 20 },
            { x: 1880, y: 320, width: 100, height: 20 }
        ],
        obstacles: [
            { x: 250, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 390, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 530, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 670, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 890, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1030, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1170, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1310, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1450, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1590, y: 300, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 350, y: 300, width: 30, height: 30, speed: 3, direction: 1, patrolStart: 320, patrolEnd: 460 },
            { x: 650, y: 300, width: 30, height: 30, speed: 3, direction: 1, patrolStart: 600, patrolEnd: 740 },
            { x: 950, y: 250, width: 30, height: 30, speed: 3, direction: 1, patrolStart: 900, patrolEnd: 1040 },
            { x: 1250, y: 250, width: 30, height: 30, speed: 3, direction: 1, patrolStart: 1180, patrolEnd: 1320 },
            { x: 1550, y: 200, width: 30, height: 30, speed: 3, direction: 1, patrolStart: 1600, patrolEnd: 1740 }
        ],
        powerUps: [
            { x: 500, y: 220, type: 'jump' },
            { x: 1100, y: 170, type: 'health' },
            { x: 1700, y: 170, type: 'shield' }
        ],
        movingPlatforms: [
            { x: 800, y: 320, width: 70, height: 15, speedX: 0, speedY: -2, rangeY: 120, startY: 320 },
            { x: 1400, y: 270, width: 70, height: 15, speedX: 0, speedY: -2, rangeY: 120, startY: 270 }
        ],
        collectibles: 18,
        levelEndX: 2100,
        background: { top: '#2C3E50', mid: '#34495E', bottom: '#5D6D7E' }
    },
    5: {
        platforms: [
            { x: 0, y: 420, width: 80, height: 20 },
            { x: 150, y: 370, width: 60, height: 20 },
            { x: 280, y: 320, width: 60, height: 20 },
            { x: 410, y: 270, width: 60, height: 20 },
            { x: 540, y: 320, width: 60, height: 20 },
            { x: 670, y: 220, width: 70, height: 20 },
            { x: 810, y: 270, width: 60, height: 20 },
            { x: 940, y: 320, width: 60, height: 20 },
            { x: 1070, y: 220, width: 70, height: 20 },
            { x: 1210, y: 270, width: 60, height: 20 },
            { x: 1340, y: 320, width: 60, height: 20 },
            { x: 1470, y: 220, width: 70, height: 20 },
            { x: 1610, y: 270, width: 60, height: 20 },
            { x: 1740, y: 320, width: 60, height: 20 },
            { x: 1870, y: 220, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 220, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 350, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 480, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 610, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 740, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 870, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1000, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1130, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1260, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1390, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1520, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1650, y: 250, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 320, y: 300, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 280, patrolEnd: 410 },
            { x: 580, y: 300, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 540, patrolEnd: 670 },
            { x: 850, y: 250, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 810, patrolEnd: 940 },
            { x: 1120, y: 200, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1070, patrolEnd: 1210 },
            { x: 1390, y: 250, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1340, patrolEnd: 1470 },
            { x: 1660, y: 200, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1610, patrolEnd: 1740 }
        ],
        powerUps: [
            { x: 450, y: 220, type: 'health' },
            { x: 780, y: 170, type: 'speed' },
            { x: 1110, y: 150, type: 'jump' },
            { x: 1440, y: 170, type: 'shield' }
        ],
        movingPlatforms: [
            { x: 700, y: 320, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 150, startY: 320 },
            { x: 1030, y: 270, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 150, startY: 270 },
            { x: 1360, y: 320, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 150, startY: 320 },
            { x: 1690, y: 270, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 150, startY: 270 }
        ],
        collectibles: 20,
        levelEndX: 2200,
        background: { top: '#8E44AD', mid: '#9B59B6', bottom: '#BB8FCE' }
    },
    6: {
        platforms: [
            { x: 0, y: 420, width: 70, height: 20 },
            { x: 120, y: 370, width: 60, height: 20 },
            { x: 240, y: 320, width: 60, height: 20 },
            { x: 360, y: 270, width: 60, height: 20 },
            { x: 480, y: 320, width: 60, height: 20 },
            { x: 600, y: 220, width: 70, height: 20 },
            { x: 730, y: 270, width: 60, height: 20 },
            { x: 850, y: 320, width: 60, height: 20 },
            { x: 970, y: 220, width: 70, height: 20 },
            { x: 1100, y: 270, width: 60, height: 20 },
            { x: 1220, y: 320, width: 60, height: 20 },
            { x: 1340, y: 220, width: 70, height: 20 },
            { x: 1470, y: 270, width: 60, height: 20 },
            { x: 1590, y: 320, width: 60, height: 20 },
            { x: 1710, y: 220, width: 70, height: 20 },
            { x: 1840, y: 270, width: 60, height: 20 },
            { x: 1960, y: 320, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 200, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 320, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 440, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 560, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 680, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 800, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 920, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1040, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1160, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1280, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1400, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1520, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1640, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1760, y: 200, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 280, y: 300, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 240, patrolEnd: 360 },
            { x: 520, y: 300, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 480, patrolEnd: 600 },
            { x: 760, y: 250, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 730, patrolEnd: 850 },
            { x: 1000, y: 200, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 970, patrolEnd: 1100 },
            { x: 1240, y: 250, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1220, patrolEnd: 1340 },
            { x: 1480, y: 200, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1470, patrolEnd: 1590 },
            { x: 1720, y: 250, width: 30, height: 30, speed: 3.5, direction: 1, patrolStart: 1710, patrolEnd: 1840 }
        ],
        powerUps: [
            { x: 400, y: 200, type: 'health' },
            { x: 900, y: 150, type: 'shield' },
            { x: 1500, y: 150, type: 'speed' }
        ],
        movingPlatforms: [
            { x: 650, y: 320, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 120, startY: 320 },
            { x: 1050, y: 270, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 120, startY: 270 },
            { x: 1450, y: 320, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 120, startY: 320 },
            { x: 1850, y: 270, width: 60, height: 15, speedX: 0, speedY: -2.5, rangeY: 120, startY: 270 }
        ],
        collectibles: 22,
        levelEndX: 2400,
        background: { top: '#E74C3C', mid: '#EC7063', bottom: '#F1948A' }
    },
    7: {
        platforms: [
            { x: 0, y: 420, width: 60, height: 20 },
            { x: 100, y: 370, width: 50, height: 20 },
            { x: 200, y: 320, width: 50, height: 20 },
            { x: 300, y: 270, width: 50, height: 20 },
            { x: 400, y: 320, width: 50, height: 20 },
            { x: 500, y: 220, width: 60, height: 20 },
            { x: 620, y: 270, width: 50, height: 20 },
            { x: 720, y: 320, width: 50, height: 20 },
            { x: 820, y: 220, width: 60, height: 20 },
            { x: 940, y: 270, width: 50, height: 20 },
            { x: 1040, y: 320, width: 50, height: 20 },
            { x: 1140, y: 220, width: 60, height: 20 },
            { x: 1260, y: 270, width: 50, height: 20 },
            { x: 1360, y: 320, width: 50, height: 20 },
            { x: 1460, y: 220, width: 60, height: 20 },
            { x: 1580, y: 270, width: 50, height: 20 },
            { x: 1680, y: 320, width: 50, height: 20 },
            { x: 1780, y: 220, width: 60, height: 20 },
            { x: 1900, y: 270, width: 50, height: 20 },
            { x: 2000, y: 320, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 150, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 250, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 350, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 450, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 550, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 650, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 750, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 850, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 950, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1050, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1150, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1250, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1350, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1450, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1550, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1650, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1750, y: 200, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 250, y: 300, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 200, patrolEnd: 300 },
            { x: 450, y: 300, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 400, patrolEnd: 500 },
            { x: 650, y: 250, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 620, patrolEnd: 720 },
            { x: 850, y: 200, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 820, patrolEnd: 940 },
            { x: 1050, y: 250, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 1040, patrolEnd: 1140 },
            { x: 1250, y: 200, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 1260, patrolEnd: 1360 },
            { x: 1450, y: 250, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 1460, patrolEnd: 1580 },
            { x: 1650, y: 200, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 1680, patrolEnd: 1780 },
            { x: 1850, y: 250, width: 30, height: 30, speed: 4, direction: 1, patrolStart: 1900, patrolEnd: 2000 }
        ],
        powerUps: [
            { x: 350, y: 200, type: 'jump' },
            { x: 750, y: 150, type: 'health' },
            { x: 1350, y: 150, type: 'shield' },
            { x: 1750, y: 150, type: 'speed' }
        ],
        movingPlatforms: [
            { x: 550, y: 320, width: 50, height: 15, speedX: 0, speedY: -3, rangeY: 130, startY: 320 },
            { x: 950, y: 270, width: 50, height: 15, speedX: 0, speedY: -3, rangeY: 130, startY: 270 },
            { x: 1350, y: 320, width: 50, height: 15, speedX: 0, speedY: -3, rangeY: 130, startY: 320 },
            { x: 1750, y: 270, width: 50, height: 15, speedX: 0, speedY: -3, rangeY: 130, startY: 270 },
            { x: 1150, y: 220, width: 50, height: 15, speedX: 0, speedY: -3, rangeY: 130, startY: 220 }
        ],
        collectibles: 25,
        levelEndX: 2600,
        background: { top: '#16A085', mid: '#1ABC9C', bottom: '#48C9B0' }
    },
    8: {
        platforms: [
            { x: 0, y: 420, width: 50, height: 20 },
            { x: 80, y: 370, width: 45, height: 20 },
            { x: 160, y: 320, width: 45, height: 20 },
            { x: 240, y: 270, width: 45, height: 20 },
            { x: 320, y: 320, width: 45, height: 20 },
            { x: 400, y: 220, width: 50, height: 20 },
            { x: 500, y: 270, width: 45, height: 20 },
            { x: 580, y: 320, width: 45, height: 20 },
            { x: 660, y: 220, width: 50, height: 20 },
            { x: 760, y: 270, width: 45, height: 20 },
            { x: 840, y: 320, width: 45, height: 20 },
            { x: 920, y: 220, width: 50, height: 20 },
            { x: 1020, y: 270, width: 45, height: 20 },
            { x: 1100, y: 320, width: 45, height: 20 },
            { x: 1180, y: 220, width: 50, height: 20 },
            { x: 1280, y: 270, width: 45, height: 20 },
            { x: 1360, y: 320, width: 45, height: 20 },
            { x: 1440, y: 220, width: 50, height: 20 },
            { x: 1540, y: 270, width: 45, height: 20 },
            { x: 1620, y: 320, width: 45, height: 20 },
            { x: 1700, y: 220, width: 50, height: 20 },
            { x: 1800, y: 270, width: 45, height: 20 },
            { x: 1880, y: 320, width: 45, height: 20 },
            { x: 1960, y: 220, width: 50, height: 20 },
            { x: 2060, y: 270, width: 50, height: 20 },
            { x: 2160, y: 320, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 120, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 200, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 280, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 360, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 440, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 520, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 600, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 680, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 760, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 840, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 920, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1000, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1080, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1160, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1240, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1320, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1400, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1480, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1560, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1640, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1720, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1800, y: 300, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 200, y: 300, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 160, patrolEnd: 240 },
            { x: 360, y: 300, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 320, patrolEnd: 400 },
            { x: 520, y: 250, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 500, patrolEnd: 580 },
            { x: 680, y: 200, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 660, patrolEnd: 760 },
            { x: 840, y: 250, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 840, patrolEnd: 920 },
            { x: 1000, y: 200, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1020, patrolEnd: 1100 },
            { x: 1160, y: 250, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1180, patrolEnd: 1280 },
            { x: 1320, y: 200, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1360, patrolEnd: 1440 },
            { x: 1480, y: 250, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1540, patrolEnd: 1620 },
            { x: 1640, y: 200, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1700, patrolEnd: 1800 },
            { x: 1800, y: 250, width: 30, height: 30, speed: 4.5, direction: 1, patrolStart: 1880, patrolEnd: 1960 }
        ],
        powerUps: [
            { x: 300, y: 200, type: 'health' },
            { x: 700, y: 150, type: 'jump' },
            { x: 1100, y: 150, type: 'shield' },
            { x: 1500, y: 150, type: 'speed' },
            { x: 1900, y: 150, type: 'health' }
        ],
        movingPlatforms: [
            { x: 450, y: 320, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 320 },
            { x: 850, y: 270, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 270 },
            { x: 1250, y: 320, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 320 },
            { x: 1650, y: 270, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 270 },
            { x: 1050, y: 220, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 220 },
            { x: 1450, y: 220, width: 45, height: 15, speedX: 0, speedY: -3.5, rangeY: 140, startY: 220 }
        ],
        collectibles: 28,
        levelEndX: 2800,
        background: { top: '#D35400', mid: '#E67E22', bottom: '#F39C12' }
    },
    9: {
        platforms: [
            { x: 0, y: 420, width: 45, height: 20 },
            { x: 70, y: 370, width: 40, height: 20 },
            { x: 140, y: 320, width: 40, height: 20 },
            { x: 210, y: 270, width: 40, height: 20 },
            { x: 280, y: 320, width: 40, height: 20 },
            { x: 350, y: 220, width: 45, height: 20 },
            { x: 440, y: 270, width: 40, height: 20 },
            { x: 510, y: 320, width: 40, height: 20 },
            { x: 580, y: 220, width: 45, height: 20 },
            { x: 670, y: 270, width: 40, height: 20 },
            { x: 740, y: 320, width: 40, height: 20 },
            { x: 810, y: 220, width: 45, height: 20 },
            { x: 900, y: 270, width: 40, height: 20 },
            { x: 970, y: 320, width: 40, height: 20 },
            { x: 1040, y: 220, width: 45, height: 20 },
            { x: 1130, y: 270, width: 40, height: 20 },
            { x: 1200, y: 320, width: 40, height: 20 },
            { x: 1270, y: 220, width: 45, height: 20 },
            { x: 1360, y: 270, width: 40, height: 20 },
            { x: 1430, y: 320, width: 40, height: 20 },
            { x: 1500, y: 220, width: 45, height: 20 },
            { x: 1590, y: 270, width: 40, height: 20 },
            { x: 1660, y: 320, width: 40, height: 20 },
            { x: 1730, y: 220, width: 45, height: 20 },
            { x: 1820, y: 270, width: 40, height: 20 },
            { x: 1890, y: 320, width: 40, height: 20 },
            { x: 1960, y: 220, width: 45, height: 20 },
            { x: 2050, y: 270, width: 40, height: 20 },
            { x: 2120, y: 320, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 100, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 170, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 240, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 310, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 380, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 480, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 550, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 620, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 710, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 780, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 850, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 940, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1010, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1080, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1170, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1240, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1310, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1400, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1470, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1540, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1630, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1700, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1770, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1860, y: 250, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 170, y: 300, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 140, patrolEnd: 210 },
            { x: 310, y: 300, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 280, patrolEnd: 350 },
            { x: 480, y: 250, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 440, patrolEnd: 510 },
            { x: 620, y: 200, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 580, patrolEnd: 670 },
            { x: 780, y: 250, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 740, patrolEnd: 810 },
            { x: 940, y: 200, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 900, patrolEnd: 970 },
            { x: 1100, y: 250, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1040, patrolEnd: 1130 },
            { x: 1260, y: 200, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1270, patrolEnd: 1360 },
            { x: 1420, y: 250, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1430, patrolEnd: 1500 },
            { x: 1580, y: 200, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1590, patrolEnd: 1660 },
            { x: 1740, y: 250, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1820, patrolEnd: 1890 },
            { x: 1900, y: 200, width: 30, height: 30, speed: 5, direction: 1, patrolStart: 1960, patrolEnd: 2050 }
        ],
        powerUps: [
            { x: 250, y: 200, type: 'jump' },
            { x: 600, y: 150, type: 'health' },
            { x: 1000, y: 150, type: 'shield' },
            { x: 1400, y: 150, type: 'speed' },
            { x: 1800, y: 150, type: 'health' },
            { x: 2100, y: 200, type: 'jump' }
        ],
        movingPlatforms: [
            { x: 380, y: 320, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 320 },
            { x: 750, y: 270, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 270 },
            { x: 1120, y: 320, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 320 },
            { x: 1490, y: 270, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 270 },
            { x: 1860, y: 320, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 320 },
            { x: 850, y: 220, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 220 },
            { x: 1300, y: 220, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 220 },
            { x: 1750, y: 220, width: 40, height: 15, speedX: 0, speedY: -4, rangeY: 150, startY: 220 }
        ],
        collectibles: 30,
        levelEndX: 3000,
        background: { top: '#8E44AD', mid: '#9B59B6', bottom: '#BB8FCE' }
    },
    10: {
        platforms: [
            { x: 0, y: 420, width: 40, height: 20 },
            { x: 60, y: 370, width: 35, height: 20 },
            { x: 120, y: 320, width: 35, height: 20 },
            { x: 180, y: 270, width: 35, height: 20 },
            { x: 240, y: 320, width: 35, height: 20 },
            { x: 300, y: 220, width: 40, height: 20 },
            { x: 380, y: 270, width: 35, height: 20 },
            { x: 440, y: 320, width: 35, height: 20 },
            { x: 500, y: 220, width: 40, height: 20 },
            { x: 580, y: 270, width: 35, height: 20 },
            { x: 640, y: 320, width: 35, height: 20 },
            { x: 700, y: 220, width: 40, height: 20 },
            { x: 780, y: 270, width: 35, height: 20 },
            { x: 840, y: 320, width: 35, height: 20 },
            { x: 900, y: 220, width: 40, height: 20 },
            { x: 980, y: 270, width: 35, height: 20 },
            { x: 1040, y: 320, width: 35, height: 20 },
            { x: 1100, y: 220, width: 40, height: 20 },
            { x: 1180, y: 270, width: 35, height: 20 },
            { x: 1240, y: 320, width: 35, height: 20 },
            { x: 1300, y: 220, width: 40, height: 20 },
            { x: 1380, y: 270, width: 35, height: 20 },
            { x: 1440, y: 320, width: 35, height: 20 },
            { x: 1500, y: 220, width: 40, height: 20 },
            { x: 1580, y: 270, width: 35, height: 20 },
            { x: 1640, y: 320, width: 35, height: 20 },
            { x: 1700, y: 220, width: 40, height: 20 },
            { x: 1780, y: 270, width: 35, height: 20 },
            { x: 1840, y: 320, width: 35, height: 20 },
            { x: 1900, y: 220, width: 40, height: 20 },
            { x: 1980, y: 270, width: 35, height: 20 },
            { x: 2040, y: 320, width: 35, height: 20 },
            { x: 2100, y: 220, width: 40, height: 20 },
            { x: 2180, y: 270, width: 35, height: 20 },
            { x: 2240, y: 320, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 90, y: 350, width: 30, height: 40, type: 'spike' },
            { x: 150, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 210, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 270, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 330, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 430, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 490, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 550, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 630, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 690, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 750, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 830, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 890, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 950, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1030, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1090, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1150, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1230, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1290, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1350, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1430, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1490, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1550, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1630, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1690, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1750, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 1830, y: 250, width: 30, height: 40, type: 'spike' },
            { x: 1890, y: 300, width: 30, height: 40, type: 'spike' },
            { x: 1950, y: 200, width: 30, height: 40, type: 'spike' },
            { x: 2030, y: 250, width: 30, height: 40, type: 'spike' }
        ],
        enemies: [
            { x: 150, y: 300, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 120, patrolEnd: 180 },
            { x: 270, y: 300, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 240, patrolEnd: 300 },
            { x: 430, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 380, patrolEnd: 440 },
            { x: 550, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 500, patrolEnd: 580 },
            { x: 690, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 640, patrolEnd: 700 },
            { x: 830, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 780, patrolEnd: 840 },
            { x: 970, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 900, patrolEnd: 980 },
            { x: 1110, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1100, patrolEnd: 1180 },
            { x: 1250, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1240, patrolEnd: 1300 },
            { x: 1390, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1380, patrolEnd: 1440 },
            { x: 1530, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1500, patrolEnd: 1580 },
            { x: 1670, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1640, patrolEnd: 1700 },
            { x: 1810, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1780, patrolEnd: 1840 },
            { x: 1950, y: 200, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 1900, patrolEnd: 1980 },
            { x: 2090, y: 250, width: 30, height: 30, speed: 5.5, direction: 1, patrolStart: 2040, patrolEnd: 2100 }
        ],
        powerUps: [
            { x: 200, y: 200, type: 'health' },
            { x: 550, y: 150, type: 'jump' },
            { x: 900, y: 150, type: 'shield' },
            { x: 1250, y: 150, type: 'speed' },
            { x: 1600, y: 150, type: 'health' },
            { x: 1950, y: 150, type: 'jump' },
            { x: 2200, y: 200, type: 'shield' }
        ],
        movingPlatforms: [
            { x: 320, y: 320, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 320 },
            { x: 640, y: 270, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 270 },
            { x: 960, y: 320, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 320 },
            { x: 1280, y: 270, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 270 },
            { x: 1600, y: 320, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 320 },
            { x: 1920, y: 270, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 270 },
            { x: 700, y: 220, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 220 },
            { x: 1020, y: 220, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 220 },
            { x: 1340, y: 220, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 220 },
            { x: 1660, y: 220, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 220 },
            { x: 1980, y: 220, width: 35, height: 15, speedX: 0, speedY: -4.5, rangeY: 160, startY: 220 }
        ],
        collectibles: 35,
        levelEndX: 3200,
        background: { top: '#1A1A1A', mid: '#2C2C2C', bottom: '#4A4A4A' }
    }
};

function loadLevel(level) {
    if (!levelData[level]) {
        showNotification('Congratulations! You completed all levels!', 'success', 5000);
        gameState = 'gameover';
        return;
    }
    
    const data = levelData[level];
    platforms.length = 0;
    obstacles.length = 0;
    enemies.length = 0;
    powerUps.length = 0;
    movingPlatforms.length = 0;
    collectibles.length = 0;
    particles.length = 0;
    
    // Load platforms
    data.platforms.forEach(p => {
        platforms.push({
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            color: '#8B4513'
        });
    });
    
    // Load obstacles
    data.obstacles.forEach(o => {
        obstacles.push({
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            type: o.type
        });
    });
    
    // Load enemies
    data.enemies.forEach(e => {
        enemies.push({
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            speed: e.speed,
            direction: e.direction,
            patrolStart: e.patrolStart,
            patrolEnd: e.patrolEnd,
            originalY: e.y
        });
    });
    
    // Load power-ups
    data.powerUps.forEach(p => {
        powerUps.push({
            x: p.x,
            y: p.y,
            type: p.type,
            collected: false,
            rotation: 0
        });
    });
    
    // Load moving platforms
    if (data.movingPlatforms) {
        data.movingPlatforms.forEach(mp => {
            movingPlatforms.push({
                x: mp.x,
                y: mp.y,
                width: mp.width,
                height: mp.height,
                speedX: mp.speedX,
                speedY: mp.speedY,
                rangeY: mp.rangeY,
                startY: mp.startY,
                directionY: 1
            });
        });
    }
    
    // Create collectibles
    totalCoinsInLevel = data.collectibles;
    coinsCollected = 0;
    for (let i = 0; i < data.collectibles; i++) {
        const platform = data.platforms[Math.floor(Math.random() * data.platforms.length)];
        collectibles.push({
            x: platform.x + Math.random() * (platform.width - 30),
            y: platform.y - 30,
            radius: 15,
            collected: false,
            rotation: 0,
            floatOffset: Math.random() * Math.PI * 2
        });
    }
    
    levelCompleteX = data.levelEndX;
    levelStartX = 0;
    cameraX = 0;
    
    // Create finish flag at end of level
    // Find the ground level near the end (use last platform or default)
    let flagY = 350; // Default Y position
    const lastPlatform = data.platforms[data.platforms.length - 1];
    if (lastPlatform) {
        flagY = lastPlatform.y - 80; // Position flag above the last platform
    }
    
    finishFlag = {
        x: data.levelEndX - 30,
        y: flagY,
        poleHeight: 60,
        flagWidth: 40,
        flagHeight: 30,
        waveOffset: 0,
        poleX: data.levelEndX - 30
    };
    
    // Add a platform for the flag if there isn't one nearby
    const hasPlatformNearFlag = data.platforms.some(p => 
        Math.abs(p.x + p.width - data.levelEndX) < 50
    );
    if (!hasPlatformNearFlag && lastPlatform) {
        platforms.push({
            x: data.levelEndX - 50,
            y: lastPlatform.y,
            width: 50,
            height: 20,
            color: '#8B4513'
        });
    }
    
    // Update background
    document.body.style.setProperty('--bg-top', data.background.top);
    document.body.style.setProperty('--bg-mid', data.background.mid);
    document.body.style.setProperty('--bg-bottom', data.background.bottom);
    
    // Update music tempo based on level
    currentMusicTempo = 600 - (level * 50);
    
    resetPlayer();
    showNotification(`Level ${level} Started!`, 'info', 2000);
}

// Enhanced Audio System
function setupAudio() {
    if (musicEnabled) {
        startBackgroundMusic();
    }
}

function startBackgroundMusic() {
    if (musicInterval) {
        clearInterval(musicInterval);
    }
    
    if (!musicGainNode) {
        musicGainNode = audioContext.createGain();
        musicGainNode.connect(audioContext.destination);
        musicGainNode.gain.value = 0.3;
    }
    
    // Musical notes (C Major scale + extended range)
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23;
    const G4 = 392.00, A4 = 440.00, B4 = 493.88, C5 = 523.25;
    const D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
    
    // Bass notes (one octave lower)
    const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61;
    const G3 = 196.00, A3 = 220.00, B3 = 246.94;
    
    // Catchy melody pattern - creates an uplifting, adventurous tune
    const melodyPattern = [
        C4, E4, G4, C5, G4, E4, C4, G4,
        D4, F4, A4, D5, A4, F4, D4, A4,
        E4, G4, B4, E5, B4, G4, E4, B4,
        C4, E4, G4, C5, G4, E4, C4, G4
    ];
    
    // Bass pattern - provides rhythm and foundation
    const bassPattern = [
        C3, C3, G3, G3, A3, A3, G3, G3,
        F3, F3, C3, C3, G3, G3, C3, C3
    ];
    
    // Harmony pattern - adds depth
    const harmonyPattern = [
        E4, E4, B4, B4, C5, C5, B4, B4,
        A4, A4, E4, E4, B4, B4, E4, E4
    ];
    
    let melodyIndex = 0;
    let bassIndex = 0;
    let harmonyIndex = 0;
    let beatCount = 0;
    let measureCount = 0;
    
    function playMusic() {
        if (!musicEnabled || gameState !== 'playing') return;
        
        beatCount++;
        const beatInMeasure = beatCount % 16;
        
        // Main melody - plays on beats 0, 2, 4, 6, 8, 10, 12, 14
        if (beatInMeasure % 2 === 0) {
            const note = melodyPattern[melodyIndex % melodyPattern.length];
            playTone(note, 0.35, 'sine', 0.18, musicGainNode);
            melodyIndex++;
        }
        
        // Bass line - plays on beats 0, 4, 8, 12 (quarter notes)
        if (beatInMeasure % 4 === 0) {
            const bassNote = bassPattern[bassIndex % bassPattern.length];
            playTone(bassNote, 0.5, 'triangle', 0.12, musicGainNode);
            bassIndex++;
        }
        
        // Harmony - plays on beats 1, 5, 9, 13 (off-beat)
        if (beatInMeasure % 4 === 1) {
            const harmonyNote = harmonyPattern[harmonyIndex % harmonyPattern.length];
            playTone(harmonyNote, 0.4, 'sine', 0.1, musicGainNode);
            harmonyIndex++;
        }
        
        // Percussion-like accent on beat 0 of each measure
        if (beatInMeasure === 0) {
            playTone(100, 0.1, 'square', 0.08, musicGainNode);
            measureCount++;
        }
        
        // Add occasional high notes for sparkle (every 8 beats)
        if (beatInMeasure % 8 === 3) {
            const sparkleNote = [C5, E5, G5][Math.floor(measureCount / 4) % 3];
            playTone(sparkleNote, 0.2, 'sine', 0.06, musicGainNode);
        }
    }
    
    // Adjust tempo based on level (faster = more exciting)
    const baseTempo = 180 - (currentLevel * 15); // 180ms to 105ms
    musicInterval = setInterval(playMusic, Math.max(100, baseTempo));
}

function playTone(frequency, duration, type, volume, destination) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(destination || audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playSound(frequency, duration, type = 'sine', volume = 0.2) {
    if (!soundEnabled) return;
    playTone(frequency, duration, type, volume);
}

// Particle System
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 8,
            velocityY: (Math.random() - 0.5) * 8,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.03,
            size: 3 + Math.random() * 5,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.velocityY += 0.3; // gravity
        p.life -= p.decay;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Touch Controls Setup
function setupTouchControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    
    if (!leftBtn || !rightBtn || !jumpBtn) return;
    
    // Touch start
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchKeys.left = true;
    }, { passive: false });
    
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchKeys.right = true;
    }, { passive: false });
    
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchKeys.jump = true;
        if (gameState === 'playing' && player.onGround) {
            const jumpPower = player.powerUp === 'jump' ? player.jumpPower * 1.5 : player.jumpPower;
            player.velocityY = jumpPower;
            player.onGround = false;
            playSound(400, 0.2, 'square');
            createParticles(player.x + player.width / 2, player.y + player.height, '#4ECDC4', 5);
        }
    }, { passive: false });
    
    // Touch end
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchKeys.left = false;
    }, { passive: false });
    
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchKeys.right = false;
    }, { passive: false });
    
    jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchKeys.jump = false;
    }, { passive: false });
    
    // Mouse events for desktop testing
    leftBtn.addEventListener('mousedown', () => touchKeys.left = true);
    leftBtn.addEventListener('mouseup', () => touchKeys.left = false);
    leftBtn.addEventListener('mouseleave', () => touchKeys.left = false);
    
    rightBtn.addEventListener('mousedown', () => touchKeys.right = true);
    rightBtn.addEventListener('mouseup', () => touchKeys.right = false);
    rightBtn.addEventListener('mouseleave', () => touchKeys.right = false);
    
    jumpBtn.addEventListener('mousedown', () => {
        touchKeys.jump = true;
        if (gameState === 'playing' && player.onGround) {
            const jumpPower = player.powerUp === 'jump' ? player.jumpPower * 1.5 : player.jumpPower;
            player.velocityY = jumpPower;
            player.onGround = false;
            playSound(400, 0.2, 'square');
            createParticles(player.x + player.width / 2, player.y + player.height, '#4ECDC4', 5);
        }
    });
    jumpBtn.addEventListener('mouseup', () => touchKeys.jump = false);
    jumpBtn.addEventListener('mouseleave', () => touchKeys.jump = false);
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('nextLevelButton').addEventListener('click', nextLevel);
    document.getElementById('musicToggle').addEventListener('click', toggleMusic);
    document.getElementById('soundToggle').addEventListener('click', toggleSound);
    
    const keys = {};
    
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            if (gameState === 'playing' && player.onGround) {
                const jumpPower = player.powerUp === 'jump' ? player.jumpPower * 1.5 : player.jumpPower;
                player.velocityY = jumpPower;
                player.onGround = false;
                playSound(400, 0.2, 'square');
                createParticles(player.x + player.width / 2, player.y + player.height, '#4ECDC4', 5);
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    function handleInput() {
        if (gameState !== 'playing') return;
        
        player.velocityX = 0;
        const speed = player.powerUp === 'speed' ? player.speed * 1.5 : player.speed;
        
        // Keyboard controls
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.velocityX = -speed;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.velocityX = speed;
        }
        
        // Touch controls
        if (touchKeys.left) {
            player.velocityX = -speed;
        }
        if (touchKeys.right) {
            player.velocityX = speed;
        }
    }
    
    setInterval(handleInput, 16);
}

// Game Functions
function startGame() {
    gameState = 'playing';
    currentLevel = 1;
    score = 0;
    lives = 3;
    playerHealth = maxHealth;
    document.getElementById('startScreen').style.display = 'none';
    loadLevel(currentLevel);
    updateUI();
    pokiGameplayStart(); // Poki SDK event
    if (musicEnabled) {
        startBackgroundMusic();
    }
}

function restartGame() {
    pokiGameplayStop(); // Stop previous gameplay
    gameState = 'playing';
    currentLevel = 1;
    score = 0;
    lives = 3;
    playerHealth = maxHealth;
    player.powerUp = null;
    player.powerUpTime = 0;
    document.getElementById('gameOverScreen').style.display = 'none';
    loadLevel(currentLevel);
    updateUI();
    pokiGameplayStart(); // Poki SDK event
    if (musicEnabled) {
        startBackgroundMusic();
    }
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > maxLevel) {
        showNotification('Congratulations! You completed all levels!', 'success', 5000);
        gameState = 'gameover';
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalLevel').textContent = currentLevel - 1;
        return;
    }
    
    gameState = 'playing';
    document.getElementById('levelCompleteScreen').style.display = 'none';
    playerHealth = maxHealth;
    player.powerUp = null;
    player.powerUpTime = 0;
    loadLevel(currentLevel);
    updateUI();
    document.getElementById('level').textContent = currentLevel;
    if (musicEnabled) {
        startBackgroundMusic();
    }
}

function resetPlayer() {
    player.x = 100;
    player.y = 350; // Adjusted for new canvas height
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    player.invulnerable = false;
    player.invulnerableTime = 0;
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('musicToggle');
    btn.textContent = musicEnabled ? '🔊 Music' : '🔇 Music';
    btn.classList.toggle('muted', !musicEnabled);
    
    if (musicEnabled && gameState === 'playing') {
        startBackgroundMusic();
    } else if (musicInterval) {
        clearInterval(musicInterval);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    btn.textContent = soundEnabled ? '🔊 Sound' : '🔇 Sound';
    btn.classList.toggle('muted', !soundEnabled);
}

function takeDamage(amount) {
    if (player.invulnerable || player.powerUp === 'shield') return;
    
    playerHealth -= amount;
    player.invulnerable = true;
    player.invulnerableTime = 120; // 2 seconds at 60fps
    
    if (playerHealth <= 0) {
        playerHealth = 0;
        loseLife();
    }
    
    playSound(200, 0.3, 'sawtooth', 0.3);
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#e74c3c', 15);
    showNotification(`-${amount} Health!`, 'error', 1000);
    updateUI();
}

function loseLife() {
    lives--;
    playSound(150, 0.5, 'sawtooth', 0.4);
    
    if (lives <= 0) {
        gameOver();
    } else {
        playerHealth = maxHealth;
        resetPlayer();
        showNotification(`Life Lost! ${lives} lives remaining`, 'warning', 2000);
        updateUI();
    }
}

function heal(amount) {
    playerHealth = Math.min(maxHealth, playerHealth + amount);
    playSound(600, 0.2, 'sine', 0.2);
    createParticles(player.x + player.width / 2, player.y + player.height / 2, '#2ecc71', 10);
    showNotification(`+${amount} Health!`, 'success', 1500);
    updateUI();
}

function activatePowerUp(type) {
    player.powerUp = type;
    player.powerUpTime = 600; // 10 seconds at 60fps
    
    let message = '';
    let color = '#3498db';
    
    switch(type) {
        case 'speed':
            message = 'Speed Boost!';
            color = '#f39c12';
            break;
        case 'jump':
            message = 'Jump Boost!';
            color = '#9b59b6';
            break;
        case 'shield':
            message = 'Shield Activated!';
            color = '#3498db';
            break;
        case 'health':
            heal(50);
            return;
    }
    
    playSound(700, 0.3, 'sine', 0.25);
    createParticles(player.x + player.width / 2, player.y + player.height / 2, color, 20);
    showNotification(message, 'success', 2000);
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('lives').textContent = lives;
    
    const healthPercent = (playerHealth / maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = Math.ceil(healthPercent) + '%';
    
    // Update health bar color
    const healthFill = document.getElementById('healthFill');
    if (healthPercent > 60) {
        healthFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
    } else if (healthPercent > 30) {
        healthFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
    } else {
        healthFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }
}

// Physics
function updatePhysics() {
    if (gameState !== 'playing') return;
    
    // Update invulnerability
    if (player.invulnerable) {
        player.invulnerableTime--;
        if (player.invulnerableTime <= 0) {
            player.invulnerable = false;
        }
    }
    
    // Update power-up timer
    if (player.powerUp) {
        player.powerUpTime--;
        if (player.powerUpTime <= 0) {
            showNotification(`${player.powerUp} power-up expired!`, 'warning', 1500);
            player.powerUp = null;
        }
    }
    
    // Update moving platforms
    for (let mp of movingPlatforms) {
        mp.y += mp.speedY * mp.directionY;
        
        if (mp.y <= mp.startY - mp.rangeY || mp.y >= mp.startY) {
            mp.directionY *= -1;
        }
    }
    
    // Update enemies
    for (let enemy of enemies) {
        enemy.x += enemy.speed * enemy.direction;
        
        if (enemy.x <= enemy.patrolStart || enemy.x >= enemy.patrolEnd) {
            enemy.direction *= -1;
        }
    }
    
    // Gravity
    player.velocityY += 0.8;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Check platform collisions
    player.onGround = false;
    for (let platform of platforms) {
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height + 10 &&
            player.velocityY > 0) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    }
    
    // Check moving platform collisions
    for (let mp of movingPlatforms) {
        if (player.x + player.width > mp.x &&
            player.x < mp.x + mp.width &&
            player.y + player.height > mp.y &&
            player.y + player.height < mp.y + mp.height + 10 &&
            player.velocityY > 0) {
            player.y = mp.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            player.x += mp.speedX; // Move with platform
        }
    }
    
    // Check obstacle collisions
    for (let obstacle of obstacles) {
        if (player.x + player.width > obstacle.x &&
            player.x < obstacle.x + obstacle.width &&
            player.y + player.height > obstacle.y &&
            player.y < obstacle.y + obstacle.height) {
            takeDamage(25);
            // Push player back
            if (player.x < obstacle.x + obstacle.width / 2) {
                player.x = obstacle.x - player.width - 5;
            } else {
                player.x = obstacle.x + obstacle.width + 5;
            }
        }
    }
    
    // Check enemy collisions
    for (let enemy of enemies) {
        if (player.x + player.width > enemy.x &&
            player.x < enemy.x + enemy.width &&
            player.y + player.height > enemy.y &&
            player.y < enemy.y + enemy.height) {
            takeDamage(20);
            // Push player back
            if (player.x < enemy.x + enemy.width / 2) {
                player.x = enemy.x - player.width - 5;
            } else {
                player.x = enemy.x + enemy.width + 5;
            }
        }
    }
    
    // Check power-up collisions
    for (let powerUp of powerUps) {
        if (!powerUp.collected) {
            const dx = (player.x + player.width / 2) - powerUp.x;
            const dy = (player.y + player.height / 2) - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.width / 2 + 20) {
                powerUp.collected = true;
                activatePowerUp(powerUp.type);
            }
        }
    }
    
    // Check collectible collisions
    for (let collectible of collectibles) {
        if (!collectible.collected) {
            const dx = (player.x + player.width / 2) - collectible.x;
            const dy = (player.y + player.height / 2) - collectible.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.width / 2 + collectible.radius) {
                collectible.collected = true;
                coinsCollected++;
                score += 10;
                playSound(600, 0.15, 'sine', 0.2);
                createParticles(collectible.x, collectible.y, '#FFD700', 8);
            }
        }
    }
    
    // Update camera
    cameraX = player.x - 200;
    if (cameraX < 0) cameraX = 0;
    
    // Update score based on distance
    score = Math.max(score, Math.floor(player.x / 10));
    
    // Check level completion (with visual feedback when near flag)
    if (finishFlag) {
        const distanceToFlag = finishFlag.poleX - player.x;
        if (distanceToFlag < 100 && distanceToFlag > 0) {
            // Create sparkle particles when approaching flag
            if (Math.random() < 0.1) {
                createParticles(finishFlag.poleX, finishFlag.y, '#2ecc71', 3);
            }
        }
    }
    
    if (player.x >= levelCompleteX) {
        // Create celebration particles at flag
        if (finishFlag) {
            for (let i = 0; i < 30; i++) {
                createParticles(finishFlag.poleX, finishFlag.y, 
                    ['#2ecc71', '#FFD700', '#FF6B6B', '#4ECDC4'][Math.floor(Math.random() * 4)], 1);
            }
        }
        completeLevel();
        return;
    }
    
    // Check if player fell off
    if (player.y > canvas.height + 100) {
        takeDamage(50);
        if (playerHealth > 0) {
            resetPlayer();
        }
    }
    
    // Update particles
    updateParticles();
    
    // Update UI
    updateUI();
}

function completeLevel() {
    gameState = 'levelcomplete';
    const bonusScore = coinsCollected * 50;
    score += bonusScore;
    
    document.getElementById('levelScore').textContent = score;
    document.getElementById('coinsCollected').textContent = `${coinsCollected}/${totalCoinsInLevel}`;
    document.getElementById('levelCompleteScreen').style.display = 'block';
    
    playSound(800, 0.5, 'sine', 0.3);
    showNotification(`Level ${currentLevel} Complete!`, 'success', 3000);
    
    // Create celebration particles
    for (let i = 0; i < 50; i++) {
        createParticles(player.x + player.width / 2, player.y + player.height / 2, 
            ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'][Math.floor(Math.random() * 4)], 1);
    }
}

function gameOver() {
    pokiGameplayStop(); // Poki SDK event
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLevel').textContent = currentLevel;
    document.getElementById('gameOverScreen').style.display = 'block';
    if (musicInterval) {
        clearInterval(musicInterval);
    }
}

// Rendering
function drawBackground() {
    const data = levelData[currentLevel];
    if (!data) return;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, data.background.top);
    gradient.addColorStop(0.5, data.background.mid);
    gradient.addColorStop(1, data.background.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw distant hills and palm trees
    ctx.save();
    ctx.translate(-cameraX * 0.3, 0);
    
    // Hills
    ctx.fillStyle = '#7FB069';
    ctx.beginPath();
    ctx.moveTo(-100, canvas.height - 100);
    for (let i = 0; i < 10; i++) {
        ctx.lineTo(i * 200, canvas.height - 100 - Math.sin(i) * 50);
    }
    ctx.lineTo(canvas.width + 200, canvas.height - 100);
    ctx.lineTo(canvas.width + 200, canvas.height);
    ctx.lineTo(-100, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Palm trees
    for (let i = 0; i < 8; i++) {
        const treeX = 150 + i * 300;
        const treeY = canvas.height - 150;
        
        // Trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(treeX - 5, treeY, 10, 40);
        
        // Leaves
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(treeX, treeY - 10, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(treeX - 15, treeY - 5, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(treeX + 15, treeY - 5, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawPlatforms() {
    for (let platform of platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x - cameraX, platform.y, platform.width, platform.height);
        
        // Platform texture
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x - cameraX, platform.y, platform.width, 5);
    }
}

function drawMovingPlatforms() {
    for (let mp of movingPlatforms) {
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(mp.x - cameraX, mp.y, mp.width, mp.height);
        
        // Highlight
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(mp.x - cameraX, mp.y, mp.width, 3);
    }
}

function drawObstacles() {
    for (let obstacle of obstacles) {
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        
        if (obstacle.type === 'spike') {
            const x = obstacle.x - cameraX;
            const y = obstacle.y;
            const w = obstacle.width;
            const h = obstacle.height;
            
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
            ctx.fill();
            
            // Spike highlight
            ctx.fillStyle = '#E0E0E0';
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w / 4, y + h / 2);
            ctx.lineTo(x + w / 2, y + h / 3);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawEnemies() {
    for (let enemy of enemies) {
        const x = enemy.x - cameraX;
        const y = enemy.y;
        
        // Body
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x, y, enemy.width, enemy.height);
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + 8, y + 10, 3, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + 8, y + 10, 1.5, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 10, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPowerUps() {
    for (let powerUp of powerUps) {
        if (powerUp.collected) continue;
        
        powerUp.rotation += 0.1;
        const x = powerUp.x - cameraX;
        const y = powerUp.y + Math.sin(powerUp.rotation) * 5;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(powerUp.rotation);
        
        let color = '#3498db';
        switch(powerUp.type) {
            case 'speed': color = '#f39c12'; break;
            case 'jump': color = '#9b59b6'; break;
            case 'shield': color = '#3498db'; break;
            case 'health': color = '#2ecc71'; break;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = powerUp.type === 'speed' ? '⚡' : powerUp.type === 'jump' ? '⬆' : powerUp.type === 'shield' ? '🛡' : '❤';
        ctx.fillText(icon, 0, 0);
        
        ctx.restore();
    }
}

function drawCollectibles() {
    for (let collectible of collectibles) {
        if (collectible.collected) continue;
        
        collectible.rotation += 0.05;
        const x = collectible.x - cameraX;
        const y = collectible.y + Math.sin(collectible.rotation + collectible.floatOffset) * 3;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(collectible.rotation);
        
        // Coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, collectible.radius, collectible.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shine
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.ellipse(-3, -3, collectible.radius * 0.4, collectible.radius * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

function drawPlayer() {
    const x = player.x - cameraX;
    const y = player.y;
    
    // Invulnerability flash
    if (player.invulnerable && Math.floor(player.invulnerableTime / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Shield effect
    if (player.powerUp === 'shield') {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + player.width / 2, y + player.height / 2, player.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Body
    ctx.fillStyle = player.color;
    ctx.fillRect(x, y, player.width, player.height);
    
    // Head
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(x + player.width / 2, y + 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + player.width / 2 - 4, y + 13, 2, 0, Math.PI * 2);
    ctx.arc(x + player.width / 2 + 4, y + 13, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Shirt
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 5, y + 25, player.width - 10, 15);
    
    // Legs
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(x + 8, y + 40, 8, 10);
    ctx.fillRect(x + 24, y + 40, 8, 10);
    
    ctx.globalAlpha = 1.0;
}

function drawFinishFlag() {
    if (!finishFlag) return;
    
    const x = finishFlag.poleX - cameraX;
    const y = finishFlag.y;
    
    // Only draw if flag is visible on screen
    if (x < -50 || x > canvas.width + 50) return;
    
    // Draw finish line effect (vertical line)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + finishFlag.poleHeight);
    ctx.lineTo(x + 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw flag pole
    ctx.fillStyle = '#654321';
    ctx.fillRect(x, y, 4, finishFlag.poleHeight);
    
    // Pole highlight
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, 2, finishFlag.poleHeight);
    
    // Draw pole top (golden ball)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + 2, y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Top ball highlight
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(x + 1, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Animate flag waving
    finishFlag.waveOffset += 0.15;
    const waveAmount = Math.sin(finishFlag.waveOffset) * 10;
    
    // Draw flag with wave effect
    ctx.save();
    ctx.translate(x + 4, y + 5);
    
    // Flag base (green with checkered pattern)
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(finishFlag.flagWidth / 2 + waveAmount / 2, waveAmount, finishFlag.flagWidth + waveAmount, 0);
    ctx.lineTo(finishFlag.flagWidth + waveAmount, finishFlag.flagHeight);
    ctx.quadraticCurveTo(finishFlag.flagWidth / 2 + waveAmount / 2, finishFlag.flagHeight + waveAmount, 0, finishFlag.flagHeight);
    ctx.closePath();
    ctx.fill();
    
    // Flag border
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw checkered pattern on flag
    ctx.fillStyle = '#fff';
    const checkSize = 6;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * checkSize, j * checkSize, checkSize, checkSize);
            }
        }
    }
    
    // Flag center star/symbol
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', finishFlag.flagWidth / 2 + waveAmount / 2, finishFlag.flagHeight / 2);
    
    ctx.restore();
    
    // Draw pulsing glow effect
    const glowIntensity = 0.3 + Math.sin(finishFlag.waveOffset * 2) * 0.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#2ecc71';
    ctx.fillStyle = `rgba(46, 204, 113, ${glowIntensity})`;
    ctx.beginPath();
    ctx.arc(x + 2, y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw "FINISH" text above flag
    const distanceToFlag = finishFlag.poleX - (player.x + cameraX);
    if (distanceToFlag < 200 && distanceToFlag > -50) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('FINISH', x + 2, y - 25);
        ctx.fillText('FINISH', x + 2, y - 25);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    drawPlatforms();
    drawMovingPlatforms();
    drawObstacles();
    drawEnemies();
    drawPowerUps();
    drawCollectibles();
    drawFinishFlag(); // Draw finish flag
    drawParticles();
    drawPlayer();
}

// Game Loop
function gameLoop() {
    updatePhysics();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener('load', () => {
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });
    
    init();
});
