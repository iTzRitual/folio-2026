# Folio 2026

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat&logo=tailwind-css)
![Three.js](https://img.shields.io/badge/Three.js-0.183.2-white?style=flat&logo=three.js)
![React Three Fiber](https://img.shields.io/badge/R3F-9.5.0-purple?style=flat)
![Drei](https://img.shields.io/badge/Drei-10.7.7-purple?style=flat)
![Postprocessing](https://img.shields.io/badge/Postprocessing-3.0.4-purple?style=flat)
![GSAP](https://img.shields.io/badge/GSAP-3.14-green?style=flat)
![Lenis](https://img.shields.io/badge/Lenis-1.3.18-black?style=flat)
![Leva](https://img.shields.io/badge/Leva-0.10.1-orange?style=flat)

My interactive portfolio for 2026. The project breaks standard web development conventions by shifting the UI rendering weight from the classic DOM tree to the WebGL environment, while intentionally maintaining the appearance of a "regular" website.

**[Work in Progress]**

- **Phase 1:** ✅
- **Phase 2:** ⏳

---

## 📖 Context & Vision (Phased Approach)

At first glance, the site looks like a standard, flat website. However, this is a deliberate design choice. The project is divided into two phases:

- **Phase 1 (Current):** Building a "fake" flat UI using WebGL. The entire Hero Section is rendered on a canvas.
- **Phase 2 (Planned):** After scrolling to the _Details_ section, a seamless transition will occur – the camera will zoom out, revealing that the "flat website" was actually a monitor screen in a full, interactive 3D scene of my workstation.

Since the final vision relies heavily on **Three.js** and **React Three Fiber (R3F)**, I decided to build the foundation on this stack right from the start.

---

## 🧠 Case Study: Architecture & Challenges

Creating a DOM-like interface inside a Canvas required an unconventional approach. Here are the key mechanisms and technical decisions used in the project:

### 1. 3D Responsiveness (Hero Safe Zone)

**Problem:** Unlike HTML/CSS, WebGL lacks concepts like `flexbox`, `vw`, `vh`, or `margin`. Resizing the browser window can completely break the 3D scene composition.
**Solution:** I implemented a custom `calculateHeroSafeZone` mechanism and a `HeroLayoutContext`.

- **How it works:** The script calculates target screen proportions (e.g., targeting `16/9`) and dynamically computes margins and a "safe zone" for rendering text within the 3D space. These variables are then mapped from pixels to 3D units, allowing text components (like `HeroText`) to perfectly position themselves regardless of the screen resolution or aspect ratio.

### 2. DOM Accessibility & Selectable 3D Text

**Problem:** Text rendered natively on a WebGL `<canvas>` is purely graphical (just pixels). It completely breaks core web behaviors—it cannot be highlighted, copied, or read by screen readers, which severely degrades User Experience and SEO. <br>
**Solution:** A hybrid WebGL-DOM synchronization approach.

- **How it works:** I wanted the site to feel like a native web experience, not just a video game in a browser. To achieve this, the application renders actual HTML elements in the DOM alongside the 3D scene. While the visual heavy lifting (shaders, materials, 3D space positioning) happens in the Canvas, an interactive HTML layer is perfectly synced with it. This allows users to instinctively click and select the text just like on any standard webpage, bridging the gap between immersive 3D and accessible web design.

### 3. Adaptive Performance (Dynamic DPR Scaling)

**Problem:** Rendering 3D scenes and post-processing can drain battery and lag the browser on weaker devices.
**Solution:** Utilizing the `<PerformanceMonitor>` component for dynamic image quality management.

- **How it works:** The application constantly monitors frames per second (FPS). If performance drops below 45 FPS, the Device Pixel Ratio (DPR) is downgraded on the fly (down to `0.75`). If the framerate recovers to a stable 55+ FPS, the DPR is raised back to `1.5` for visual sharpness. This ensures the app runs smoothly across all devices, prioritizing animation fluidity (60 FPS) over raw resolution.

### 4. Custom Shaders (Custom Aberration)

**Problem:** A flat-looking website built in WebGL needs to offer something "extra" to justify the technology overhead before unlocking Phase 2.
**Solution:** A custom post-processing effect in `CustomAberration.tsx`.

- **How it works:** I wrote a custom shader injected via `@react-three/postprocessing`. It tracks mouse position and **velocity** (`useFrame` and vector calculations). Fast cursor movement triggers smooth chromatic aberration (color splitting) and grid distortion, which then smoothly returns to normal using `MathUtils.lerp` and exponential decay (`Math.exp`).

### 5. Text Entrance Animations

**Context:** To give the initial "flat" UI a premium and dynamic feel upon loading, I needed a sleek way to introduce the typography. <br>
**Solution:** A custom `AnimatedRevealText.tsx` component.

- **How it works:** The smooth, staggered text entrance animations were heavily inspired by the premium typography reveals found on **landonorris.com**. I built a custom component to replicate this fluid motion, ensuring that the initial load animation hooks the user's attention right before they start interacting with the WebGL layer.

### 6. The "Lore" of the Hero Model: Dyntopo to WebGL

**Context:** The focal point of the Hero section—the sculpted head—isn't just a downloaded asset. It is actually the very first 3D model I ever created while learning how to sculpt in Blender. <br>
**The Dilemma:** Because it was my first attempt, I relied heavily on Blender's Dyntopo (Dynamic Topology) tool. While great for artistic freedom, it resulted in an absolute nightmare for web performance—an unoptimized, high-poly mesh with horrific topology and an immense vertex count. It was a complete dealbreaker for a real-time browser experience. <br>
**The Solution & "Happy Accident":**

- I had a decision to make: spend countless hours doing manual retopology (tracing polygons by hand) or find a programmatic shortcut. I opted to use Blender's automated **Remesh modifier**.
- The modifier aggressively rebuilt the geometry, which resulted in a massive reduction in vertices and file size, at the cost of slight detail degradation. However, this created a "happy accident"—the slightly blocky, automated look of the remeshed model actually complemented my custom WebGL shaders perfectly, fitting the overall artistic vision better than a hyper-realistic sculpt.
- Finally, to squeeze out maximum performance for the web, the `.glb` file was heavily compressed using **Draco** encoding.

### 7. Interactive Physics & Materials

**Interactivity:** The model is not static. I implemented a custom interaction system that allows users to **grab, drag, and "throw"** the model. Using velocity calculations and spring physics, the model reacts dynamically to user input before smoothly returning to its original position.
**Visuals:** The model uses a `MeshTransmissionMaterial` to achieve a premium, **translucent glass-like effect**. It features realistic light transmission, refraction (IOR), and thickness, which catches the light as it moves through the 3D space.

<p align="center">
  <img src="https://github.com/user-attachments/assets/e05bc4cf-4e8d-4a8f-834a-ee30e9c861ff" width="49%" alt="Sculpting process wireframe with Dyntopo" />
  <img src="https://github.com/user-attachments/assets/b7ac615c-b99a-4d38-b3e6-4bc6448ac5a5" width="49%" alt="Final optimized and remeshed model render" />
</p>

---

## 🛠️ Running the project locally

```bash
# Clone the repository
git clone https://github.com/iTzRitual/folio-2026.git

# Navigate to the project directory
cd folio-2026

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 🛠️ Developer Tools

You can access the debug mode by navigating to `/debug`. This will enable:

- **Leva GUI:** Real-time control over material and model properties.
- **Stats.js:** Performance monitoring (FPS, MS, MB).

---

## 🕰️ Old Updates

### Project Kickoff

[Work in Progress]

The plan for this project is to quickly build **Phase One**: a minimalist digital CV. Following that, I will develop an **additional 3D layer** as a gimmick - a seamless camera transition pulling back to reveal my workstation as a full 3D scene.

<p align="center">
  <img src="https://github.com/user-attachments/assets/5c4d34bd-8123-4546-909e-428f41391157" width="49%" />
  <img src="https://github.com/user-attachments/assets/422106c5-f4a5-46c5-b65e-692e05ac735d" width="49%" />
</p>

#### Planned Stack

Next.js, React, TypeScript, Tailwind CSS, R3F, Drei, Postprocessing, Leva, GSAP or Motion, Blender.
