#!/bin/bash

# Bundle Script for Readable Spokable PDF
# Creates a single-file index.html with all assets inlined

echo "Starting bundling process..."

# Create dist directory if it doesn't exist
mkdir -p dist

# Output file
OUTPUT_FILE="dist/index-bundle.html"

# Start the HTML file
cat > "$OUTPUT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Convert technical PDFs to readable, spokable content optimized for text-to-speech">
    <meta name="keywords" content="PDF, TTS, text-to-speech, AI, Gemini, accessible, readable">
    <title>Convert to Readable Spokable PDF</title>

    <!-- PDF.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    </script>

    <!-- jsPDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <style>
EOF

# Inline CSS files
echo "Inlining CSS..."
cat css/main.css >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat css/dark-mode.css >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat css/components.css >> "$OUTPUT_FILE"

# Close style tag and add body
cat >> "$OUTPUT_FILE" << 'EOF'
    </style>
</head>
<body>
EOF

# Extract body content from index.html (everything between <body> and </body>)
echo "Extracting HTML body..."
sed -n '/<body>/,/<\/body>/p' index.html | sed '1d;$d' >> "$OUTPUT_FILE"

# Add inline JavaScript
cat >> "$OUTPUT_FILE" << 'EOF'

<script type="module">
EOF

# Inline JavaScript modules
echo "Inlining JavaScript modules..."

# Utils
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// utils.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/utils.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Storage Manager
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// storage-manager.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/storage-manager.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Settings Manager
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// settings-manager.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/settings-manager.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Gemini Client
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// gemini-client.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/gemini-client.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# PDF Extractor
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// pdf-extractor.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/pdf-extractor.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Text Processor
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// text-processor.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/text-processor.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Progress Tracker
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// progress-tracker.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/progress-tracker.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# PDF Generator
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// pdf-generator.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/pdf-generator.js | sed '/^import/d' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# App (main application logic)
echo "// ============================================" >> "$OUTPUT_FILE"
echo "// app.js" >> "$OUTPUT_FILE"
echo "// ============================================" >> "$OUTPUT_FILE"
sed 's/^export //' js/app.js | sed '/^import/d' >> "$OUTPUT_FILE"

# Close script and body tags
cat >> "$OUTPUT_FILE" << 'EOF'
</script>
</body>
</html>
EOF

echo "Bundling complete!"
echo "Output: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "You can now deploy this single file to any static hosting service."
echo "Or open it directly in a browser: file://$(pwd)/$OUTPUT_FILE"