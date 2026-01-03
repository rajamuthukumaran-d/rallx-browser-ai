# Rallx Browser AI

**Rallx Browser AI** is a powerful, privacy-focused Firefox sidebar extension that brings the power of AI directly to your browsing experience. Connect to **Local LLMs** (like Ollama or LM Studio) or **Cloud Providers** (like Gemini or OpenAI) to summarize pages, explain text, and chat with context-awareness—using any OpenAI-compatible API.

## 🚀 Key Features

- **🔗 Universal Local LLM Support:** Works with any OpenAI-compatible API (Ollama, LM Studio, etc.).
- **📄 Smart Page Summarization:** Instantly summarize the current webpage.
  - **Smart Context (RAG):** Uses intelligent retrieval (RAG) or smart selection to handle large pages that exceed the model's token limit, ensuring key information is retained.
- **📝 Selection Context:** Select any text on a webpage and ask questions about it or summarize just that specific section.
- **💬 Context-Aware Chat:** Maintains conversation history, allowing for natural follow-up questions about the page or previous topics.
- **🔒 Privacy First:**
  - **Local Processing:** Your data stays on your machine (when using local models).
  - **Encrypted Storage:** API keys (if used) are stored using AES-GCM encryption.
- **⚡ Real-Time Streaming:** Responses stream in token-by-token for a snappy experience.
- **🛠️ Developer Friendly:** Built with **Vanilla JavaScript** (ES Modules) — no build steps, bundlers, or transpilers required.

## 📥 Installation

1.  Open Firefox and navigate to `about:debugging`.
2.  Click **"This Firefox"** in the sidebar.
3.  Click **"Load Temporary Add-on..."**.
4.  Browse to the project folder and select the `manifest.json` file.
5.  The Rallx sidebar icon will appear in your browser toolbar or sidebar menu.

## ⚙️ Configuration

### 1. Setting up the LLM Server

Rallx connects to a local server. Ensure your server is running and accessible.

- **Ollama:** `http://localhost:11434/v1`
  - _Note:_ You may need to set `OLLAMA_ORIGINS="*"` environment variable to allow browser access.
- **LM Studio:** `http://localhost:1234/v1`
  - _Note:_ Enable "CORS" in LM Studio server settings.
- **Gemini:** `https://generativelanguage.googleapis.com/v1beta/openai`
  - _Note:_ Requires an API Key from Google AI Studio.
- **OpenAI:** `https://api.openai.com/v1`
  - _Note:_ Requires an OpenAI API Key.

### 2. Extension Settings

Open the settings panel (gear icon) in the sidebar to configure:

- **Base URL:** Your LLM server endpoint.
- **API Key:** Optional key for providers that require authentication.
- **Max Context Tokens:** Limit the amount of text sent to the model to manage performance.
- **Smart Context (RAG):** Enable/disable intelligent text selection for large documents.

## 📂 Project Structure

The project follows a clean, modular Vanilla JS architecture:

- `manifest.json` - Extension configuration (Manifest V3).
- **Core Modules:**
  - `sidebar.js` - Main controller orchestrating the application.
  - `api.js` - Handles communication with the LLM server.
  - `state.js` - Manages app state, settings, history, and encryption.
  - `context.js` - Handles page content extraction and user selection.
  - `ui.js` - Manages DOM updates, message rendering, and toasts.
- **Utilities:**
  - `rag.js` - Logic for retrieval-augmented generation and text chunking.
  - `encryption_utils.js` - AES-GCM encryption helpers.
  - `markdown_parser.js` - Safe Markdown-to-HTML rendering.
- `background.js` - Background event handling.
- `content_script.js` - Script injected into pages to read content.

## 🤝 Contributing

This project is built to be simple and hackable. Since there is no build step, you can just edit the files and click "Reload" in the Firefox debugging dashboard to see your changes immediately.
