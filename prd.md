# PRD: Rallx Browser Ai

Version: 2.1

Target Platform: Firefox (Manifest V3)

Backend: Local LLM (Ollama / LMStudio)

Architecture Style: Vanilla JS (No build steps required)

## 1. Project Overview

Develop a Firefox browser extension that acts as a sidebar AI assistant. It connects to a local LLM server to summarize web pages and answer questions. It features real-time text streaming, automatic model detection from the local server, and intelligent context injection from the active tab.

## 2. Technical Stack & Constraints

- **Manifest Version:** V3
- **Permissions:** `activeTab`, `scripting`, `storage`, `sidebars`, `nativeMessaging` (optional, but standard host permissions are required).
- **Host Permissions:** `http://localhost/*`, `http://127.0.0.1/*`
- **API Standard:** OpenAI-compatible Chat Completions API.

## 3. Core Feature Requirements

### Feature 1: Sidebar Activation & Context

- **Trigger:** Toolbar Icon or `Ctrl+Shift+E`.
- **Context Logic:**
  - On load, the sidebar queries the active tab.
  - If text is selected: The text is captured and visually quoted in the chat input area as context.

### Feature 2: Page Summarization

- **Trigger:** "Summarize Page" button in the sidebar.
- **Logic:**
  - Extract `document.body.innerText` from the active tab.
  - **Constraint:** Do NOT truncate text (User specified no limit). Send full content.
  - Prompt: _"Summarize the following web page content: [Page Content]"_

### Feature 3: Dynamic Model Management

- **Settings UI:** A configuration section (can be a collapsible header) to set the Base URL (Default: `http://localhost:11434/v1`).
- **Auto-Detection:**
  - On initialization (or via a "Refresh" button), fetch available models.
  - **Ollama Endpoint:** `/api/tags` or OpenAI compat `/v1/models`.
  - **LMStudio Endpoint:** `/v1/models`.
  - Populate a `<select>` dropdown with the available model names.

### Feature 4: Streaming Responses

- **Networking:** Use the `fetch` API with standard Server-Sent Events (SSE) handling.
- **Display:**
  - Parse the incoming data chunks (typically `data: { ... }`).
  - Append delta content to the chat interface in real-time.
  - Ensure the UI auto-scrolls to the bottom as new tokens arrive.

### Feature 5: Copy to Clipboard
- **Trigger:** "Copy" button on each message.
- **Logic:**
    - On click, the content of the message is copied to the clipboard.

### Feature 6: Clear Chat History
- **Trigger:** "Clear Chat" button.
- **Logic:**
    - On click, the chat history is cleared.

### Feature 7: Chat History Persistence
- **Logic:**
    - The chat history, selected model, and Base URL are saved to local storage.
    - The chat history, selected model, and Base URL are loaded from local storage when the extension is opened.

### Feature 8: Stop Generation
- **Trigger:** "Stop" button.
- **Logic:**
    - On click, the generation of the response is stopped.

---

## 4. Technical Architecture & File Structure

### A. File Structure

Plaintext
```
/
├── manifest.json
├── sidebar.html        # Main UI (Chat + Settings + Dropdown)
├── sidebar.css         # Styling
├── sidebar.js          # Logic: API Streaming, Model Fetching, Tab comms
├── background.js       # Shortcut handling
├── content_script.js   # Text extraction
└── icons/              # (Placeholder icons)
```

### B. `manifest.json` Key Configuration

JSON
```
{
  "manifest_version": 3,
  "name": "Firefox Local AI",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["http://localhost/*", "http://127.0.0.1/*"],
  "sidebar_action": {
    "default_panel": "sidebar.html"
  },
  "commands": {
    "_execute_sidebar_action": {
      "suggested_key": { "default": "Ctrl+Shift+E" }
    }
  }
}
```

### C. Logic Flows

**1. Model Auto-Detection (`sidebar.js`):**

- Function `fetchModels(baseUrl)`:
  - Try fetching `GET /v1/models`.
  - Map response JSON to extracting `id` (model name).
  - Update the `<select id="model-select">` element.

**2. Streaming Request (`sidebar.js`):**

- Use `fetch(url, { method: 'POST', body: ... })`.
- Get `response.body.getReader()`.
- Loop through `reader.read()`:
  - Decode `value`.
  - Split by newline (handling multiple data chunks).
  - Parse JSON (ignoring `[DONE]`).
  - Extract `choices[0].delta.content`.
  - Update `innerHTML`.

**3. Content Script (`content_script.js`):**

- Listen for `get_full_page` -> Return `document.body.innerText`.
- Listen for `get_selection` -> Return `window.getSelection().toString()`.

---

