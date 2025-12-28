# Rallx browser AI

This project is Rallx browser AI, a Firefox browser extension that functions as a sidebar AI assistant. It connects to a local LLM server (like Ollama or LMStudio) to provide services like summarizing web pages and answering user questions. The extension features real-time text streaming of the LLM's responses, automatic detection of available models from the local server, and the ability to use the content of the active tab as context for the AI.

The architecture is based on vanilla JavaScript, with no build steps required, making for a straightforward development process.

## How to Run

Since this is a vanilla JavaScript browser extension, there are no build commands. To run the extension:

1.  Open Firefox.
2.  Navigate to `about:debugging`.
3.  Click "This Firefox".
4.  Click "Load Temporary Add-on...".
5.  Select the `manifest.json` file from the project directory.

## Features

*   **Connect to Local LLM:** Connect to any OpenAI-compatible LLM server.
*   **Summarize Web Pages:** Summarize the content of the active tab.
*   **Contextual Chat:** Use the selected text from the active tab as context for your chat.
*   **Dynamic Model Selection:** Automatically detects and lists available models from your LLM server.
*   **Streaming Responses:** Get real-time responses from the LLM.
*   **Chat History:** Your chat history is saved locally and restored when you open the sidebar.
*   **Copy to Clipboard:** Easily copy messages to your clipboard.
*   **Stop Generation:** Stop the LLM from generating a response.
*   **Clear Chat:** Clear the chat history.

## Development

This project uses vanilla JavaScript, HTML, and CSS. There are no build steps required. The file structure is as follows:

*   `manifest.json`: Defines the extension's properties and permissions.
*   `sidebar.html`: The main UI for the sidebar.
*   `sidebar.css`: Styles for the sidebar.
*   `sidebar.js`: The core logic for API communication, model management, and tab interaction.
*   `background.js`: Handles background tasks, such as keyboard shortcuts.
*   `content_script.js`: Injected into web pages to extract text content.
*   `icons/`: Directory for extension icons.
