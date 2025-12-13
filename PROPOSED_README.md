# Spokable-PDF-AI-Driven-Text-to-Speech-Web-App

[![Build Status](https://img.shields.io/github/actions/status/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App?style=flat-square)](https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App/actions)
[![Code Coverage](https://img.shields.io/codecov/c/gh/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App?style=flat-square)](https://codecov.io/gh/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-blue?style=flat-square)](https://creativecommons.org/licenses/by-nc/4.0/)
[![GitHub Stars](https://img.shields.io/github/stars/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App?style=flat-square)](https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App/stargazers)

## Introduction
A browser-based, fully client-side web app that transforms technical PDFs into natural spoken language using Cerebras Inference via the OpenAI SDK, enabling seamless text-to-speech integration without any server.

## Features
* Client-side PDF to text conversion
* AI-driven text-to-speech functionality
* No server required
* Uses Cerebras Inference for AI operations

## Getting Started
1. Clone the repository: `git clone https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App.git`
2. Install dependencies: `npm install`
3. Start the application: `npm start`

## AI Agent Directives
<details>
<summary>View AI Agent Directives</summary>

* **Base URL:** `https://api.cerebras.ai/v1`
* **API Key Variable:** `CEREBRAS_API_KEY`
* **Library:** Use the standard `openai` Node.js library.
javascript
const { OpenAI } = require('openai');
const client = new OpenAI({
  base_url: 'https://api.cerebras.ai/v1',
  api_key: process.env.CEREBRAS_API_KEY,
});

* **Model Hierarchy (Fallback Cascade):**
  * **Tier 1 (Frontier Intelligence):** `zai-glm-4.6` (357B)
  * **Tier 2 (Heavy Reasoning):** `qwen-3-235b-a22b-instruct-2507` (235B)
  * **Tier 3 (General Purpose):** `gpt-oss-120b` (120B)
  * **Tier 4 (Balanced Workhorse):** `llama-3.3-70b` (70B)
  * **Tier 5 (Fast Inference):** `qwen-3-32b` (32B)
  * **Tier 6 (Ultra-Fast/Instant):** `llama3.1-8b` (8B)
* **Operational Limits:**
  * **Max Output Tokens:** `32768` (Free Tier Limit)
  * **Context Window:** 65,536 (Free Tier)
  * **Concurrency:** `MAX_WORKERS = 5` (Free Tier Safe Limit)
  * **Circuit Breaker:** On 429/500 error, trigger **Exponential Backoff** (start 2s) and retry
</details>

## Contributing
Please see [CONTRIBUTING.md](https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## Security
Please see [SECURITY.md](https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App/blob/main/SECURITY.md) for details on how to report security vulnerabilities.

## License
This project is licensed under the CC BY-NC 4.0 license. See [LICENSE](https://github.com/chirag127/Spokable-PDF-AI-Driven-Text-to-Speech-Web-App/blob/main/LICENSE) for details.
