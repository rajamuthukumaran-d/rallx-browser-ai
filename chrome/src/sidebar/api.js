import { DOM } from './dom.js';
import { State } from './state.js';
import { UI } from './ui.js';
import { Chat } from './chat.js';
import { parseMarkdown } from '../utils/markdown_parser.js';

export const API = {
  getModels: async () => {
    const baseUrl = DOM.baseUrlInput.value;
    const apiKey = DOM.apiKeyInput.value;
    const headers = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/models`, { headers });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('403 Forbidden. Check API Key or CORS settings (e.g. OLLAMA_ORIGINS="*").');
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        throw new Error("No models found");
      }

      DOM.modelSelect.innerHTML = "";
      data.data.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        const name = model.id.split("/").pop();
        option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        DOM.modelSelect.appendChild(option);
      });
      API.loadSelectedModel();
      if (DOM.closeSettingsBtn) DOM.closeSettingsBtn.disabled = false;
      if (DOM.settingsToggle) {
        DOM.settingsToggle.disabled = false;
        DOM.settingsPanel.classList.add("collapsed");
        DOM.settingsToggle.classList.add("collapsed");
      }
      UI.updateButtonStates();
    } catch (error) {
      console.error("Error fetching models:", error);
      DOM.settingsPanel.classList.remove("collapsed");
      if (DOM.settingsToggle) {
        DOM.settingsToggle.classList.remove("collapsed");
        DOM.settingsToggle.disabled = true;
      }
      DOM.modelSelect.innerHTML = "<option disabled selected>No Connection</option>";
      if (DOM.closeSettingsBtn) DOM.closeSettingsBtn.disabled = true;

      const msg = error.message.includes("403")
        ? error.message
        : "Could not connect to LLM Server. Check URL.";
      UI.showToast(msg, "warning");
      UI.updateButtonStates();
    }
  },

  saveSelectedModel: () => {
    chrome.storage.local.set({ selectedModel: DOM.modelSelect.value });
  },

  loadSelectedModel: async () => {
    const data = await chrome.storage.local.get("selectedModel");
    if (data.selectedModel) {
      DOM.modelSelect.value = data.selectedModel;
    }
  },

  streamResponse: async (messages, onComplete) => {
    const baseUrl = DOM.baseUrlInput.value;
    DOM.sendPromptBtn.style.display = "none";
    DOM.stopGeneratingBtn.style.display = "grid";
    State.abortController = new AbortController();
    const signal = State.abortController.signal;
    const loadingIndicator = document.createElement("div");
    loadingIndicator.classList.add("loading");
    DOM.chatHistory.appendChild(loadingIndicator);
    DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;

    const startTime = Date.now();
    let tokenCount = 0;

    const apiKey = DOM.apiKeyInput.value;
    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: DOM.modelSelect.value,
          messages: messages,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('403 Forbidden. Check API Key or CORS settings (e.g. OLLAMA_ORIGINS="*").');
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      DOM.chatHistory.removeChild(loadingIndicator);

      const messageElement = document.createElement("div");
      messageElement.classList.add("message", "ai");
      const messageContent = document.createElement("div");
      messageContent.classList.add("message-content");
      messageContent.style.flexGrow = "1";

      const footer = document.createElement("div");
      footer.style.display = "flex";
      footer.style.alignItems = "center";
      footer.style.marginTop = "5px";

      const copyButton = document.createElement("button");
      const copyIcon = document.createElement("img");
      copyIcon.src = "../../assets/icons/copy.svg";
      copyIcon.className = "icon-img";
      copyButton.appendChild(copyIcon);
      copyButton.style.marginLeft = "0";

      const statsSpan = document.createElement("span");
      statsSpan.style.fontSize = "11px";
      statsSpan.style.color = "var(--text-secondary)";
      statsSpan.style.marginLeft = "10px";
      statsSpan.textContent = "Generating...";

      let fullContent = "";

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(fullContent);
      });

      messageElement.appendChild(messageContent);
      footer.appendChild(copyButton);
      footer.appendChild(statsSpan);
      messageElement.appendChild(footer);

      DOM.chatHistory.appendChild(messageElement);
      DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialResponse += decoder.decode(value, { stream: true });
        const lines = partialResponse.split("\n");
        partialResponse = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data.trim() === "[DONE]") {
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                const content = json.choices[0].delta.content;
                fullContent += content;
                tokenCount++;
                messageContent.innerHTML = typeof DOMPurify !== 'undefined'
                  ? DOMPurify.sanitize(parseMarkdown(fullContent), { ADD_ATTR: ["target"] })
                  : parseMarkdown(fullContent);
                DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;
              }
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const tps = duration > 0 ? (tokenCount / duration).toFixed(1) : 0;
      const modelName = DOM.modelSelect.value.split("/").pop();
      const displayModel = modelName.charAt(0).toUpperCase() + modelName.slice(1);

      statsSpan.textContent = `${displayModel} | ${tokenCount} tokens | ${tps} t/s`;

      State.fullMessageLog.push({
        role: "assistant",
        content: fullContent,
        metadata: { model: DOM.modelSelect.value },
      });
      Chat.saveMessageLog();

      DOM.sendPromptBtn.style.display = "grid";
      DOM.stopGeneratingBtn.style.display = "none";

      if (onComplete) {
        onComplete(fullContent);
      }
    } catch (error) {
      if (loadingIndicator.parentNode) {
        DOM.chatHistory.removeChild(loadingIndicator);
      }
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Error sending prompt:", error);
        UI.showToast(error.message, "warning");
      }
      DOM.sendPromptBtn.style.display = "grid";
      DOM.stopGeneratingBtn.style.display = "none";
    }
  }
};
