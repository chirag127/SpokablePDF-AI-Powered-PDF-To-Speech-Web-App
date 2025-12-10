<p align="center">
  <a href="https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App">
    <img src="https://raw.githubusercontent.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/main/docs/assets/logo.svg" alt="FluentPDF Logo" width="150">
  </a>
</p>

<h1 align="center">FluentPDF-AI-PDF-To-Audio-Web-App</h1>

<p align="center">
  <!-- Badges -->
  <a href="https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/ci.yml?branch=main&style=flat-square" alt="Build Status">
  </a>
  <a href="https://codecov.io/gh/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App">
    <img src="https://img.shields.io/codecov/c/github/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/main?style=flat-square" alt="Code Coverage">
  </a>
  <img src="https://img.shields.io/badge/Language-JavaScript%20%7C%20TypeScript-blueviolet?style=flat-square" alt="Language">
  <img src="https://img.shields.io/badge/Framework-Vite%20%7C%20TailwindCSS-orange?style=flat-square" alt="Framework">
  <img src="https://img.shields.io/badge/Lint_Format-Biome-informational?style=flat-square" alt="Lint/Format">
  <a href="https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/stargazers">
    <img src="https://img.shields.io/github/stars/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App?style=flat-square&cacheSeconds=3600" alt="GitHub Stars">
  </a>
</p>

<p align="center">
  <strong>Star ⭐ this Repo</strong> to show your support and help our project grow!
</p>

## 🚀 Blazing Fast Learning: AI-Powered PDF to Audio Transformation

FluentPDF revolutionizes how you consume technical documents by transforming complex PDFs into natural, spoken-friendly audio. Leveraging Google Gemini AI, this 100% browser-based web application optimizes content for multimodal learning, offering advanced text extraction, offline processing, and customizable prompts for unparalleled accessibility and efficiency.

## 📝 Table of Contents

*   [🚀 Blazing Fast Learning: AI-Powered PDF to Audio Transformation](#-blazing-fast-learning-ai-powered-pdf-to-audio-transformation)
*   [📝 Table of Contents](#-table-of-contents)
*   [🌐 Architecture: Feature-Sliced Design (FSD)](#-architecture-feature-sliced-design-fsd)
*   [✨ Key Features](#-key-features)
*   [🛠 Technology Stack](#-technology-stack)
*   [📦 Getting Started](#-getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation](#installation)
    *   [Development Server](#development-server)
    *   [Building for Production](#building-for-production)
*   [📂 Project Structure](#-project-structure)
*   [🧪 Testing](#-testing)
*   [🤖 AI AGENT DIRECTIVES: CORE OPERATING PROTOCOL](#-ai-agent-directives-core-operating-protocol)
*   [🤝 Contributing](#-contributing)
*   [🛡️ Security](#️-security)
*   [📜 License](#-license)

## 🌐 Architecture: Feature-Sliced Design (FSD)

FluentPDF is meticulously structured using the Feature-Sliced Design (FSD) methodology, ensuring a robust, scalable, and maintainable codebase. This architecture promotes clear separation of concerns, high cohesion, and low coupling across different layers and features.

mermaid
graph TD
    A[App] --> B(Pages)
    B --> C(Widgets)
    C --> D(Features)
    D --> E(Entities)
    E --> F(Shared)
    F --&gt; G(API / AI Services)

    subgraph Layers
        A --EntryPoint--> B
        B --Composition--> C
        C --Composition--> D
        D --BusinessLogic--> E
        E --Primitives/Utils--> F
        F --External--> G
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style D fill:#ddf,stroke:#333,stroke-width:2px
    style E fill:#eef,stroke:#333,stroke-width:2px
    style F fill:#ffb,stroke:#333,stroke-width:2px
    style G fill:#fbf,stroke:#333,stroke-width:2px


## ✨ Key Features

*   **AI-Powered Content Optimization:** Utilizes Google Gemini AI to intelligently process technical PDFs, transforming jargon into natural, spoken-friendly language.
*   **100% Browser-Based:** Operates entirely within your web browser, ensuring privacy, offline capability, and no server-side processing of your documents.
*   **Multimodal Learning:** Converts optimized text into high-quality audio, catering to diverse learning styles and improving accessibility.
*   **Advanced Text Extraction:** Robustly extracts text from various PDF structures, handling complex layouts and embedded content.
*   **Offline Processing:** Once loaded, the application can process PDFs and generate audio entirely offline.
*   **Customizable Prompts:** Fine-tune the AI's transformation process with custom prompts to meet specific content needs.
*   **User-Friendly Interface:** Intuitive and responsive design for a seamless user experience across devices.
*   **Privacy-Focused:** Your documents never leave your browser for processing, ensuring maximum data privacy.

## 🛠 Technology Stack

FluentPDF is built with a modern and efficient web technology stack, adhering to 2026 Apex standards for performance, scalability, and maintainability. While the initial prototype might leverage JavaScript, the architectural vision is firmly set on TypeScript for strict type safety.

*   **Core Language:** JavaScript (with a strong migration path to **TypeScript 6.x (Strict)**)
*   **Build Tool & Dev Server:** **Vite 7 (Rolldown)** for unparalleled development experience and optimized production builds.
*   **Styling:** **TailwindCSS v4** for rapid UI development and highly performant, utility-first CSS.
*   **AI Integration:** **Google Gemini API** (`gemini-3-pro`) for advanced natural language processing and content transformation.
*   **Testing Frameworks:** **Vitest** for unit/integration testing and **Playwright** for robust end-to-end browser automation.
*   **Linting & Formatting:** **Biome** for blazing-fast code quality enforcement.
*   **Future Desktop Target:** **Tauri v2.x** for potential future native desktop application deployments.

## 📦 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js (v18+) and a package manager (npm, pnpm, or yarn) installed.

bash
node -v
npm -v # or pnpm -v or yarn -v


### Installation

1.  **Clone the repository:**
    bash
    git clone https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App.git
    cd FluentPDF-AI-PDF-To-Audio-Web-App
    
2.  **Install dependencies:**
    bash
    pnpm install # Recommended
    # or npm install
    # or yarn install
    

### Development Server

Start the development server with hot-reloading capabilities:

bash
pnpm run dev
# or npm run dev
# or yarn dev


Open your browser to `http://localhost:5173` (or the port specified by Vite).

### Building for Production

To build the optimized, production-ready version of the application:

bash
pnpm run build
# or npm run build
# or yarn build


The compiled assets will be placed in the `dist/` directory.

## 📂 Project Structure

text
FluentPDF-AI-PDF-To-Audio-Web-App/
├── .github/              # GitHub Actions, Templates
├── docs/                 # Project documentation, assets
├── public/               # Static assets
├── src/                  # Source code (Feature-Sliced Design)
│   ├── app/              # Application entry, global styles, routing
│   ├── pages/            # Page-level components (e.g., /home, /settings)
│   ├── widgets/          # Independent, composable UI blocks (e.g., PDF viewer, AI controls)
│   ├── features/         # Business-specific features (e.g., pdf-processor, audio-generator)
│   ├── entities/         # Domain-specific logic/models (e.g., document, audio-segment)
│   ├── shared/           # Reusable UI components, utilities, types, config
│   └── index.ts          # Main application entry point
├── tests/                # Unit and E2E tests
├── .gitignore            # Files to ignore from Git
├── README.md             # This README file
├── PROPOSED_README.md    # Proposed future README (for agent consumption)
├── AGENTS.md             # AI Agent Directives
├── badges.yml            # Badges configuration
├── package.json          # Project metadata and scripts
├── pnpm-lock.yaml        # PNPM lock file
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── ...


## 🧪 Testing

FluentPDF employs a comprehensive testing strategy to ensure reliability and maintainability.

*   **Unit & Integration Tests:** Powered by **Vitest**, these tests cover individual functions, components, and service integrations.
    bash
    pnpm run test:unit
    
*   **End-to-End (E2E) Tests:** Utilizes **Playwright** to simulate user interactions and validate full application flows in a real browser environment.
    bash
    pnpm run test:e2e
    
*   **Linting & Formatting:** **Biome** ensures consistent code style and catches common errors early.
    bash
    pnpm run lint
    

<details>
<summary><b>🤖 AI AGENT DIRECTIVES: CORE OPERATING PROTOCOL</b></summary>

# SYSTEM: APEX TECHNICAL AUTHORITY & ELITE ARCHITECT (DECEMBER 2025 EDITION)

## 1. IDENTITY & PRIME DIRECTIVE
**Role:** You are a Senior Principal Software Architect and Master Technical Copywriter with **40+ years of elite industry experience**. You operate with absolute precision, enforcing FAANG-level standards and the wisdom of "Managing the Unmanageable."
**Context:** Current Date is **December 2025**. You are building for the 2026 standard.
**Output Standard:** Deliver **EXECUTION-ONLY** results. No plans, no "reporting"—only executed code, updated docs, and applied fixes.
**Philosophy:** "Zero-Defect, High-Velocity, Future-Proof."

---

## 2. INPUT PROCESSING & COGNITION
*   **SPEECH-TO-TEXT INTERPRETATION PROTOCOL:**
    *   **Context:** User inputs may contain phonetic errors (homophones, typos).
    *   **Semantic Correction:** **STRICTLY FORBIDDEN** from executing literal typos. You must **INFER** technical intent based on the project context.
    *   **Logic Anchor:** Treat the `README.md` as the **Single Source of Truth (SSOT)**.
*   **MANDATORY MCP INSTRUMENTATION:**
    *   **No Guessing:** Do not hallucinate APIs.
    *   **Research First:** Use `linkup`/`brave` to search for **December 2025 Industry Standards**, **Security Threats**, and **2026 UI Trends**.
    *   **Validation:** Use `docfork` to verify *every* external API signature.
    *   **Reasoning:** Engage `clear-thought-two` to architect complex flows *before* writing code.

---

## 3. CONTEXT-AWARE APEX TECH STACKS (LATE 2025 STANDARDS)
**Directives:** Detect the project type and apply the corresponding **Apex Toolchain**. This repository, `FluentPDF-AI-PDF-To-Audio-Web-App`, is a **modern browser-based web application** with AI integration.

*   **PRIMARY SCENARIO: WEB / APP / GUI (Modern Frontend)**
    *   **Stack:** This project currently leverages **JavaScript** for browser compatibility, but the target Apex standard is **TypeScript 6.x (Strict)** for enhanced type safety and maintainability. Key tools include **Vite 7 (Rolldown)** for blazing-fast build performance, **TailwindCSS v4** for utility-first styling, and potential integration with **Tauri v2.x** for future desktop application deployment.
    *   **Architecture:** Adheres to the **Feature-Sliced Design (FSD)** methodology, ensuring clear separation of concerns, scalability, and maintainability across features like PDF processing, AI content transformation, and audio playback.
    *   **Lint/Test:** Employs **Biome** for ultra-fast linting and formatting, **Vitest** for robust unit and integration testing, and **Playwright** for end-to-end browser testing.
    *   **AI Integration:** Deeply integrated with **Google Gemini API** (`gemini-3-pro` by default) for intelligent text extraction, content summarization, and natural language transformation. Prioritize modular design, clear API contracts, and robust error handling for all AI model interactions.
    *   **State Management:** Utilizes modern, performant state management patterns, ideally based on Signals for reactive data flows.

*   **SECONDARY SCENARIO A: SYSTEMS / PERFORMANCE (Low Level) - *Not applicable for this project's primary function. Reference only.***
    *   **Stack:** Rust (Cargo) or Go (Modules).
    *   **Lint:** Clippy / GolangCI-Lint.
    *   **Architecture:** Hexagonal Architecture (Ports & Adapters).

*   **SECONDARY SCENARIO B: DATA / AI / SCRIPTS (Python) - *Not applicable for this project's primary function. Reference only.***
    *   **Stack:** uv (Manager), Ruff (Linter), Pytest (Test).
    *   **Architecture:** Modular Monolith or Microservices.

---

## 4. DEVELOPMENT STANDARDS & PRINCIPLES
*   **Principles First:** Adhere to **SOLID, DRY, and YAGNI**. Code must be clean, modular, and self-documenting.
*   **Security by Design:** Implement robust security practices from inception, including input validation, secure API handling, and content security policies for browser environments.
*   **Performance Optimization:** Prioritize efficient algorithms, lazy loading, and optimized asset delivery for a smooth user experience in a browser-based application.
*   **Accessibility (A11Y):** Ensure the application is accessible to all users, adhering to WCAG 2.1 AA standards.

---

## 5. VERIFICATION & EXECUTION COMMANDS (EXAMPLE)
*   `npm install` or `pnpm install` or `yarn install`: Install project dependencies.
*   `npm run dev`: Start the local development server (Vite).
*   `npm run build`: Build the production-ready application.
*   `npm run lint`: Run Biome linting and formatting checks.
*   `npm run test:unit`: Execute Vitest unit tests.
*   `npm run test:e2e`: Execute Playwright end-to-end tests.
*   `git pull --rebase origin main`: Keep current branch up-to-date with main.
*   `git commit -m "feat: <description>"`: Commit changes following Conventional Commits.
*   `git push origin <branch-name>`: Push changes to remote.

</details>

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/blob/main/.github/CONTRIBUTING.md) for guidelines on how to submit pull requests, report issues, and improve the project.

## 🛡️ Security

For information on security vulnerabilities and how to report them, please refer to our [SECURITY.md](https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/blob/main/.github/SECURITY.md) policy.

## 📜 License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://github.com/chirag127/FluentPDF-AI-PDF-To-Audio-Web-App/blob/main/LICENSE) License. See the `LICENSE` file for more details.
