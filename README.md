# SkyRunner
# SkyRunner - Epic Platform Adventure Game

An expanded 2D platformer game with multiple levels, enemies, power-ups, health system, and enhanced audio.

## 🎮 Features

### Core Gameplay
- **5 Unique Levels**: Each level increases in difficulty with more obstacles, enemies, and challenges
- **Health System**: 100 HP with visual health bar that changes color based on health
- **Lives System**: 3 lives - lose all lives and it's game over
- **Score System**: Points for distance traveled, coins collected, and level completion bonuses
- **Smooth Physics**: Realistic gravity, jumping, and collision detection

### Advanced Mechanics
- **Enemies**: Patrolling enemies that damage the player on contact
- **Moving Platforms**: Platforms that move vertically, requiring timing to navigate
- **Power-Ups**: 
  - ⚡ **Speed Boost**: Increases movement speed by 50%
  - ⬆ **Jump Boost**: Increases jump height by 50%
  - 🛡 **Shield**: Temporary invincibility
  - ❤ **Health Pack**: Restores 50 HP
- **Invulnerability**: Brief invincibility frames after taking damage
- **Particle Effects**: Visual feedback for actions (jumping, collecting, damage, etc.)

### Audio System
- **Enhanced Background Music**: Multi-layered music with melody, bass, and harmony
- **Dynamic Tempo**: Music tempo increases with each level
- **Sound Effects**: 
  - Jump sounds
  - Coin collection sounds
  - Damage sounds
  - Power-up activation sounds
  - Level completion fanfare
- **Audio Controls**: Toggle music and sound effects independently

### Notification System
- **Real-time Notifications**: Pop-up notifications for important game events
- **Notification Types**:
  - 🟢 Success (green) - Level complete, power-ups, healing
  - 🟡 Warning (yellow) - Life lost, power-up expired
  - 🔵 Info (blue) - Level started, general info
  - 🔴 Error (red) - Damage taken
- **Auto-dismiss**: Notifications automatically fade out after a few seconds

### Visual Enhancements
- **Animated Collectibles**: Coins rotate and float
- **Animated Power-Ups**: Power-ups rotate and bounce
- **Particle System**: Visual effects for various game events
- **Level-Specific Backgrounds**: Each level has unique color schemes
- **Health Bar**: Color-coded health bar (green → yellow → red)
- **Shield Effect**: Visual indicator when shield power-up is active
- **Invulnerability Flash**: Player flashes when invulnerable

## 🎯 How to Play

1. Open `index.html` in a modern web browser
2. Click "Start Game" to begin
3. Navigate through 5 increasingly difficult levels
4. Collect all coins for bonus points
5. Use power-ups strategically
6. Avoid spikes and enemies
7. Complete each level by reaching the end

## ⌨️ Controls

- **Left Arrow / A**: Move left
- **Right Arrow / D**: Move right
- **Space / Up Arrow / W**: Jump
- **Music Button**: Toggle background music on/off
- **Sound Button**: Toggle sound effects on/off

## 📊 Game Mechanics

### Scoring
- **Distance**: 1 point per 10 pixels traveled
- **Coins**: 10 points per coin collected
- **Level Completion**: 50 points per coin collected as bonus

### Health & Damage
- **Starting Health**: 100 HP
- **Spike Damage**: 25 HP
- **Enemy Damage**: 20 HP
- **Fall Damage**: 50 HP
- **Invulnerability**: 2 seconds after taking damage
- **Shield**: Complete invincibility while active (10 seconds)

### Power-Ups
- **Duration**: 10 seconds (except health pack which is instant)
- **Visual Indicator**: Rotating icon above power-up
- **Expiration Notification**: Warns when power-up expires

### Levels
1. **Level 1**: Tutorial level - Basic platforms and spikes
2. **Level 2**: Introduces enemies and moving platforms
3. **Level 3**: More enemies, tighter platforms, more obstacles
4. **Level 4**: Increased difficulty, more enemies, complex navigation
5. **Level 5**: Final level - Maximum difficulty with all mechanics

## 🎨 Technical Details

- **Built with**: HTML5 Canvas and vanilla JavaScript
- **Audio**: Web Audio API for procedural music generation
- **No Dependencies**: Runs entirely in the browser
- **Performance**: Optimized particle system and rendering
- **Responsive**: Works on modern desktop browsers

## 🎵 Audio Features

The game uses procedural audio generation:
- **Melody Line**: Plays every beat
- **Bass Line**: Plays every 2 beats
- **Harmony**: Plays every 4 beats
- **Tempo**: Increases with each level (600ms → 350ms)
- **Volume Control**: Separate gain nodes for music and sound effects

## 🚀 Customization

You can easily customize:
- Level layouts in the `levelData` object
- Enemy speeds and patrol ranges
- Power-up durations and effects
- Health and damage values
- Music tempo and notes
- Particle effects and colors
- Background colors per level

## 🎮 Tips for Success

1. **Collect All Coins**: Bonus points at the end of each level
2. **Use Power-Ups Wisely**: Save shield for difficult sections
3. **Watch Enemy Patterns**: Enemies patrol between set points
4. **Time Moving Platforms**: Wait for the right moment to jump
5. **Manage Health**: Avoid unnecessary damage to preserve lives
6. **Learn Level Layouts**: Each level has unique challenges

Enjoy playing SkyRunner! 🎉
