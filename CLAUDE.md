# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rallx Browser AI is a browser extension (Firefox + Chrome) that adds a sidebar AI assistant. It connects to any OpenAI-compatible LLM endpoint (Ollama, LM Studio, Gemini, OpenAI) and can summarize pages, answer questions about selected text, and maintain conversation history. Built with vanilla JS ES modules — no build step, no bundler.

## Running the Extension

**Firefox:**
1. Navigate to `about:debugging` → "This Firefox" → "Load Temporary Add-on..."
2. Select the root `manifest.json`
3. After any JS/CSS change: click "Reload" next to the extension in `about:debugging`

**Chrome:**
1. Navigate to `chrome://extensions` → Enable "Developer mode" → "Load unpacked"
2. Select the `chrome/` directory (it has its own `manifest.json`)

**Packaging for Firefox Add-on Store:**
```bash
./package.sh   # produces build/rallx-browser-ai.zip
```

## Architecture

The sidebar is a collection of single-responsibility ES modules loaded via `<script type="module">` in `sidebar.html`. All event wiring lives in `src/sidebar/index.js`.

### Module Responsibilities

| Module | Role |
|--------|------|
| `src/sidebar/index.js` | Entry point — wires all DOM events and calls `init()` |
| `src/sidebar/state.js` | Single mutable `State` object shared across all modules |
| `src/sidebar/dom.js` | Getter-based `DOM` object — every DOM reference is a live getter |
| `src/sidebar/api.js` | `API.getModels()` and `API.streamResponse()` — all LLM communication |
| `src/sidebar/chat.js` | Renders messages, saves/loads the message log and conversation history |
| `src/sidebar/context.js` | Page content extraction and text selection detection |
| `src/sidebar/settings.js` | Loads/saves all `browser.storage.local` settings; manages encryption init |
| `src/sidebar/ui.js` | Toast notifications, button disabled states, input placeholder text |
| `src/utils/rag.js` | Lexical (keyword) RAG — chunks text and scores chunks against the query |
| `src/utils/encryption_utils.js` | AES-GCM encrypt/decrypt via Web Crypto API for API key storage |
| `src/utils/markdown_parser.js` | Markdown → HTML; output is sanitized via DOMPurify before insertion |
| `src/background.js` | Toggles sidebar on toolbar click and keyboard shortcut (`Ctrl+Shift+E`) |
| `src/content_script.js` | Injected into every page; responds to `get_selection` and `get_full_page` messages |

### Key Data Flow

**Sending a message:**
1. `index.js` reads `DOM.promptInput`, constructs `finalPrompt` (appending `State.selectedContextText` if present)
2. If RAG is enabled and context exceeds the token limit, `RAGEngine.retrieve()` scores and selects relevant chunks
3. `API.streamResponse(messages, onComplete)` POSTs to `{baseUrl}/chat/completions` with `stream: true`
4. The SSE stream is decoded line-by-line; `parseMarkdown()` + `DOMPurify.sanitize()` renders each chunk into the AI message element
5. On completion, `State.fullMessageLog` (display log) and `State.conversationHistory` (LLM context) are both updated and persisted via `browser.storage.local`

**Context detection:**
- On sidebar focus/mouseenter, `ContextManager.checkSelection()` polls the active tab via `browser.tabs.sendMessage({action: "get_selection"})` to auto-populate selected text as context
- `State.lastIgnoredSelection` prevents re-offering text the user has already dismissed

**Conversation history reset:**
- History is reset when `State.selectedContextText` changes (detected by comparing a 100-char prefix + length "signature" stored in `State.lastContextSignature`)

### Two Separate Storage Structures

- `fullMessageLog` — what's shown in the chat UI; persists across sessions
- `conversationHistory` — what gets sent to the LLM (alternating user/assistant turns); reset when context changes or history is disabled

### Chrome vs Firefox Differences

The `chrome/` directory is a self-contained Chrome package that shares `src/` JS modules and `assets/` with the Firefox root, but has its own `manifest.json`. Key API differences:

| Firefox | Chrome |
|---------|--------|
| `sidebar_action` in manifest | `side_panel` in manifest |
| `browser.sidebarAction.toggle()` | `chrome.sidePanel.setPanelBehavior(...)` |
| `background.scripts` array | `background.service_worker` |
| No `tabs` permission needed | Requires `tabs` permission |

The sidebar JS itself uses `browser.*` — Chrome's MV3 provides a `browser` compatibility namespace, so no polyfill is needed.

## Cross-Browser Parity

**Any change made to the Firefox extension must also be applied to the Chrome package (`chrome/`) unless the user explicitly says otherwise.** This includes new features, bug fixes, UI changes, new settings, and content script updates. The shared `src/` modules and `assets/` are used by both, so changes there apply automatically — but review `chrome/manifest.json` and `chrome/src/background.js` whenever `manifest.json` or `src/background.js` change, since those files diverge due to browser API differences.

## Development Conventions

- **DOM access**: Always use `DOM.<name>` getters (defined in `dom.js`), never `document.getElementById()` directly in other modules.
- **State mutations**: Mutate `State` properties directly from any module — it's a plain shared object, not reactive.
- **Token budget**: The extension converts token limits to character limits using a 4 chars/token approximation (`charLimit = maxTokens * 4`).
- **XSS prevention**: All AI-generated HTML must go through `DOMPurify.sanitize()` before being set as `innerHTML`. The `purify.min.js` library is bundled in `src/libs/`.
- **Storage keys**: `baseUrl`, `selectedModel`, `apiKey` (encrypted), `masterKeyJWK`, `maxTokens`, `enableHistory`, `enableRag`, `includePageContent`, `hideContextToasts`, `messageLog`, `conversationHistory`, `lastContextSignature`
