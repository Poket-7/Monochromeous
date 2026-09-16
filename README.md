# Monochromeous

> 👥 **Credits**  
> - **Storyboard**: Tegh  
> - **Art Direction**: Louis  
> - **Programming**: Abdullah  
>  
> *"A special thanks to Tegh and Louis for making this possible."*

---

## 🎮 About the Game

**Monochromeous** is a 3D retro survival horror game rendered entirely in high-contrast monochrome with an authentic PS1-style pixelated aesthetic. 

You find yourself trapped inside an abandoned labyrinth cloaked in thick, suffocating fog. Somewhere in the mist lurks **The Entity**—a cracked, faceless terror with dark creeping tendrils and floating fractured shards breaking away from its limbs. 

Your objective is simple: **survive**. Locate and restore all **4 Signal Beacons** scattered across the labyrinth to unlock the Emergency Blast Gate and escape before the entity consumes you.

---

## 👁️ The Entity

Designed from original storyboard sketches:
- **Faceless Porcelain Head**: A blank, featureless cranial sphere fractured by hairline cracks radiating across the top and side.
- **Creeping Tendril Anatomy**: Textured charcoal body wrapped in organic, branching black veins and roots.
- **Clawed Talons**: Elongated arms ending in sharp curved claws.
- **Floating Fractured Shards**: Splinters and shards break away from the entity's forearms, orbiting and vibrating with uncanny psychic energy.
- **Predatory AI**: Stalks silently through the fog, accelerating its pursuit and violently twitching when your flashlight or footsteps alert it.

---

## 🕹️ Controls

### Mobile (Touch Controls)
- **Left Side**: Always-visible virtual joystick for omnidirectional movement (walk & strafe).
- **Right Side**: Drag to rotate camera / look around and steer.
- **Action Buttons**:
  - `LIGHT`: Toggle Flashlight (conserve battery & lower detection risk).
  - `SPRINT`: Hold to sprint (consumes stamina).
  - `INTERACT`: Activates nearby beacons.
- **Pause Button (`❚❚`)**: Top-right corner of the HUD.

### Desktop (Keyboard & Mouse)
- **W, A, S, D / Arrow Keys**: Move and strafe
- **Mouse**: Look around (click canvas to lock mouse pointer)
- **Shift**: Sprint
- **F**: Toggle Flashlight
- **E / Space**: Interact with Beacons
- **ESC / P**: Pause Game

---

## 📱 Android APK Installation

A pre-built, signed, and aligned APK is available directly in this repository:
👉 **[`Monochromeous.apk`](./Monochromeous.apk)**

- **Target**: Android 5.0 (API 21) through Android 15 (API 35)
- **Mode**: Fullscreen Landscape with Immersive Sticky Mode
- **Orientation**: Locked Landscape

### How to Install:
1. Download or transfer [`Monochromeous.apk`](./Monochromeous.apk) to your Android phone.
2. Tap the file to install (allow *"Install unknown apps"* if prompted).
3. Launch **Monochromeous** from your app drawer!

---

## 🖥️ Playing on PC / Web Browser

You can play immediately on PC:
1. **Windows 1-Click**: Double-click **`Play-PC.bat`** to instantly launch the game in your default browser.
2. **Direct Browser**: Open **`index.html`** directly in Chrome, Edge, Firefox, or any modern web browser. **`index.html` is completely self-contained** (all styles, Three.js 3D engine, sounds, and game logic are embedded), so it runs anywhere without needing external files or internet.
3. **Optional Local HTTP Server**:
   ```bash
   python -m http.server 8080
   ```
   and navigate to `http://localhost:8080`.

---

## 🛠️ Building the APK from Source

Prerequisites: Android SDK (`platforms/android-35`, `build-tools/36.0.0`) and Java JDK.

Run the automated PowerShell build script:
```powershell
.\build_apk.ps1
```

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](./LICENSE) file for details.
