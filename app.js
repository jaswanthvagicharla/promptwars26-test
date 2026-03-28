// ====================== STATE ======================
var GEMINI_API_KEY = 'AIzaSyAw0o5sGihHJficAAIFc_32DB3jsQHhiaQ';
var state = {
    apiKey: GEMINI_API_KEY,
    files: [],
    context: '',
    lastReport: null
};

// ====================== DOM REFERENCES ======================
// Modal removed - API key is hardcoded
var dropZone = document.getElementById('drop-zone');
var fileInput = document.getElementById('file-input');
var filePreviewList = document.getElementById('file-preview-list');
var contextNotes = document.getElementById('context-notes');
var analyzeBtn = document.getElementById('analyze-btn');
var loadingState = document.getElementById('loading-state');
var outputSection = document.getElementById('output-section');
var resetBtn = document.getElementById('reset-btn');
var inputSection = document.getElementById('input-section');
var findSchoolsBtn = document.getElementById('find-schools-btn');
var budgetInput = document.getElementById('budget-input');
var locationInput = document.getElementById('location-input');
var schoolLoadingState = document.getElementById('school-loading-state');
var schoolResultsSection = document.getElementById('school-results-section');
var schoolsList = document.getElementById('schools-list');

// ====================== INITIALIZATION ======================
function init() {
    // Auth check: redirect to auth.html if not logged in
    var userData = localStorage.getItem('astraUser');
    if (!userData) {
        window.location.href = 'auth.html';
        return;
    }

    // Show user name in navbar
    try {
        var user = JSON.parse(userData);
        var navName = document.getElementById('nav-user-name');
        if (navName && user.name) {
            navName.textContent = 'Welcome, ' + user.name;
        }
    } catch (e) { /* ignore parse errors */ }

    // Logout handler
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('astraUser');
            localStorage.removeItem('astraApiKey');
            window.location.href = 'auth.html';
        });
    }

    // API key is hardcoded - no modal needed

    // File Handlers
    dropZone.addEventListener('click', function() { fileInput.click(); });

    fileInput.addEventListener('change', function(e) { handleFiles(e.target.files); });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('dragend', function() { dropZone.classList.remove('dragover'); });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    contextNotes.addEventListener('input', function(e) {
        state.context = e.target.value;
    });

    analyzeBtn.addEventListener('click', runAnalysis);
    resetBtn.addEventListener('click', resetApp);
    findSchoolsBtn.addEventListener('click', findSchools);
}

// ====================== FILE HANDLING ======================
function handleFiles(filesArray) {
    var validTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
        'audio/mp3', 'audio/wav', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/mpeg',
        'application/pdf', 'text/plain'
    ];

    Array.from(filesArray).forEach(function(file) {
        if (validTypes.indexOf(file.type) === -1 && file.type.indexOf('audio/') !== 0) {
            alert('File type not supported: ' + file.name + '. Please use Images, Audio, or PDFs.');
            return;
        }
        state.files.push(file);
    });

    renderFileList();
    checkReadyState();
}

function renderFileList() {
    filePreviewList.innerHTML = '';
    state.files.forEach(function(file, index) {
        var item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = '<span>' + file.name + '</span><button onclick="removeFile(' + index + ')" aria-label="Remove file">&times;</button>';
        filePreviewList.appendChild(item);
    });
}

function removeFile(index) {
    state.files.splice(index, 1);
    renderFileList();
    checkReadyState();
}

function checkReadyState() {
    analyzeBtn.disabled = (state.files.length === 0);
}

// ====================== FILE TO BASE64 ======================
function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() {
            var result = reader.result;
            var base64Content = result.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = function(error) { reject(error); };
    });
}

// ====================== MAIN ANALYSIS ======================
async function runAnalysis() {
    if (!state.apiKey) {
        modal.classList.remove('hidden-modal');
        return;
    }

    inputSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
        var parts = [];

        // Add File Parts
        for (var i = 0; i < state.files.length; i++) {
            var file = state.files[i];
            var base64Data = await fileToBase64(file);
            parts.push({
                inline_data: {
                    mime_type: file.type || 'application/octet-stream',
                    data: base64Data
                }
            });
        }

        // Add Text Prompt
        var promptText = 'SYSTEM INSTRUCTIONS:\n' +
            'You are "Astra Path," the World\'s First Universal Bridge for Human Potential. ' +
            'Your mission is to take "messy," unstructured data about a child and a family\'s life ' +
            'and convert it into a clear, life-changing educational roadmap. You serve as a high-level ' +
            'Educational Psychologist, a Financial Advisor, and a Protective Guardian for the child\'s future.\n' +
            'OBJECTIVE:\n' +
            '1. ANALYZE MESSY INPUTS: Process photos of drawings, report cards, voice notes, and school brochures.\n' +
            '2. DETECT THE "HIDDEN CHILD": Look past grades. Identify hidden skills.\n' +
            '3. VERIFY & PROTECT: Find "Red Flags" (safety issues, hidden fees).\n' +
            '4. SIMPLIFY FOR ACCESSIBILITY: Use NO academic jargon. Assume the parent might be listening rather than reading.\n\n' +
            'USER CONTEXT NOTES:\n' +
            (state.context || 'No additional context provided.') + '\n\n' +
            'Analyze the attached files and output strictly conforming to the requested JSON schema.';

        parts.push({ text: promptText });

        var payload = {
            contents: [{ parts: parts }],
            generationConfig: {
                response_mime_type: 'application/json',
                response_schema: {
                    type: 'OBJECT',
                    properties: {
                        child_superpower: { type: 'STRING', description: 'A 2-word name for what the child is best at' },
                        the_big_picture: { type: 'STRING', description: 'A 2-sentence explanation of the child potential in very simple language' },
                        traffic_light_guide: {
                            type: 'OBJECT',
                            properties: {
                                green_lights: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 specific things the child is doing great at' },
                                yellow_flags: { type: 'ARRAY', items: { type: 'STRING' }, description: '2 things to watch out for or help with' },
                                red_alerts: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Immediate dangers or bad school fits found' }
                            }
                        },
                        top_3_actions: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    step: { type: 'STRING', description: 'A simple action' },
                                    why: { type: 'STRING', description: 'The reason why this saves the child future' },
                                    voice_instruction: { type: 'STRING', description: 'A short script the parent can play back to hear the instruction clearly' }
                                }
                            }
                        },
                        verification_check: { type: 'STRING', description: 'One fact you checked to ensure the school/path is safe and honest' }
                    },
                    required: ['child_superpower', 'the_big_picture', 'traffic_light_guide', 'top_3_actions', 'verification_check']
                }
            }
        };

        var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + state.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('API Error ' + response.status + ': ' + errorText);
        }

        var data = await response.json();
        var jsonText = data.candidates[0].content.parts[0].text;
        var parsedResult = JSON.parse(jsonText);

        state.lastReport = parsedResult;
        renderOutput(parsedResult);

    } catch (error) {
        console.error(error);
        alert('An error occurred during analysis. Please check your API key and connection.\nDetails: ' + error.message);
        loadingState.classList.add('hidden');
        inputSection.classList.remove('hidden');
    }
}

// ====================== RENDER REPORT OUTPUT ======================
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
    var actionsContainer = document.getElementById('actions-list');
    actionsContainer.innerHTML = '';

    (data.top_3_actions || []).forEach(function(action, index) {
        var card = document.createElement('div');
        card.className = 'action-card';

        var numberDiv = document.createElement('div');
        numberDiv.className = 'action-number';
        numberDiv.textContent = (index + 1).toString();

        var contentDiv = document.createElement('div');
        contentDiv.className = 'action-content';

        var h3 = document.createElement('h3');
        h3.textContent = action.step;

        var p = document.createElement('p');
        p.innerHTML = '<strong>Why:</strong> ' + action.why;

        var btn = document.createElement('button');
        btn.className = 'play-voice-btn';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.25rem;"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg> Listen to Instruction';
        btn.setAttribute('data-voice', action.voice_instruction);
        btn.addEventListener('click', function() {
            playVoiceInstruction(this.getAttribute('data-voice'));
        });

        contentDiv.appendChild(h3);
        contentDiv.appendChild(p);
        contentDiv.appendChild(btn);
        card.appendChild(numberDiv);
        card.appendChild(contentDiv);
        actionsContainer.appendChild(card);
    });

    // Verification
    document.getElementById('verify-text').textContent = data.verification_check;
}

function populateList(elementId, items) {
    var list = document.getElementById(elementId);
    list.innerHTML = '';
    items.forEach(function(item) {
        var li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
}

// ====================== WEB SPEECH API ======================
function playVoiceInstruction(text) {
    if (!('speechSynthesis' in window)) {
        alert("Sorry, your browser doesn't support text to speech!");
        return;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

// ====================== SCHOOL MATCHER ======================
async function findSchools() {
    var budget = budgetInput.value.trim();
    var location = locationInput.value.trim();

    if (!budget || !location) {
        alert('Please enter a budget and a city/area to search.');
        return;
    }

    findSchoolsBtn.disabled = true;
    schoolLoadingState.classList.remove('hidden');
    schoolResultsSection.classList.add('hidden');

    try {
        var promptText = 'SYSTEM INSTRUCTIONS:\n' +
            'You are "Astra Path", an educational advisor. You have a critical tool: Google Search Grounding. ' +
            'You MUST use Google Search to find real schools.\n' +
            'The parent needs schools for their child in this location: "' + location + '".\n' +
            'The maximum budget is: "' + budget + '".\n' +
            'The child superpower profile is: ' + JSON.stringify(state.lastReport) + '.\n' +
            'The parent original contextual concerns: "' + state.context + '".\n\n' +
            'TASKS:\n' +
            '1. Search the web for 3 real schools/colleges in or near ' + location + ' that fit the child superpower and are within or close to the budget.\n' +
            '2. Read their Google Reviews/Reputation to ensure they are not toxic high-pressure factories.\n' +
            '3. Suggest a 10-year career horizon based on these traits.\n\n' +
            'You MUST respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:\n' +
            '{\n' +
            '  "schools": [\n' +
            '    { "name": "School Name", "cost": "Estimated fees", "why_it_fits": "Why this school matches the child", "google_review_summary": "What real parents say in reviews" }\n' +
            '  ],\n' +
            '  "career_horizon": "A specific 10-year career trajectory paragraph"\n' +
            '}';

        var payload = {
            contents: [{ parts: [{ text: promptText }] }],
            tools: [{ google_search: {} }]
        };

        var response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + state.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('API Error ' + response.status + ': ' + errorText);
        }

        var data = await response.json();
        var rawText = data.candidates[0].content.parts[0].text;
        // Extract JSON from possibly markdown-wrapped response
        var jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse school results from AI response.');
        }
        var parsedResult = JSON.parse(jsonMatch[0]);

        renderSchools(parsedResult);
    } catch (error) {
        console.error(error);
        alert('Failed to find schools: ' + error.message);
    } finally {
        schoolLoadingState.classList.add('hidden');
        findSchoolsBtn.disabled = false;
    }
}

// ====================== RENDER SCHOOLS ======================
function renderSchools(data) {
    schoolResultsSection.classList.remove('hidden');
    schoolsList.innerHTML = '';

    (data.schools || []).forEach(function(school) {
        var card = document.createElement('div');
        card.className = 'school-card fade-in';

        var headerDiv = document.createElement('div');
        headerDiv.className = 'school-header';
        headerDiv.innerHTML = '<span class="school-title">' + school.name + '</span><span class="school-cost">' + school.cost + '</span>';

        var fitP = document.createElement('p');
        fitP.style.marginBottom = '0.75rem';
        fitP.innerHTML = '<strong>Why it fits:</strong> ' + school.why_it_fits;

        var reviewDiv = document.createElement('div');
        reviewDiv.className = 'school-review';
        reviewDiv.innerHTML = '<div class="school-review-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><span><strong>Google Reviews:</strong> ' + school.google_review_summary + '</span>';

        card.appendChild(headerDiv);
        card.appendChild(fitP);
        card.appendChild(reviewDiv);
        schoolsList.appendChild(card);
    });

    document.getElementById('career-guide-text').textContent = data.career_horizon;

    // Smooth scroll to results
    schoolResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ====================== RESET ======================
function resetApp() {
    state.files = [];
    state.context = '';
    state.lastReport = null;
    contextNotes.value = '';
    budgetInput.value = '';
    locationInput.value = '';
    schoolResultsSection.classList.add('hidden');
    renderFileList();
    checkReadyState();

    outputSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====================== BOOT ======================
document.addEventListener('DOMContentLoaded', init);
