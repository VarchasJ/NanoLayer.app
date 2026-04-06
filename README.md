# 🌌 NanoLayer: Text Overlay Studio

NanoLayer is a vibe coded project that is a modern, web-based tool for creating beautiful text overlays on images. It combines a sleek user interface with AI-powered features, leveraging the Google Gemini API to generate contextually relevant text and suggest optimal layout positions based on your images.

## ✨ Features

- **🖼️ Image Upload**: Upload any local image to use as a base layer.
- **🤖 AI-Powered Text Generation**: Provide a prompt, and NanoLayer uses Google Gemini (Gemini 2.5 Flash) to write creative text and suggest the best placement (X/Y position and font size) to avoid obscuring key subjects.
- **🎨 Real-time Customization**: 
  - Choose from a wide variety of fonts (Inter, Roboto, Playfair Display, VT323, etc.).
  - Adjust text color and font size.
  - Precisely position text using X and Y sliders.
  - Toggle a background box for better text readability.
- **📥 Instant Download**: Export your final creation directly from the browser.
- **⚡ Fast & Lightweight**: Built with a Node.js backend and vanilla JavaScript frontend.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Custom Retro/Modern Aesthetic), Vanilla JavaScript.
- **Backend**: Node.js, Express.
- **AI Integration**: Google Generative AI SDK (@google/generative-ai).
- **Storage**: Multer for local file handling.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- A Google Gemini API Key (Optional, but required for AI features). You can get one at [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone the repository** (or navigate to the project folder).
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Configuration

To enable the AI features, you need to provide your Gemini API key. You can do this in two ways:

1. **Environment Variable**: Set an environment variable named `GEMINI_API_KEY`.
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   ```
2. **Manual Configuration**: Edit `server.js` and paste your key into the `MANUAL_GEMINI_API_KEY` constant:
   ```javascript
   const MANUAL_GEMINI_API_KEY = "your_api_key_here";
   ```

### Running the App

1. **Start the server**:
   ```bash
   node server.js
   ```
2. **Open the application**:
   Navigate to `http://localhost:8000` in your web browser.

## 📝 Usage Instructions

1. **Upload an Image**: Click the "Choose File" button in the sidebar.
2. **Generate AI Text (Optional)**: 
   - Ensure your API key is configured (look for the 🟢 READY badge).
   - Type a prompt like "A motivational quote about travel" in the AI Prompt box.
   - Click **Generate Text ✨**.
3. **Manual Adjustments**: Use the sliders and dropdowns to fine-tune the font, size, color, and position.
4. **Download**: Once satisfied, click the **Download Image** button to save your work.

## 📂 Project Structure

- `server.js`: Node.js Express server handling file uploads and Gemini API integration.
- `app.js`: Frontend logic for real-time rendering and UI interactions.
- `index.html`: The main structure of the application.
- `style.css`: Custom styling and layout.
- `uploads/`: Temporary storage for uploaded images.

---
*Created with ❤️ for designers and creators.*
