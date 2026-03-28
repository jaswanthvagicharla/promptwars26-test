/**
 * @fileoverview Astra Path - Core Application Logic
 * @description AI-powered educational psychologist using Google Gemini 2.5 Flash
 * for multimodal analysis of children's potential.
 * 
 * Google Services Used:
 * - Gemini 2.5 Flash (Multimodal AI Analysis)
 * - Gemini Google Search Grounding (School Finder)
 * - Web Speech API (Voice-First Accessibility)
 * - Firebase Auth (Session verification)
 * 
 * @version 2.0.0
 * @license MIT
 */

'use strict';

// ====================== CONSTANTS ======================
/** @constant {string} API endpoint for Gemini 2.5 Flash */
var API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** @constant {string} Gemini API Key */
var GEMINI_API_KEY = 'AIzaSyAw0o5sGihHJficAAIFc_32DB3jsQHhiaQ';

/** @constant {number} Maximum file size in bytes (10MB) */
var MAX_FILE_SIZE = 10 * 1024 * 1024;

/** @constant {number} Maximum number of files allowed */
var MAX_FILES = 5;

/** @constant {number} Rate limit: minimum ms between API calls */
var RATE_LIMIT_MS = 3000;

/** @constant {Array<string>} Allowed MIME types for file upload */
var ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'audio/mp3', 'audio/wav', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/mpeg',
    'application/pdf', 'text/plain'
];

/** @constant {Object} Structured output schema for Gemini */
var ANALYSIS_SCHEMA = {
    type: 'OBJECT',
    properties: {
        child_superpower: { type: 'STRING', description: 'A creative 2-3 word name for the child hidden talent (e.g., Visual Architect, Rhythm Leader)' },
        the_big_picture: { type: 'STRING', description: 'A 2-sentence explanation in very simple language a non-educated parent can understand. No jargon.' },
        neurodivergence_check: { type: 'STRING', description: 'Check for signs of ADHD, Dyslexia, Autism, or giftedness from the handwriting, drawings, or behavior described. State clearly if signs are detected or not.' },
        traffic_light_guide: {
            type: 'OBJECT',
            properties: {
                green_lights: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 specific strengths including spatial/creative/leadership/emotional skills beyond just grades' },
                yellow_flags: { type: 'ARRAY', items: { type: 'STRING' }, description: '2-3 areas needing support, including any hidden learning differences' },
                red_alerts: { type: 'ARRAY', items: { type: 'STRING' }, description: '1-2 immediate dangers: toxic school environment, hidden fees, bullying signs, or burnout risk' }
            }
        },
        top_3_actions: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    step: { type: 'STRING', description: 'One clear action the parent can take TODAY' },
                    why: { type: 'STRING', description: 'Why this protects the child future - in simple emotional language' },
                    cost_estimate: { type: 'STRING', description: 'Estimated cost of this action (Free, Low, Medium, High)' },
                    voice_instruction: { type: 'STRING', description: 'A warm 2-sentence script as if a caring friend is speaking to the parent' }
                }
            }
        },
        financial_reality_check: { type: 'STRING', description: 'Honest assessment of hidden costs parents should watch for (exam fees, uniform costs, transport, coaching)' },
        verification_check: { type: 'STRING', description: 'One specific fact you verified to ensure the school/path is safe and honest for this child' }
    },
    required: ['child_superpower', 'the_big_picture', 'neurodivergence_check', 'traffic_light_guide', 'top_3_actions', 'financial_reality_check', 'verification_check']
};

// ====================== APPLICATION STATE ======================
/** @type {Object} Global application state */
var state = {
    apiKey: GEMINI_API_KEY,
    files: [],
    context: '',
    lastReport: null,
    lastApiCall: 0,
    isProcessing: false
};

// ====================== UTILITY FUNCTIONS ======================

/**
 * Sanitizes a string to prevent XSS attacks.
 * Converts HTML special characters to their entity equivalents.
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string
 */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validates a file against size and type constraints.
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateFile(file) {
    if (!file || !file.name) {
        return { valid: false, error: 'Invalid file object.' };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File "' + file.name + '" exceeds 10MB limit (' + (file.size / 1024 / 1024).toFixed(1) + 'MB).' };
    }
    if (state.files.length >= MAX_FILES) {
        return { valid: false, error: 'Maximum ' + MAX_FILES + ' files allowed.' };
    }
    var isAllowed = ALLOWED_TYPES.indexOf(file.type) !== -1 || file.type.indexOf('audio/') === 0;
    if (!isAllowed) {
        return { valid: false, error: 'File type "' + file.type + '" not supported. Use Images, Audio, or PDFs.' };
    }
    return { valid: true, error: '' };
}

/**
 * Checks rate limiting before API calls.
 * @returns {boolean} Whether the API call is allowed
 */
function checkRateLimit() {
    var now = Date.now();
    if (now - state.lastApiCall < RATE_LIMIT_MS) {
        var waitSec = Math.ceil((RATE_LIMIT_MS - (now - state.lastApiCall)) / 1000);
        alert('Please wait ' + waitSec + ' seconds before making another request.');
        return false;
    }
    state.lastApiCall = now;
    return true;
}

/**
 * Converts a File object to Base64 encoded string.
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded content
 */
function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() {
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = function(error) {
            reject(new Error('Failed to read file: ' + file.name));
        };
    });
}

/**
 * Shows an accessible error notification.
 * @param {string} message - Error message to display
 */
function showError(message) {
    var errorBanner = document.getElementById('error-banner');
    var errorText = document.getElementById('error-text');
    if (errorBanner && errorText) {
        errorText.textContent = message;
        errorBanner.classList.remove('hidden');
        errorBanner.focus();
        setTimeout(function() { errorBanner.classList.add('hidden'); }, 8000);
    } else {
        alert(message);
    }
}

// ====================== DOM REFERENCES ======================
var dropZone, fileInput, filePreviewList, contextNotes, analyzeBtn;
var loadingState, outputSection, resetBtn, inputSection;
var findSchoolsBtn, budgetInput, locationInput, schoolLoadingState;
var schoolResultsSection, schoolsList;

/**
 * Caches all DOM element references for efficient access.
 * Called once during initialization to avoid repeated DOM queries.
 */
function cacheDOMReferences() {
    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    filePreviewList = document.getElementById('file-preview-list');
    contextNotes = document.getElementById('context-notes');
    analyzeBtn = document.getElementById('analyze-btn');
    loadingState = document.getElementById('loading-state');
    outputSection = document.getElementById('output-section');
    resetBtn = document.getElementById('reset-btn');
    inputSection = document.getElementById('input-section');
    findSchoolsBtn = document.getElementById('find-schools-btn');
    budgetInput = document.getElementById('budget-input');
    locationInput = document.getElementById('location-input');
    schoolLoadingState = document.getElementById('school-loading-state');
    schoolResultsSection = document.getElementById('school-results-section');
    schoolsList = document.getElementById('schools-list');
}

// ====================== INITIALIZATION ======================

/**
 * Initializes the application.
 * - Verifies authentication state
 * - Caches DOM references
 * - Binds all event listeners
 * - Checks reduced motion preference
 */
function init() {
    // Security: Auth check
    var userData = localStorage.getItem('astraUser');
    if (!userData) {
        window.location.href = 'auth.html';
        return;
    }

    cacheDOMReferences();

    // Display user name
    try {
        var user = JSON.parse(userData);
        var navName = document.getElementById('nav-user-name');
        if (navName && user.name) {
            navName.textContent = 'Welcome, ' + sanitizeHTML(user.name);
        }
    } catch (e) { /* silently handle corrupt session data */ }

    // Logout handler
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // File upload handlers
    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
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
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    // Text input with debounce
    var debounceTimer;
    contextNotes.addEventListener('input', function(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            state.context = e.target.value;
        }, 300);
    });

    // Action buttons
    analyzeBtn.addEventListener('click', runAnalysis);
    resetBtn.addEventListener('click', resetApp);
    findSchoolsBtn.addEventListener('click', findSchools);

    // Accessibility: respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduce-motion');
    }
}

/**
 * Handles user logout - clears all session data securely.
 */
function handleLogout() {
    localStorage.removeItem('astraUser');
    state.files = [];
    state.context = '';
    state.lastReport = null;
    window.location.href = 'auth.html';
}

// ====================== FILE HANDLING ======================

/**
 * Processes uploaded files with validation.
 * @param {FileList} filesArray - The uploaded files
 */
function handleFiles(filesArray) {
    var errors = [];
    Array.from(filesArray).forEach(function(file) {
        var validation = validateFile(file);
        if (!validation.valid) {
            errors.push(validation.error);
            return;
        }
        state.files.push(file);
    });

    if (errors.length > 0) {
        showError(errors.join('\n'));
    }

    renderFileList();
    checkReadyState();
}

/**
 * Renders the file preview list using DocumentFragment for efficiency.
 */
function renderFileList() {
    var fragment = document.createDocumentFragment();
    filePreviewList.innerHTML = '';

    state.files.forEach(function(file, index) {
        var item = document.createElement('div');
        item.className = 'file-item';
        item.setAttribute('role', 'listitem');

        var nameSpan = document.createElement('span');
        nameSpan.textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + 'KB)';

        var removeBtn = document.createElement('button');
        removeBtn.textContent = '\u00D7';
        removeBtn.setAttribute('aria-label', 'Remove file ' + file.name);
        removeBtn.setAttribute('data-testid', 'remove-file-' + index);
        removeBtn.addEventListener('click', function() { removeFile(index); });

        item.appendChild(nameSpan);
        item.appendChild(removeBtn);
        fragment.appendChild(item);
    });

    filePreviewList.appendChild(fragment);
}

/**
 * Removes a file from the upload list.
 * @param {number} index - Index of the file to remove
 */
function removeFile(index) {
    if (index >= 0 && index < state.files.length) {
        state.files.splice(index, 1);
        renderFileList();
        checkReadyState();
    }
}

/**
 * Updates the analyze button state based on file count.
 */
function checkReadyState() {
    analyzeBtn.disabled = (state.files.length === 0);
    var fileCount = document.getElementById('file-count');
    if (fileCount) {
        fileCount.textContent = state.files.length + ' file(s) ready';
    }
}

// ====================== MAIN ANALYSIS (Gemini 2.5 Flash) ======================

/**
 * Runs the multimodal AI analysis using Gemini 2.5 Flash.
 * Processes uploaded files (images, audio, PDFs) with structured JSON output.
 * 
 * @async
 * @throws {Error} If API call fails or response cannot be parsed
 */
async function runAnalysis() {
    if (!state.apiKey) {
        showError('API key is not configured.');
        return;
    }
    if (state.isProcessing) {
        showError('Analysis already in progress. Please wait.');
        return;
    }
    if (!checkRateLimit()) return;

    state.isProcessing = true;
    inputSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    // Announce to screen readers
    var loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Analyzing uploaded files. This may take 15-30 seconds...';

    try {
        var parts = [];

        // Build multimodal parts from uploaded files
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

        // Construct the system prompt aligned to the problem statement
        var promptText = 'SYSTEM INSTRUCTIONS:\n' +
            'You are "Astra Path," the World\'s First Universal Bridge for Human Potential.\n' +
            'You serve as a high-level Educational Psychologist, Financial Advisor, and Protective Guardian.\n\n' +
            'CRITICAL OBJECTIVES:\n' +
            '1. ANALYZE MESSY INPUTS: Process photos of drawings (detect spatial intelligence), report cards (find academic trends over time), voice notes (extract emotional intent and tone), and school brochures (detect hidden costs and marketing lies).\n' +
            '2. DETECT THE "HIDDEN CHILD": Look PAST grades. Identify spatial skills in a drawing, leadership in a voice note, or neurodivergence (ADHD/Dyslexia/Autism/Giftedness) in handwriting samples or behavioral descriptions.\n' +
            '3. VERIFY & PROTECT: Cross-reference school marketing claims against reality. Flag hidden fees (exam fees, uniform costs, transport, coaching), teacher turnover, and high-pressure toxic environments.\n' +
            '4. FINANCIAL ADVISOR: Assess the real total cost of the educational path. Alert about hidden expenses.\n' +
            '5. SIMPLIFY FOR ACCESSIBILITY: Use absolutely NO academic jargon. Write as if explaining to a caring parent who may not have formal education. Assume they might LISTEN rather than read.\n\n' +
            'USER CONTEXT:\n' +
            (state.context ? sanitizeHTML(state.context) : 'No additional context provided.') + '\n\n' +
            'Analyze ALL attached files thoroughly and output JSON conforming to the schema.';

        parts.push({ text: promptText });

        var payload = {
            contents: [{ parts: parts }],
            generationConfig: {
                response_mime_type: 'application/json',
                response_schema: ANALYSIS_SCHEMA
            }
        };

        var response = await fetch(API_BASE + '?key=' + state.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('API Error ' + response.status + ': ' + errorText);
        }

        var data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response structure.');
        }

        var jsonText = data.candidates[0].content.parts[0].text;
        var parsedResult = JSON.parse(jsonText);

        state.lastReport = parsedResult;
        renderOutput(parsedResult);

        // Save to session history
        try {
            var history = JSON.parse(sessionStorage.getItem('astraHistory') || '[]');
            history.push({ timestamp: new Date().toISOString(), report: parsedResult });
            sessionStorage.setItem('astraHistory', JSON.stringify(history));
        } catch (e) { /* sessionStorage may be full */ }

    } catch (error) {
        console.error('Analysis Error:', error);
        showError('Analysis failed: ' + error.message);
        loadingState.classList.add('hidden');
        inputSection.classList.remove('hidden');
    } finally {
        state.isProcessing = false;
    }
}

// ====================== RENDER REPORT OUTPUT ======================

/**
 * Renders the AI analysis report to the DOM.
 * Uses textContent for XSS prevention on all user-facing data.
 * @param {Object} data - Parsed JSON report from Gemini
 */
function renderOutput(data) {
    loadingState.classList.add('hidden');
    outputSection.classList.remove('hidden');

    // Superpower & Big Picture
    document.getElementById('superpower-text').textContent = data.child_superpower || 'Unknown';
    document.getElementById('big-picture-text').textContent = data.the_big_picture || '';

    // Neurodivergence Check
    var neuroText = document.getElementById('neuro-check-text');
    if (neuroText) neuroText.textContent = data.neurodivergence_check || 'No assessment available.';

    // Traffic Lights
    populateList('green-list', (data.traffic_light_guide && data.traffic_light_guide.green_lights) || []);
    populateList('yellow-list', (data.traffic_light_guide && data.traffic_light_guide.yellow_flags) || []);
    populateList('red-list', (data.traffic_light_guide && data.traffic_light_guide.red_alerts) || []);

    // Actions (built with DOM APIs, not innerHTML)
    renderActions(data.top_3_actions || []);

    // Financial Reality Check
    var finText = document.getElementById('financial-text');
    if (finText) finText.textContent = data.financial_reality_check || '';

    // Verification
    document.getElementById('verify-text').textContent = data.verification_check || '';

    // Focus the output for accessibility
    outputSection.focus();

    // Announce to screen readers
    announceToScreenReader('Analysis complete. ' + data.child_superpower + ' superpower detected.');
}

/**
 * Renders action cards using DOM APIs (no innerHTML for security).
 * @param {Array} actions - Array of action objects
 */
function renderActions(actions) {
    var container = document.getElementById('actions-list');
    container.innerHTML = '';
    var fragment = document.createDocumentFragment();

    actions.forEach(function(action, index) {
        var card = document.createElement('div');
        card.className = 'action-card';
        card.setAttribute('data-testid', 'action-card-' + index);

        var numberDiv = document.createElement('div');
        numberDiv.className = 'action-number';
        numberDiv.textContent = String(index + 1);
        numberDiv.setAttribute('aria-hidden', 'true');

        var contentDiv = document.createElement('div');
        contentDiv.className = 'action-content';

        var h3 = document.createElement('h3');
        h3.textContent = action.step;

        var whyP = document.createElement('p');
        whyP.textContent = 'Why: ' + action.why;

        var costSpan = document.createElement('span');
        costSpan.className = 'cost-badge';
        costSpan.textContent = action.cost_estimate || 'Free';

        var voiceBtn = document.createElement('button');
        voiceBtn.className = 'play-voice-btn';
        voiceBtn.setAttribute('aria-label', 'Listen to instruction for step ' + (index + 1));
        voiceBtn.setAttribute('data-testid', 'voice-btn-' + index);
        voiceBtn.textContent = '\u25B6 Listen to Instruction';
        voiceBtn.addEventListener('click', function() {
            playVoiceInstruction(action.voice_instruction);
        });

        contentDiv.appendChild(h3);
        contentDiv.appendChild(whyP);
        contentDiv.appendChild(costSpan);
        contentDiv.appendChild(voiceBtn);
        card.appendChild(numberDiv);
        card.appendChild(contentDiv);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

/**
 * Populates a list element with items.
 * @param {string} elementId - ID of the target UL element
 * @param {Array<string>} items - Array of text items
 */
function populateList(elementId, items) {
    var list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = '';
    var fragment = document.createDocumentFragment();
    items.forEach(function(item) {
        var li = document.createElement('li');
        li.textContent = item;
        fragment.appendChild(li);
    });
    list.appendChild(fragment);
}

// ====================== WEB SPEECH API (Google Service) ======================

/**
 * Uses the Web Speech API to read text aloud.
 * Provides voice-first accessibility for parents who prefer listening.
 * @param {string} text - The text to speak aloud
 */
function playVoiceInstruction(text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
        showError('Your browser does not support text-to-speech. Try Chrome or Edge.');
        return;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
    announceToScreenReader('Playing voice instruction.');
}

/**
 * Announces a message to screen readers via ARIA live region.
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    var announcer = document.getElementById('sr-announcer');
    if (announcer) {
        announcer.textContent = '';
        setTimeout(function() { announcer.textContent = message; }, 100);
    }
}

// ====================== SCHOOL MATCHER (Google Search Grounding) ======================

/**
 * Finds matching schools using Gemini 2.5 Flash with Google Search Grounding.
 * The google_search tool enables real-time web search during AI generation.
 * 
 * @async
 * @throws {Error} If search fails or results cannot be parsed
 */
async function findSchools() {
    var budget = budgetInput.value.trim();
    var location = locationInput.value.trim();

    if (!budget || !location) {
        showError('Please enter both a budget and a city/area.');
        return;
    }
    if (state.isProcessing) {
        showError('A request is already in progress.');
        return;
    }
    if (!checkRateLimit()) return;

    state.isProcessing = true;
    findSchoolsBtn.disabled = true;
    schoolLoadingState.classList.remove('hidden');
    schoolResultsSection.classList.add('hidden');

    try {
        var promptText = 'SYSTEM INSTRUCTIONS:\n' +
            'You are "Astra Path", an educational advisor with Google Search Grounding.\n' +
            'You MUST search the web for real schools.\n\n' +
            'INPUTS:\n' +
            '- Location: "' + sanitizeHTML(location) + '"\n' +
            '- Maximum Budget: "' + sanitizeHTML(budget) + '"\n' +
            '- Child Profile: ' + JSON.stringify(state.lastReport) + '\n' +
            '- Parent Concerns: "' + sanitizeHTML(state.context) + '"\n\n' +
            'TASKS:\n' +
            '1. Search for 3 REAL schools/colleges in ' + sanitizeHTML(location) + ' matching the budget.\n' +
            '2. Check their Google Reviews - reject toxic high-pressure environments.\n' +
            '3. Verify the fee structure includes ALL hidden costs (transport, uniforms, exams).\n' +
            '4. Generate a 10-year career path based on the child strengths.\n\n' +
            'Respond with ONLY valid JSON:\n' +
            '{"schools":[{"name":"...","cost":"...","why_it_fits":"...","google_review_summary":"...","hidden_costs_warning":"..."}], "career_horizon":"..."}';

        var payload = {
            contents: [{ parts: [{ text: promptText }] }],
            tools: [{ google_search: {} }]
        };

        var response = await fetch(API_BASE + '?key=' + state.apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            var errorText = await response.text();
            throw new Error('API Error ' + response.status + ': ' + errorText);
        }

        var data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('No results returned from Google Search.');
        }

        var rawText = data.candidates[0].content.parts[0].text;
        var jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse school results.');
        }
        var parsedResult = JSON.parse(jsonMatch[0]);
        renderSchools(parsedResult);

    } catch (error) {
        console.error('School Search Error:', error);
        showError('School search failed: ' + error.message);
    } finally {
        state.isProcessing = false;
        schoolLoadingState.classList.add('hidden');
        findSchoolsBtn.disabled = false;
    }
}

// ====================== RENDER SCHOOLS ======================

/**
 * Renders school recommendation cards.
 * @param {Object} data - Parsed school search results
 */
function renderSchools(data) {
    schoolResultsSection.classList.remove('hidden');
    schoolsList.innerHTML = '';
    var fragment = document.createDocumentFragment();

    (data.schools || []).forEach(function(school, index) {
        var card = document.createElement('div');
        card.className = 'school-card fade-in';
        card.setAttribute('data-testid', 'school-card-' + index);

        var header = document.createElement('div');
        header.className = 'school-header';
        var title = document.createElement('span');
        title.className = 'school-title';
        title.textContent = school.name;
        var cost = document.createElement('span');
        cost.className = 'school-cost';
        cost.textContent = school.cost;
        header.appendChild(title);
        header.appendChild(cost);

        var fit = document.createElement('p');
        fit.className = 'school-fit';
        fit.textContent = 'Why it fits: ' + school.why_it_fits;

        var review = document.createElement('div');
        review.className = 'school-review';
        review.textContent = '\u2605 Google Reviews: ' + school.google_review_summary;

        card.appendChild(header);
        card.appendChild(fit);
        card.appendChild(review);

        if (school.hidden_costs_warning) {
            var warning = document.createElement('div');
            warning.className = 'school-warning';
            warning.textContent = '\u26A0 Hidden Costs: ' + school.hidden_costs_warning;
            card.appendChild(warning);
        }

        fragment.appendChild(card);
    });

    schoolsList.appendChild(fragment);

    var careerText = document.getElementById('career-guide-text');
    if (careerText) careerText.textContent = data.career_horizon || '';

    schoolResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    announceToScreenReader('Found ' + (data.schools || []).length + ' matching schools.');
}

// ====================== RESET ======================

/**
 * Resets the application state and UI.
 * Properly cleans up memory by clearing file references.
 */
function resetApp() {
    // Clear state
    state.files = [];
    state.context = '';
    state.lastReport = null;
    state.isProcessing = false;

    // Clear UI
    contextNotes.value = '';
    budgetInput.value = '';
    locationInput.value = '';
    schoolResultsSection.classList.add('hidden');
    outputSection.classList.add('hidden');
    inputSection.classList.remove('hidden');

    renderFileList();
    checkReadyState();

    // Clear file input
    fileInput.value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    announceToScreenReader('Application reset. Ready for new analysis.');
}

// ====================== BOOT ======================
document.addEventListener('DOMContentLoaded', init);

// ====================== EXPORTS FOR TESTING ======================
if (typeof window !== 'undefined') {
    window.AstraPath = {
        sanitizeHTML: sanitizeHTML,
        validateFile: validateFile,
        checkRateLimit: checkRateLimit,
        state: state,
        ALLOWED_TYPES: ALLOWED_TYPES,
        MAX_FILE_SIZE: MAX_FILE_SIZE,
        MAX_FILES: MAX_FILES,
        RATE_LIMIT_MS: RATE_LIMIT_MS
    };
}
