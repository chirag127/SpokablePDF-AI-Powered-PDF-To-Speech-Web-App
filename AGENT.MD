You are an expert system/agent whose task is to build a full, production-ready, maintainable, beautiful single-page + multipage static website (HTML, CSS, JavaScript only) named
"Convert to Readable Spokable PDF". Follow these exact requirements and design goals precisely — do not remove or omit any instruction below. Produce all deliverables as described (project file layout, multiple HTML/JS/CSS files, and a single bundled index.html output option). The user will run this on a low-cost static host; do not require server-side components. Use only browser APIs (FileReader, IndexedDB, Web APIs, fetch to Google AI Studio REST endpoints). Use LocalStorage/IndexedDB for persistence as specified.

GOAL
- Build a website that converts an input PDF (already contains selectable text — no OCR required) into a new "Readable Spokable PDF" optimized for TTS consumption.
- Extract text from the PDF, transform technical elements (code blocks, tables, figures, math, lists) into natural, spoken-friendly English, and produce a new PDF with the transformed text ready to feed into a text-to-speech app (e.g., Moon+ Reader Pro).
- The output must be human-listenable: code examples must be converted into descriptive explanations (not spoken code verbatim); tables must be converted into narrative sentences; figures/images must be described; math notation must be turned into spoken form (e.g., x² -> "x squared").
- The website must support figures and images by sending images (when available) to Gemini multimodal endpoints as part of the transformation process.

BROWSER-ONLY STACK & DEPLOYMENT
- Use only HTML, CSS, and JavaScript (no server). The final deliverable must include an option to export a single index.html bundle that contains the whole app (or an easy-to-serve multi-file app).
- Use fetch() against the Gemini REST API endpoints (Google AI Studio / Generative Language REST) — do not rely on any server-side SDK or third-party node libraries.
- Authentication: the user will paste their Google AI Studio / Gemini API key inside the website (in Settings). All API calls must include the header `x-goog-api-key: <API_KEY>`. Store the API key only in LocalStorage (with an option to clear it); optionally allow the user to supply a backup key for failover. Do not send the API key off the user's browser.
- Use IndexedDB (via an abstraction layer or vanilla IndexedDB API) to store uploaded PDFs and intermediate data (batches, transformed text, partial PDF outputs). Provide clear UI for stored items and safekeeping.

FILE UPLOAD & PROCESS FLOW
- Provide a drag-and-drop file box and a file-select button. Show file metadata immediately on selection: filename, pages, size, detected language, text length (characters / words).
- After file selection, the processing starts ONLY when the user clicks the PROCESS button.
- When processing begins, show a dynamic visual progress indicator with:
  - Stage (e.g., "Extracting text", "Splitting into batches", "Calling Gemini API — Batch X of Y", "Retrying failed batch", "Generating PDF", "Saving to IndexedDB")
  - Percentage complete
  - Per-batch status and ETA estimate (derived from measured throughput in-browser)
  - Ability to pause/cancel processing
  - Option to download the partially processed PDF at any time
  - Option to download all partial PDFs (if the original is split into multiple outputs)
- Use a sensible default batch split based on token-like heuristics (e.g., chunk by ~10k tokens or user-configured Batch Size / Overlap Size) and allow user to override batch size, overlap, and other batching settings.

GEMINI REST API USAGE & FAILOVER
- Use Google AI Studio / Generative Language REST endpoints via fetch() with the provided API key in `x-goog-api-key`.
- Implement model selection UI (drop-down) with the most relevant late-2025 models pre-populated (see "Models & dates" below). Attempt calls in priority order and, on failure, automatically retry against the same model up to Max Retries, then failover to the next model in the list until all configured models have been tried.
- If the primary key hits a rate limit or returns 429/5xx, automatically switch to the Backup API key if provided; if both keys fail, show an actionable, user-friendly error including the HTTP status, error message, and guidance (e.g., "Try increasing Delay between requests, lower Parallel Chunks, or use a backup API key").
- Respect API timeouts: allow the user to set an API timeout (default 60s). Abort/fail requests that exceed the timeout and apply retry logic.
- Provide a "list models" diagnostic that calls the models.list endpoint to show available model IDs and metadata at runtime (so the app can adapt to new models).

MULTIMODAL INPUT SUPPORT
- When the PDF contains inline images/figures/tables as images, send them to Gemini multimodal endpoints in the same batch as the nearby text, using the REST API image parts if available. For images the app should:
  - Extract image as a base64 or blob
  - Include it in the relevant batch and instruct Gemini to produce an accessible description of the figure (following the "Figure/Image Description Prompt")
- If Gemini model being used does not support images, fallback to text-only prompts where you describe the image (file name, size) and request descriptions.

PROMPTING & TRANSFORMATION RULES (User-configurable)
- Provide a settings UI that allows the user to edit the transformation prompts. The site must come with default templates and a "save custom instructions" feature to store multiple saved templates.
- Default transformation instruction set (must be editable):
  - System: "You are an expert at converting technical documentation into natural, spoken language optimized for text-to-speech systems."
  - Core instruction (Text Transformation Prompt): "Convert the following text into a natural, spoken format that is easy to listen to. Maintain accuracy while making it conversational. Expand acronyms on first use. Convert formulas and special symbols into spoken words. Convert tables into narrative sentences. Describe figures and images clearly. Replace code blocks with descriptive explanations of what the code does (do not read code line-by-line). Preserve the logical order and headings. Add natural transitions between sections. Remove inline citations and footnotes. Make the output TTS-friendly with good rhythm (commas and pauses)."
  - Table Conversion Prompt, Code Description Prompt, Mathematical Notation Prompt, Figure/Image Description Prompt, List Formatting Prompt — supply defaults and allow per-file overrides.
- Transformation Rules: Allow user to toggle options like "Preserve English as-is", "Expand acronyms", "Simplify technical jargon", "Add phonetic hints", "Insert pause markers for TTS".

BATCH PROCESSING & RETRY STRATEGY
- Batch Size (tokens), Overlap Size (tokens), Max Retries, Retry Delay (ms), Parallel Chunks (Turbo Mode), Rate Limit Delay (ms) must be configurable in the UI. Default values:
  - Batch Size: 10000 tokens
  - Overlap Size: 200 tokens
  - Max Retries: 3
  - Retry Delay: 2000 ms
  - Parallel Chunks: 3 (Turbo Mode disabled by default)
  - Rate Limit Delay: 1000 ms
- If Turbo Mode is enabled, process multiple chunks in parallel but reduce parallelism automatically if many 429 responses occur.
- If one model fails for a batch, retry that batch with exponential backoff up to Max Retries, then attempt the next model in the model-priority list. Continue until either the batch is successfully processed or every model has failed — then mark that batch as failed and offer options: "retry now", "retry later", "skip", or "download partial result".

PDF GENERATION (OUTPUT)
- Generate a new PDF containing:
  - Transformed readable text (maintain headings)
  - Optional per-chapter audio markers (e.g., add attributes in metadata so TTS apps can create bookmarks)
  - Optionally include inline accessible alt-text for images (the descriptions generated by Gemini)
  - Table of contents (generated if requested)
  - Page numbers and user-configurable page size, margins, font family, font size, and line-height
- Allow download of the final PDF and partial PDFs.
- Offer an option to include the original PDF alongside the transformed content (e.g., original text in an appendix).

UI, UX & SETTINGS
- Provide a modern, beautiful UI with dark-mode toggle. Dark mode must be persistent (store setting in LocalStorage).
- Provide a Settings panel that autosaves on change (no "Save" button). Persist all settings to LocalStorage. Allow "Reset to defaults".
- Provide an interactive walkthrough for new users that shows how to obtain an API key from Google AI Studio and how to paste/store it in Settings. Include direct links to the official pages on obtaining and managing API keys (display link text and an external icon). Also include inline help explaining rate limits, cost considerations, and recommended batch settings to avoid hitting limits.
- Provide pages: Home (main app), About, Contact, FAQ, Privacy Policy, Terms of Service, Pricing, Advanced Settings, Diagnostics (model listing, logs, API calls preview).
- Keep the code modular: multiple JS and CSS files, clear folder structure (e.g., /css/, /js/, /pages/, /assets/). Also provide a single-file bundled index.html export option for users who want a single artifact. Provide build notes explaining how the single-file bundle was created (concatenate, inline scripts, base64 assets).
- Accessibility: keyboard navigable, labelled controls, ARIA roles where appropriate, color-contrast compliant, and screen-reader friendly.

DIAGNOSTICS & LOGS
- Provide an in-app log viewer (persist logs to IndexedDB): show API requests/responses (redact API key), timestamps, HTTP status codes, duration, retries, and model used for each batch.
- Provide "Export logs" to download a zipped diagnostic package (logs + partial outputs + settings) to assist support.

ERROR HANDLING
- Show user-friendly error messages and clear remediation steps (e.g., "API key invalid — open Settings and paste a valid Google AI Studio API key", "Rate limit — reduce Parallel Chunks, enable Rate Limit Delay", "Model does not support images — uncheck include images or switch to a multimodal-capable model").
- Implement graceful abort/pause and recovery. If the user navigates away and returns, the current processing state should be recoverable from IndexedDB.
- When the app fails a batch due to a model error, show the exact model attempted, error code, and the fallback action taken.

SECURITY & PRIVACY
- Explain clearly in Privacy Policy: the API key is stored in LocalStorage in the user's browser (not transmitted to any external servers by the site other than Google AI Studio via fetch), files are stored in IndexedDB in the browser, and no file contents or API keys are sent to any third party.
- Provide an "Erase all data" option to clear LocalStorage and IndexedDB.

ADVANCED FEATURES (optional / progressive enhancement)
- Text-to-speech preview player inside the app (browser TTS) to audition transformed content before generating PDF.
- Allow export of the transformed text as plain text, EPUB, or Markdown.
- Save and load multiple "Transformation Profiles" (prompts and rules).
- Allow "Voice" presets for TTS (for downstream use) — store voice metadata (not audio).
- Allow user to insert custom manual overrides per-page or per-section during review step before PDF generation.

PROGRESS & USABILITY
- Provide a per-batch preview panel so users can inspect a transformed chunk and accept or edit it before final assembly.
- Provide "Undo" for last changes (basic editing history for each chunk).
- Provide "download partial PDF" and "download everything" buttons while processing.

DEFAULT SETTINGS (pre-filled)
- See the JSON-like settings the user specified below — include them as defaults in the settings UI:
  - API Timeout: 60
  - Turbo Mode (Parallel Processing): false (Parallel Chunks default 3)
  - Auto-retry failed requests: true
  - Prompt templates and transformation rules (include Table Conversion Prompt, Code Description Prompt, Mathematical Notation Prompt, Figure/Image Description Prompt, List Formatting Prompt exactly as given below)
  - Batch Size: 10000 tokens
  - Overlap Size: 200 tokens
  - Max Retries: 3
  - Retry Delay: 2000 ms
  - Rate Limit Delay: 1000 ms
  - Temperature: 1
  - Top P: 0.95
  - Top K: 40
  - Max Output Tokens: 4000
  - Presence Penalty: 0
  - Frequency Penalty: 0
  - PDF font size: 12
  - Line height: 1.5
  - Page margin: 20 mm
  - Font family: Times New Roman
  - Page size: Letter
  - Add page numbers: true
  - Generate table of contents: true
  - Input language: English
  - Output language: English
  - Date format: YYYY-MM-DD

MODEL USAGE (late 2025 guidance — include in app docs & default model list)
- The app should pre-populate the model-priority list with the currently recommended late-2025 models and handle new models dynamically via the models.list endpoint:
  - gemini-3-pro-preview (newest, launched Nov 18, 2025) — use for the heaviest reasoning/multimodal transforms where available.
  - gemini-2.5-pro
  - gemini-2.5-flash
  - gemini-2.5-flash-lite
  - gemini-2.5-pro-preview-tts (if available)
  - gemini-2.5-flash-preview-tts (if available)
  - gemini-2.0-flash (fallback)
  - Note: The app must call the models.list endpoint at diagnostics to get the exact model IDs and supported modalities at runtime rather than hardcoding only.
- Always display the date of the model list fetched and let users reorder the priority.

REST API EXAMPLES & HEADERS
- Use fetch with `Content-Type: application/json` and `x-goog-api-key: <USER_KEY>`.
- Example REST snippet to include in the app docs (client-side curl example for developer docs):
  curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{"contents":[{"parts":[{"text":"Explain how AI works in a few words"}]}]}'
  - Provide a link to official docs on API keys and model listing pages so the user can troubleshoot.

DEVELOPMENT & DELIVERY
- Provide:
  - A multi-file project tree with clear comments
  - A single-index.html bundle option (script in ./tools/bundle.sh or instructions for manual bundling)
  - README with usage, local testing instructions, and how to obtain a Google AI Studio API key
  - Inline code comments explaining design decisions, fallback strategy, and where to change prompt templates
  - A short video or GIF walkthrough (optional) or step-by-step screenshots for the interactive walkthrough
- Provide automated tests where reasonable (e.g., unit tests for token chunker, prompt builder, and IndexedDB wrapper) — but these can be runnable in-browser as small test suites.

DELIVERABLE FORMATS
- Provide the full multi-file project (HTML/JS/CSS + assets). Also provide a single-file index.html export if the user requests it.
- The app should log actions in IndexedDB and show a "Support bundle" export (zipped) with settings, logs, and partial outputs.

MAINTAINABILITY
- Use modular JavaScript (ES modules), well-documented functions, and separation of concerns. Structure CSS with a consistent naming scheme (BEM, utility classes, or Tailwind-like but with plain CSS).
- Keep the UI responsive and mobile-friendly.

INSTRUCTIONS TO THE AGENT:
- Build this app iteratively: first produce the multi-file source tree and a working development index.html that handles uploading a PDF and extracting raw text (demo page). Then add batching, Gemini REST actions, PDFs generation, UI polish, settings, and persistence. Provide working, commented code for each step and include a final bundled index.html ready to deploy.
- Ensure all user-facing text is clear, instructive, and non-technical where possible.
- When making network calls to Google AI Studio, always redact API keys in logs and give the user the raw request/response preview only with the API key removed.
- Include thorough error handling and actionable messages.
- Include "how to get API key" links and simple screenshots explaining where to click in Google AI Studio to create a key.

DO NOT remove any of the above instructions. Follow them exactly and include the up-to-date model and API usage notes, implement robust retry/failover using a backup key when provided, and ensure the site remains entirely browser-based (no server required).
