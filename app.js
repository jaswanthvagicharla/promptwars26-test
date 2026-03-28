// State and Selectors
const state = {
    apiKey: localStorage.getItem('astraApiKey') || '',
    files: [],
    context: ''
};

// UI Elements
const modal = document.getElementById('settings-modal');
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key-btn');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const filePreviewList = document.getElementById('file-preview-list');
const contextNotes = document.getElementById('context-notes');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingState = document.getElementById('loading-state');
const outputSection = document.getElementById('output-section');
const resetBtn = document.getElementById('reset-btn');
const inputSection = document.getElementById('input-section');
const ttsAudio = document.getElementById('tts-audio');

// Initialization
function init() {
    if (!state.apiKey) {
        modal.classList.remove('hidden-modal');
    }

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('astraApiKey', key);
            state.apiKey = key;
            modal.classList.add('hidden-modal');
        } else {
            alert('Please enter a valid API Key.');
        }
    });

    // File Handlers
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => dropZone.classList.remove('dragover'));
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    contextNotes.addEventListener('input', (e) => {
        state.context = e.target.value;
    });

    analyzeBtn.addEventListener('click', runAnalysis);
    resetBtn.addEventListener('click', resetApp);
}

function handleFiles(filesArray) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 
                        'audio/mp3', 'audio/wav', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/mpeg',
                        'application/pdf', 'text/plain'];
    
    Array.from(filesArray).forEach(file => {
        if (!validTypes.includes(file.type) && !file.type.startsWith('audio/')) {
            alert(`File type not supported: ${file.name}. Please use Images, Audio, or PDFs.`);
            return;
        }
        state.files.push(file);
    });

    renderFileList();
    checkReadyState();
}

function renderFileList() {
    filePreviewList.innerHTML = '';
    state.files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>${file.name}</span>
            <button onclick="removeFile(${index})" aria-label="Remove file">×</button>
        `;
        filePreviewList.appendChild(item);
    });
}

window.removeFile = function(index) {
    state.files.splice(index, 1);
    renderFileList();
    checkReadyState();
}

function checkReadyState() {
    if (state.files.length > 0) {
        analyzeBtn.disabled = false;
    } else {
        analyzeBtn.disabled = true;
    }
}

// Convert File to Base64 (Google Gemini Requirement)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            const base64Content = result.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = error => reject(error);
    });
}

async function runAnalysis() {
    if (!state.apiKey) {
        modal.classList.remove('hidden-modal');
        return;
    }

    inputSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
        const parts = [];
        
        // Add File Parts
        for (const file of state.files) {
            const base64Data = await fileToBase64(file);
            parts.push({
                inline_data: {
                    mime_type: file.type || 'application/octet-stream',
                    data: base64Data
                }
            });
        }

        // Add Text Prompt Prompt
        const promptText = `
SYSTEM INSTRUCTIONS:
You are "Astra Path," the World's First Universal Bridge for Human Potential. Your mission is to take "messy," unstructured data about a child and a family's life and convert it into a clear, life-changing educational roadmap. You serve as a high-level Educational Psychologist, a Financial Advisor, and a Protective Guardian for the child's future.
OBJECTIVE:
1. ANALYZE MESSY INPUTS: Process photos of drawings, report cards, voice notes, and school brochures.
2. DETECT THE "HIDDEN CHILD": Look past grades. Identify hidden skills.
3. VERIFY & PROTECT: Find "Red Flags" (safety issues, hidden fees).
4. SIMPLIFY FOR ACCESSIBILITY: Use NO academic jargon. Assume the parent might be listening rather than reading.

USER CONTEXT NOTES:
${state.context || "No additional context provided."}

Analyze the attached files and output strictly conforming to the requested JSON schema.
        `;
        
        parts.push({ text: promptText });

        const payload = {
            contents: [{ parts: parts }],
            generationConfig: {
                response_mime_type: "application/json",
                // Ensuring structured JSON output
                response_schema: {
                    type: "OBJECT",
                    properties: {
                        child_superpower: { type: "STRING", description: "A 2-word name for what the child is best at" },
                        the_big_picture: { type: "STRING", description: "A 2-sentence explanation of the child's potential in very simple language" },
                        traffic_light_guide: {
                            type: "OBJECT",
                            properties: {
                                green_lights: { type: "ARRAY", items: { type: "STRING" }, description: "3 specific things the child is doing great at" },
                                yellow_flags: { type: "ARRAY", items: { type: "STRING" }, description: "2 things to watch out for or help with" },
                                red_alerts: { type: "ARRAY", items: { type: "STRING" }, description: "Immediate dangers or bad school fits found" },
                            }
                        },
                        top_3_actions: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    step: { type: "STRING", description: "A simple action" },
                                    why: { type: "STRING", description: "The reason why this saves the child's future" },
                                    voice_instruction: { type: "STRING", description: "A short script the parent can play back to hear the instruction clearly" }
                                }
                            }
                        },
                        verification_check: { type: "STRING", description: "One fact you checked to ensure the school/path is safe and honest" }
                    },
                    required: ["child_superpower", "the_big_picture", "traffic_light_guide", "top_3_actions", "verification_check"]
                }
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const parsedResult = JSON.parse(jsonText);
        
        renderOutput(parsedResult);

    } catch (error) {
        console.error(error);
        alert("An error occurred during analysis. Please check your API key and connection.\nDetails: " + error.message);
        loadingState.classList.add('hidden');
        inputSection.classList.remove('hidden');
    }
}

function renderOutput(data) {
    loadingState.classList.add('hidden');
    outputSection.classList.remove('hidden');

    document.getElementById('superpower-text').textContent = data.child_superpower;
    document.getElementById('big-picture-text').textContent = data.the_big_picture;

    // Traffic Lights
    populateList('green-list', data.traffic_light_guide.green_lights || []);
    populateList('yellow-list', data.traffic_light_guide.yellow_flags || []);
    populateList('red-list', data.traffic_light_guide.red_alerts || []);

    // Actions
    const actionsContainer = document.getElementById('actions-list');
    actionsContainer.innerHTML = '';
    
    (data.top_3_actions || []).forEach((action, index) => {
        const card = document.createElement('div');
        card.className = 'action-card';
        card.innerHTML = `
            <div class="action-number">${index + 1}</div>
            <div class="action-content">
                <h3>${action.step}</h3>
                <p><strong>Why:</strong> ${action.why}</p>
                <button class="play-voice-btn" onclick="playVoiceInstruction('${action.voice_instruction.replace(/'/g, "\\'")}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.25rem;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                    </svg>
                    Listen to Instruction
                </button>
            </div>
        `;
        actionsContainer.appendChild(card);
    });

    // Verification
    document.getElementById('verify-text').textContent = data.verification_check;
}

function populateList(elementId, items) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
}

// Web Speech API
window.playVoiceInstruction = function(text) {
    if (!('speechSynthesis' in window)) {
        alert("Sorry, your browser doesn't support text to speech!");
        return;
    }
    
    // Stop any currently playing audio
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a warm, empathetic voice if possible (usually standard system voice is fine, but we can tune pitch/rate)
    utterance.rate = 0.9; // Slightly slower for comprehension
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
}

function resetApp() {
    state.files = [];
    state.context = '';
    contextNotes.value = '';
    renderFileList();
    checkReadyState();
    
    outputSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
