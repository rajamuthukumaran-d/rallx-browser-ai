# Project Overview

This project is Rallx browser AI, a Firefox browser extension that functions as a sidebar AI assistant. It connects to local or remote LLM servers (like Ollama, LMStudio, Gemini, or OpenAI) to provide services like summarizing web pages and answering user questions. The extension features real-time text streaming of the LLM's responses, automatic detection of available models, and the ability to use the content of the active tab as context for the AI.

The architecture is based on vanilla JavaScript, with no build steps required, making for a straightforward development process.

## Building and Running

Since this is a vanilla JavaScript browser extension, there are no build commands. To run the extension:

1.  Open Firefox.
2.  Navigate to `about:debugging`.
3.  Click "This Firefox".
4.  Click "Load Temporary Add-on...".
5.  Select the `manifest.json` file from the project directory.

## Development Conventions

- **No Build Step:** The project uses vanilla JavaScript, HTML, and CSS. No transpilation or bundling is needed.
- **API:** The extension communicates with a local LLM server using an OpenAI-compatible Chat Completions API.
- **Manifest:** The project uses Firefox's Manifest V3.
- **File Structure:**
  - `manifest.json`: Defines the extension's properties and permissions.
  - `sidebar.html`: The main UI for the sidebar.
  - `sidebar.css`: Styles for the sidebar.
  - `sidebar.js`: The core logic for API communication, model management, and tab interaction.
  - `background.js`: Handles background tasks, such as keyboard shortcuts.
  - `content_script.js`: Injected into web pages to extract text content.
  - `icons/`: Directory for extension icons.
