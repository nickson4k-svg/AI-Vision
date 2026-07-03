# AI Vision (Hardware Classifier)

**Live Demo:** [https://ai-vision-iota.vercel.app/](https://ai-vision-iota.vercel.app/)

A smart image classification app built with React, Vite, TailwindCSS, and Google Teachable Machine. 
This application provides an **Infinite Canvas** where you can drag and drop multiple hardware photos (like Arduino, Raspberry Pi, ESP32) to have them instantly classified using a custom AI model!

## Features

- 🧠 **Custom AI Model:** Powered by Google Teachable Machine (`@teachablemachine/image`).
- ♾️ **Infinite Canvas:** Upload multiple photos and drag them around freely on a virtual canvas using `framer-motion`.
- ✨ **Glassmorphism UI:** Stunning, modern aesthetic featuring backdrop blurs and glowing neon accents.
- 🎯 **Real-time Overlays:** Predictions dynamically float directly over your photos on the canvas.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

*Note: The `--legacy-peer-deps` flag is required because of a known peer dependency conflict between `@teachablemachine/image` and modern versions of `@tensorflow/tfjs`.*
