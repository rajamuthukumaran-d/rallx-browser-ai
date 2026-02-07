# Rallx Browser AI

**Rallx Browser AI** is a powerful, privacy-focused Firefox sidebar extension that brings the power of AI directly to your browsing experience. Connect to **Local LLMs** (like Ollama or LM Studio) or **Cloud Providers** (like Gemini or OpenAI) to summarize pages, explain text, and chat with context-awareness—using any OpenAI-compatible API.

## 🚀 Key Features

- **🔗 Universal Local LLM Support:** Works with any OpenAI-compatible API (Ollama, LM Studio, etc.).
- **📄 Smart Page Summarization:** Instantly summarize the current webpage.
  - **Smart Context (RAG):** Uses intelligent retrieval (RAG) or smart selection to handle large pages that exceed the model's token limit, ensuring key information is retained.
- **📝 Selection Context:** Select any text on a webpage and ask questions about it or summarize just that specific section.
- **💬 Context-Aware Chat:** Maintains conversation history, allowing for natural follow-up questions about the page or previous topics.
- **🔒 Privacy First:**
  - **No Data Collection:** The developer does not collect, store, or share any of your personal data, browsing history, or chat logs.
  - **Local Processing:** Your data stays on your machine when using local models (Ollama, LM Studio).
  - **Encrypted Storage:** API keys (if used) are stored locally using AES-GCM encryption.
  - **Direct Communication:** The extension communicates directly with your chosen LLM endpoint. No middle-man servers are used.
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

## 🛠️ Troubleshooting

### 1. Inaccurate or Irrelevant Answers
If you notice the AI is providing inaccurate information or ignoring parts of the page:
- **Try turning off "Smart Context (Alpha)":** This feature uses retrieval logic to select relevant text from large pages. For some documents, sending the full (truncated) text may yield better results.
- **Increase Max Context Tokens:** If your model supports larger contexts, increasing this value allows more of the page content to be sent to the AI.

### 2. Connection Issues (CORS)
Since the extension runs in the browser, providers must allow Cross-Origin Resource Sharing (CORS):
- **Ollama:** Set the environment variable `OLLAMA_ORIGINS="*"` before starting Ollama.
- **LM Studio:** Ensure the "CORS" toggle is enabled in the Local Server settings.
- **Other Providers:** If you see a "403 Forbidden" or "Network Error," check if the server allows requests from browser extensions.

### 3. "No Connection" or Empty Model List
- Verify that your **Base URL** is correct and includes the `/v1` suffix (e.g., `http://localhost:11434/v1`).
- Ensure the LLM server is running and accessible from your machine.
- If using an API key, ensure it is saved correctly in the settings.

### 4. Page Content Not Detected
- **Refresh the page:** The content script might not have loaded if the page was already open before the extension was installed/reloaded.
- **Restricted Pages:** Browser extensions cannot access certain pages (e.g., `about:`, `addons.mozilla.org`, or internal Firefox pages) for security reasons.

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This project is built to be simple and hackable. Since there is no build step, you can just edit the files and click "Reload" in the Firefox debugging dashboard to see your changes immediately.
