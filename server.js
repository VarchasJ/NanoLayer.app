const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// ---------------------------------------------------------
// CONFIGURATION
// Inject your API keys here before running the server locally.
// CAUTION: Do not commit your real keys to GitHub!
// ---------------------------------------------------------
const MANUAL_GEMINI_API_KEY = ""; // Your Google Gemini API Key

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Setup local file storage for upload to avoid needing MongoDB!
const fsUploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(fsUploadDir)) {
    fs.mkdirSync(fsUploadDir);
}
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// File Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file part in the request' });
    }

    return res.status(201).json({
        message: 'File uploaded successfully locally',
        file_id: req.file.filename,
        url: `/image/${req.file.filename}`
    });
});

// Get Image Route
app.get('/image/:filename', (req, res) => {
    const filePath = path.join(fsUploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File naturally not found or invalid' });
    }
    res.sendFile(filePath);
});

// Status Route
app.get('/status', (req, res) => {
    const key = MANUAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    res.json({ api_key_configured: !!key });
});

// Generate Text Route
app.post('/generate', async (req, res) => {
    const payload = req.body;
    const ai_prompt = payload.ai_prompt;
    const imageUrl = payload.image_url;
    const key = MANUAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let ret_data = { status: "simulated", url: payload.image_url };
    
    if (ai_prompt && key) {
        try {
            console.log("Querying Gemini to generate text from prompt...");
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const prompt = `You are a professional designer providing a sharp, short text overlay for the provided image based on: '${ai_prompt}'. 
Analyze the image composition carefully to ensure you do not cover faces, text, or primary focal subjects!
You must strictly lock the text perfectly onto a 3x3 layout grid:
For x_percent, ONLY choose 20 (left), 50 (center), or 80 (right).
For y_percent, ONLY choose 20 (top), 50 (middle), or 80 (bottom).
For font_size, ONLY choose 40 (small footnote), 80 (standard), or 120 (large hero title).
Respond ONLY with a raw, valid JSON object following this exact schema without any markdown formatting: {"text": "the actual generated text", "x_percent": 50, "y_percent": 80, "font_size": 80}`;
            let parts = [prompt];

            // If we have an image URL hosted locally, read it synchronously
            if (imageUrl && imageUrl.includes('/image/')) {
                console.log("Vision Enabled: Found image payload, streaming into buffer...");
                const filename = imageUrl.split('/image/')[1];
                const filePath = path.join(fsUploadDir, filename);

                // Read from Local FS into buffer
                if (fs.existsSync(filePath)) {
                    const buffer = fs.readFileSync(filePath);
                    parts.push({
                        inlineData: {
                            data: buffer.toString("base64"),
                            mimeType: "image/jpeg" // Generic safe fallback
                        }
                    });
                    console.log("Successfully attached image from logical filesystem to Gemini Vision!");
                }
            }

            const result = await model.generateContent(parts);
            const responseText = result.response.text();
            
            // Extract the generated JSON
            let cleanText = responseText.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.substring(7);
                cleanText = cleanText.substring(0, cleanText.lastIndexOf('```')).trim();
            }
            
            try {
                const parsedJson = JSON.parse(cleanText);
                ret_data.generated_text = parsedJson.text;
                ret_data.x_percent = parsedJson.x_percent;
                ret_data.y_percent = parsedJson.y_percent;
                ret_data.font_size = parsedJson.font_size;
            } catch (jsonErr) {
                console.error("Failed to parse Gemini JSON:", jsonErr);
                ret_data.generated_text = cleanText.replace(/"/g, ''); // Fallback
            }
            
        } catch (e) {
            console.error("Gemini API Error:", e.message);
        }
    } else if (ai_prompt) {
        console.log("AI prompt received but GEMINI_API_KEY environment variable is missing.");
    }
    
    if (payload.generated_text && !ret_data.generated_text) {
        ret_data.generated_text = payload.generated_text;
    }

    return res.status(200).json(ret_data);
});

// Start listening
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`NanoLayer Node.js Backend running on http://localhost:${PORT}`);
});
