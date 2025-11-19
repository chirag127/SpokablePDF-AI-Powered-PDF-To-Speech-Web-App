# Convert to Readable Spokable PDF

A browser-based application that transforms technical PDFs into natural, spoken-friendly content optimized for text-to-speech (TTS) systems.

## Features

- **100% Browser-Based**: No server required, all processing happens locally
- **PDF Text Extraction**: Extracts text from PDFs with selectable text (no OCR)
- **AI-Powered Transformation**: Uses Google Gemini AI to convert technical content to natural speech
- **Multimodal Support**: Processes images and figures with descriptive alt-text
- **Batch Processing**: Handles large documents with intelligent chunking
- **Advanced Retry Logic**: Automatic failover and retry with exponential backoff
- **Progress Tracking**: Real-time progress with ETA estimates
- **Customizable Prompts**: Edit transformation rules and prompts
- **Dark Mode**: Beautiful UI with persistent dark mode
- **Offline Storage**: Uses IndexedDB for intermediate data and LocalStorage for settings

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Google AI Studio API key (free tier available)

### Obtaining a Google AI Studio API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated key
5. Paste it into the Settings page of this application

**Important**: Your API key is stored only in your browser's LocalStorage and is never sent anywhere except to Google's Gemini API endpoints.

### Installation

#### Option 1: Multi-File Deployment

1. Clone or download this repository
2. Open `index.html` in a web browser
3. Or serve the directory with any static file server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js http-server
   npx http-server

   # Using PHP
   php -S localhost:8000
   ```

#### Option 2: Single-File Bundle

1. Run the bundling script:
   ```bash
   bash tools/bundle.sh
   ```
2. Open the generated `dist/index-bundle.html` in any browser
3. This single file contains the entire application

### Usage

1. **Upload PDF**: Drag and drop a PDF file or click to select
2. **Configure Settings**: Click Settings to enter your API key and customize transformation options
3. **Process**: Click the PROCESS button to start transformation
4. **Monitor Progress**: Watch real-time progress with stage-by-stage updates
5. **Download**: Download the transformed PDF when complete

## Architecture

### Folder Structure

```
.
├── index.html              # Main application page
├── css/
│   ├── main.css           # Core styles
│   ├── dark-mode.css      # Dark mode theme
│   └── components.css     # UI component styles
├── js/
│   ├── app.js             # Main application logic
│   ├── pdf-extractor.js   # PDF.js integration
│   ├── text-processor.js  # Text chunking and batching
│   ├── gemini-client.js   # Gemini REST API client
│   ├── pdf-generator.js   # PDF output generation
│   ├── settings-manager.js # Settings persistence
│   ├── storage-manager.js # IndexedDB wrapper
│   ├── progress-tracker.js # Progress tracking
│   ├── logger.js          # Logging system
│   └── utils.js           # Utility functions
├── pages/
│   ├── about.html         # About page
│   ├── faq.html           # FAQ page
│   ├── privacy.html       # Privacy policy
│   ├── terms.html         # Terms of service
│   ├── settings.html      # Settings page
│   └── diagnostics.html   # Diagnostics and logs
├── assets/
│   ├── icons/            # UI icons
│   └── images/           # Screenshots and images
├── tools/
│   └── bundle.sh         # Single-file bundler script
└── README.md             # This file
```

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Modular ES modules
- **PDF.js**: Mozilla's PDF rendering library
- **jsPDF**: PDF generation
- **IndexedDB**: Local database for intermediate storage
- **LocalStorage**: Settings persistence
- **Fetch API**: HTTP requests to Gemini API

## Configuration

### Default Settings

The application comes with sensible defaults:

- **Batch Size**: 10,000 tokens
- **Overlap Size**: 200 tokens
- **Max Retries**: 3
- **Retry Delay**: 2000 ms
- **API Timeout**: 60 seconds
- **Temperature**: 1.0
- **Max Output Tokens**: 4000

### Model Priority (Late 2025)

The default model priority list:
1. gemini-3-pro-preview (newest, Nov 18, 2025)
2. gemini-2.5-pro
3. gemini-2.5-flash
4. gemini-2.5-flash-lite
5. gemini-2.0-flash

The app automatically fetches available models at runtime and allows reordering.

### Transformation Prompts

All transformation prompts are customizable in Settings:

- **Text Transformation Prompt**: Converts content to natural speech
- **Table Conversion Prompt**: Transforms tables into narrative
- **Code Description Prompt**: Explains code without reading line-by-line
- **Mathematical Notation Prompt**: Converts math to spoken form
- **Figure/Image Description Prompt**: Describes visual elements

## API Usage

The application uses the Google Generative Language REST API:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"contents":[{"parts":[{"text":"Your text here"}]}]}'
```

### Rate Limits & Cost

- Free tier: 15 requests per minute, 1500 requests per day
- Paid tier: Higher limits based on plan
- Cost varies by model and token usage
- See [Google AI Studio Pricing](https://ai.google.dev/pricing) for details

## Privacy & Security

- **API Keys**: Stored only in your browser's LocalStorage
- **Files**: Stored in your browser's IndexedDB
- **No Server Communication**: Only communicates with Google AI Studio
- **Data Control**: "Erase all data" option clears everything
- **No Tracking**: No analytics or third-party scripts

## Troubleshooting

### API Key Invalid

- Verify your API key is correct
- Check it hasn't expired
- Ensure it has Generative Language API access enabled

### Rate Limit Errors (429)

- Increase "Retry Delay" in Settings
- Decrease "Parallel Chunks" (disable Turbo Mode)
- Add a backup API key
- Wait and retry later

### Model Not Found

- Use the Diagnostics page to list available models
- Update model priority list
- Some preview models may not be available in all regions

### Processing Stalls

- Check browser console for errors
- Try reducing batch size
- Disable Turbo Mode
- Use the Diagnostics page to export logs

## Development

### Running Tests

Open `test/index.html` in a browser to run unit tests.

### Building Single-File Bundle

```bash
bash tools/bundle.sh
```

This creates `dist/index-bundle.html` with all assets inlined.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- **GitHub Issues**: Report bugs and request features
- **Diagnostics Export**: Use the Diagnostics page to export logs for support

## Acknowledgments

- **PDF.js**: Mozilla's excellent PDF rendering library
- **jsPDF**: PDF generation library
- **Google Gemini**: AI transformation capabilities

## Changelog

### Version 1.0.0 (2025-11-19)

- Initial release
- Full PDF-to-Spokable-PDF pipeline
- Multi-file and single-file deployment options
- Complete settings and customization
- Diagnostics and logging
- Dark mode support