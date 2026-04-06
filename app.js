document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUploadInput = document.getElementById('image-upload');
    const aiPromptInput = document.getElementById('ai-prompt');
    const generateAiBtn = document.getElementById('generate-ai-btn');
    const fontFamilyInput = document.getElementById('font-family');
    const overlayTextInput = document.getElementById('overlay-text');
    const posXInput = document.getElementById('pos-x');
    const posYInput = document.getElementById('pos-y');
    const fontSizeInput = document.getElementById('font-size');
    const colorInput = document.getElementById('text-color');
    const boxTextInput = document.getElementById('box-text');
    const downloadBtn = document.getElementById('download-btn');
    const apiStatusBadge = document.getElementById('api-status-badge');
    
    const xVal = document.getElementById('x-val');
    const yVal = document.getElementById('y-val');
    const sizeVal = document.getElementById('size-val');
    
    const resultImage = document.getElementById('result-image');
    const loadingOverlay = document.getElementById('loading');
    const statusMessage = document.getElementById('status-message');

    // Check API availability
    if (apiStatusBadge) {
        fetch('http://localhost:8000/status')
            .then(res => res.json())
            .then(data => {
                if (data.api_key_configured) {
                    apiStatusBadge.textContent = "🟢 READY";
                } else {
                    apiStatusBadge.textContent = "🔴 NO KEY";
                }
            })
            .catch(() => {
                apiStatusBadge.textContent = "⚠️ ERROR";
            });
    }

    // Display update helpers
    posXInput.addEventListener('input', (e) => xVal.textContent = e.target.value);
    posYInput.addEventListener('input', (e) => yVal.textContent = e.target.value);
    fontSizeInput.addEventListener('input', (e) => sizeVal.textContent = e.target.value);

    // Attach listeners to trigger local rendering on any iteration
    const inputs = [fontFamilyInput, overlayTextInput, posXInput, posYInput, fontSizeInput, colorInput, boxTextInput];
    inputs.forEach(input => {
        if (input) input.addEventListener('input', requestOverlayImage);
    });

    // Trigger API generation specifically for the AI text
    if (generateAiBtn) {
        generateAiBtn.addEventListener('click', async () => {
            const prompt = aiPromptInput.value.trim();
            if (!prompt) return;
            
            generateAiBtn.textContent = "Writing...";
            generateAiBtn.disabled = true;

            try {
                // Request generated text from backend
                const response = await fetch('http://localhost:8000/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ai_prompt: prompt, image_url: baseImageUrl })
                });
                const data = await response.json();
                if (data.generated_text) {
                    overlayTextInput.value = data.generated_text;
                    
                    // Parse layout suggestions from AI if available
                    if (data.x_percent !== undefined) {
                        posXInput.value = data.x_percent;
                        xVal.textContent = data.x_percent;
                    }
                    if (data.y_percent !== undefined) {
                        posYInput.value = data.y_percent;
                        yVal.textContent = data.y_percent;
                    }
                    if (data.font_size !== undefined) {
                        fontSizeInput.value = data.font_size;
                        sizeVal.textContent = data.font_size;
                    }
                    
                    requestOverlayImage(); // trigger main visual rebuild
                } else {
                    alert("No Gemini API key specified in server.py! Add it to enable AI processing!");
                }
            } catch (err) {
                console.error("AI Error:", err);
            } finally {
                generateAiBtn.textContent = "Generate Text ✨";
                generateAiBtn.disabled = false;
            }
        });
    }

    imageUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        loadingOverlay.classList.add('active');
        statusMessage.textContent = 'Uploading to MongoDB GridFS...';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed with status ' + response.status);
            }
            
            const data = await response.json();
            baseImageUrl = 'http://localhost:8000' + data.url;
            
            // Trigger re-render internally
            requestOverlayImage();
            
        } catch (error) {
            console.error('File Upload Error:', error);
            statusMessage.textContent = 'Upload Failed: ' + error.message;
            statusMessage.style.color = '#ef4444';
            loadingOverlay.classList.remove('active');
            setTimeout(() => { statusMessage.style.color = 'var(--text-secondary)'; }, 3000);
        }
    });

    /**
     * Main function that implements real-time visual canvas rendering.
     */
    async function requestOverlayImage() {
        if (!baseImageUrl) {
            statusMessage.textContent = 'Please upload a base image first.';
            return;
        }
        
        const text = overlayTextInput.value.trim();
        
        if (!text) {
            statusMessage.textContent = 'Please provide text for the overlay.';
            return;
        }

        const payload = {
            image_url: baseImageUrl,
            text_overlays: [{
                text: text,
                x_percent: parseInt(posXInput.value, 10),
                y_percent: parseInt(posYInput.value, 10),
                font_size: parseInt(fontSizeInput.value, 10),
                font_family: fontFamilyInput.value,
                color: colorInput.value,
                boxed: boxTextInput ? boxTextInput.checked : false
            }]
        };

        try {
            const finalImageUrl = await simulateNanoLayerApi(payload);

            if (finalImageUrl) {
                resultImage.src = finalImageUrl;
                resultImage.onload = () => {
                    loadingOverlay.classList.remove('active');
                    statusMessage.textContent = 'Ready to overlay...';
                    downloadBtn.disabled = false;
                };
            }
        } catch (error) {
            console.error('Image Generation Error:', error);
            loadingOverlay.classList.remove('active');
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.style.color = '#ef4444'; // Red error text
            setTimeout(() => { statusMessage.style.color = 'var(--text-secondary)'; }, 3000);
            downloadBtn.disabled = true;
        }
    }

    /**
     * Fallback local logic that mimics what the NanoBanana API would do,
     * so that the UI can be tested without a backend.
     */
    function simulateNanoLayerApi(payload) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = payload.image_url;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw base image
                ctx.drawImage(img, 0, 0);
                
                // Draw texts
                payload.text_overlays.forEach(overlay => {
                    const xLoc = (overlay.x_percent / 100) * canvas.width;
                    const yLoc = (overlay.y_percent / 100) * canvas.height;
                    
                    const family = overlay.font_family || 'Inter';
                    ctx.font = `bold ${overlay.font_size}px "${family}", sans-serif`;
                    // Snap all multiline text to exactly the same left-aligned X position
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    
                    // Handle multi-line support
                    const lines = overlay.text.split('\n');
                    const lineHeight = overlay.font_size * 1.2;
                    const startY = yLoc - ((lines.length - 1) * lineHeight) / 2;

                    // Draw Bounding Box logic if requested
                    if (overlay.boxed) {
                        let maxW = 0;
                        lines.forEach(line => {
                            const tmpW = ctx.measureText(line).width;
                            if (tmpW > maxW) maxW = tmpW;
                        });
                        const padding = overlay.font_size * 0.5;
                        const boxW = maxW + padding * 2;
                        const boxH = (lines.length * lineHeight) + padding * 2 - (overlay.font_size * 0.2);
                        
                        // Align the bounding box mathematically to the newly left-aligned text edge
                        const rectX = xLoc - padding;
                        // textBaseline = middle, top edge is approximated
                        const rectY = startY - overlay.font_size * 0.5 - padding + (overlay.font_size * 0.1);
                        
                        ctx.shadowColor = "rgba(0,0,0,1)";
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 8;
                        ctx.shadowOffsetY = 8;
                        
                        // Solid contrast background
                        ctx.fillStyle = (overlay.color === '#000000' || overlay.color.toLowerCase() === '#000') ? '#ffffff' : '#000000';
                        ctx.fillRect(rectX, rectY, boxW, boxH);
                        
                        // Sharp inner border wrapping
                        ctx.strokeStyle = overlay.color;
                        ctx.lineWidth = Math.max(2, overlay.font_size * 0.05);
                        ctx.strokeRect(rectX, rectY, boxW, boxH);
                        
                        // Reset Shadow so text is perfectly crisp inside box
                        ctx.shadowColor = "transparent";
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                    } else {
                        // Standard drop-shadow for legibility over bare image pixels
                        ctx.shadowColor = "rgba(0,0,0,0.8)";
                        ctx.shadowBlur = 10;
                        ctx.shadowOffsetX = 2;
                        ctx.shadowOffsetY = 2;
                    }
                    
                    ctx.fillStyle = overlay.color;
                    
                    lines.forEach((line, index) => {
                        ctx.fillText(line, xLoc, startY + (index * lineHeight));
                    });
                });
                
                // Return rendered frame locally
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            
            img.onerror = () => {
                reject(new Error("CORS or Image Load Error. For testing, choose an image that allows cross-origin requests."));
            };
        });
    }

    // Download handlers
    downloadBtn.addEventListener('click', () => {
        if (!resultImage.src) return;
        
        const a = document.createElement('a');
        a.href = resultImage.src;
        a.download = 'nanolayer-overlay.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Initial call
    requestOverlayImage();
});
