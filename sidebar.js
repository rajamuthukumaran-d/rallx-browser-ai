/**
 * Rallx Browser AI
 * Copyright (C) 2026 Rajamuthukumaran D
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

document.addEventListener("DOMContentLoaded", () => {
  const baseUrlInput = document.getElementById("base-url");
  const apiKeyInput = document.getElementById("api-key");
  const refreshModelsBtn = document.getElementById("refresh-models");
  const modelSelect = document.getElementById("model-select");
  const promptInput = document.getElementById("prompt-input");
  const sendPromptBtn = document.getElementById("send-prompt");
  const summarizePageBtn = document.getElementById("summarize-page");
  const clearChatBtn = document.getElementById("clear-chat");
  const chatHistory = document.getElementById("chat-history");

  const contextIndicator = document.getElementById("context-indicator");
  const contextTitle = document.getElementById("context-title");
  const contextDetails = document.getElementById("context-details");
  const contextIcon = document.getElementById("context-icon");
  const contextIconPlaceholder = document.getElementById(
    "context-icon-placeholder"
  );
  const removeContextBtn = document.getElementById("remove-context");
  const summarizeSelectionBtn = document.getElementById("summarize-selection");
  const addPageContextBtn = document.getElementById("add-page-context");

  const settingsToggle = document.getElementById("settings-toggle-toolbar");
  const settingsPanel = document.getElementById("settings-panel");
  const closeSettingsBtn = document.getElementById("close-settings");

  const enableHistoryCheckbox = document.getElementById("enable-history");
  const enableRagCheckbox = document.getElementById("enable-rag");
  const hideContextToastsCheckbox = document.getElementById(
    "hide-context-toasts"
  );
  const maxTokensInput = document.getElementById("max-tokens");

  let cryptoKey = null;

  const initializeEncryption = async () => {
    const data = await browser.storage.local.get("masterKeyJWK");
    if (data.masterKeyJWK) {
      cryptoKey = await EncryptionUtils.importKey(data.masterKeyJWK);
    } else {
      cryptoKey = await EncryptionUtils.generateKey();
      const jwk = await EncryptionUtils.exportKey(cryptoKey);
      await browser.storage.local.set({ masterKeyJWK: jwk });
    }
  };

  if (settingsToggle) {
    settingsToggle.addEventListener("click", () => {
      // Prevent closing if close button is disabled (means connection error)
      if (
        !settingsPanel.classList.contains("collapsed") &&
        closeSettingsBtn.disabled
      ) {
        return;
      }
      settingsPanel.classList.toggle("collapsed");
      settingsToggle.classList.toggle("collapsed");
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
      settingsPanel.classList.add("collapsed");
      if (settingsToggle) {
        settingsToggle.classList.add("collapsed");
      }
    });
  }

  // Close settings on outside click
  document.addEventListener("click", (e) => {
    if (
      !settingsPanel.classList.contains("collapsed") &&
      !closeSettingsBtn.disabled
    ) {
      const isClickInsidePanel = settingsPanel.contains(e.target);
      const isClickOnToggle =
        settingsToggle && settingsToggle.contains(e.target);

      if (!isClickInsidePanel && !isClickOnToggle) {
        settingsPanel.classList.add("collapsed");
        if (settingsToggle) {
          settingsToggle.classList.add("collapsed");
        }
      }
    }
  });

  const showToast = (message, type = "info") => {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    if (type === "warning") {
      toast.classList.add("warning");
    }
    setTimeout(() => {
      toast.className = "toast hidden";
    }, 3000);
  };

  const updateButtonStates = () => {
    const hasModel = modelSelect.value && modelSelect.value !== "No Connection";
    const disabled = !hasModel;

    sendPromptBtn.disabled = disabled;
    if (summarizePageBtn) summarizePageBtn.disabled = disabled;
    if (summarizeSelectionBtn) summarizeSelectionBtn.disabled = disabled;
    if (addPageContextBtn) addPageContextBtn.disabled = disabled;

    if (disabled) {
      sendPromptBtn.classList.add("disabled");
      if (summarizePageBtn) summarizePageBtn.classList.add("disabled");
      if (summarizeSelectionBtn)
        summarizeSelectionBtn.classList.add("disabled");
      if (addPageContextBtn) addPageContextBtn.classList.add("disabled");
    } else {
      sendPromptBtn.classList.remove("disabled");
      if (summarizePageBtn) summarizePageBtn.classList.remove("disabled");
      if (summarizeSelectionBtn)
        summarizeSelectionBtn.classList.remove("disabled");
      if (addPageContextBtn) addPageContextBtn.classList.remove("disabled");
    }
  };

  const DEFAULT_CONTEXT_TOKEN_LIMIT = 3098;

  let selectedContextText = "";
  let selectedContextMetadata = null;
  let lastIgnoredSelection = "";
  let isPageContext = false;

  // Chat History State
  let conversationHistory = [];
  let fullMessageLog = []; // Persistent history of all messages
  let lastContextSignature = "";

  const updateInputPlaceholder = () => {
    const enableHistory = enableHistoryCheckbox.checked;
    const currentContextSig = selectedContextText
      ? selectedContextText.substring(0, 100) + selectedContextText.length
      : "NO_CONTEXT";
    const lastSig = lastContextSignature
      ? lastContextSignature.substring(0, 100) + lastContextSignature.length
      : "NO_CONTEXT";

    const isSameContext = currentContextSig === lastSig;

    if (enableHistory && conversationHistory.length > 0 && isSameContext) {
      promptInput.placeholder = "Ask a follow-up...";
    } else if (selectedContextText) {
      promptInput.placeholder = isPageContext
        ? "Ask about this page..."
        : "Ask about selection...";
    } else {
      promptInput.placeholder = "Ask anything...";
    }
  };

  const updateContextDisplay = (text, isPage = false, metadata = null) => {
    if (text) {
      selectedContextText = text;
      selectedContextMetadata = metadata;
      isPageContext = isPage;

      // Update Title
      if (isPage) {
        contextTitle.textContent =
          metadata && metadata.title ? metadata.title : "Page Content";
      } else {
        contextTitle.textContent = "Selected Text";
      }

      // Update Details (URL or Snippet)
      if (metadata && metadata.url) {
        try {
          const urlObj = new URL(metadata.url);
          contextDetails.textContent =
            urlObj.hostname +
            (urlObj.pathname.length > 1 ? urlObj.pathname : "");
        } catch (e) {
          contextDetails.textContent = metadata.url;
        }
      } else {
        // Fallback to text snippet if no URL
        contextDetails.textContent =
          text.substring(0, 60) + (text.length > 60 ? "..." : "");
      }

      // Update Icon
      if (metadata && metadata.favIconUrl) {
        contextIcon.src = metadata.favIconUrl;
        contextIcon.style.display = "block";
        contextIconPlaceholder.style.display = "none";
      } else {
        contextIcon.style.display = "none";
        contextIconPlaceholder.style.display = "flex";
        contextIconPlaceholder.textContent = isPage ? "📄" : "📝";
      }

      contextIndicator.style.display = "block";

      // Hide summarize selection if it's the full page context
      if (summarizeSelectionBtn)
        summarizeSelectionBtn.style.display = isPage ? "none" : "";
      if (addPageContextBtn) addPageContextBtn.style.display = "none";

      updateInputPlaceholder();
    } else {
      selectedContextText = "";
      selectedContextMetadata = null;
      isPageContext = false;
      contextTitle.textContent = "";
      contextDetails.textContent = "";

      contextIndicator.style.display = "none";
      if (summarizeSelectionBtn) summarizeSelectionBtn.style.display = "none";
      if (addPageContextBtn) addPageContextBtn.style.display = "";
      updateInputPlaceholder();
    }
  };

  if (summarizeSelectionBtn) {
    summarizeSelectionBtn.addEventListener("click", () => {
      if (!modelSelect.value) {
        showToast("Please select a model first", "warning");
        return;
      }
      if (selectedContextText) {
        const maxTokens =
          parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
        const charLimit = maxTokens * 4;
        let finalContent = selectedContextText;

        if (finalContent.length > charLimit) {
          if (enableRagCheckbox.checked) {
            // Smart Selection Strategy
            const introLimit = Math.floor(charLimit * 0.2);
            const outroLimit = Math.floor(charLimit * 0.2);
            const middleLimit = charLimit - introLimit - outroLimit;
            const intro = finalContent.substring(0, introLimit);
            const outro = finalContent.substring(
              finalContent.length - outroLimit
            );
            const middleText = finalContent.substring(
              introLimit,
              finalContent.length - outroLimit
            );
            let middle = "";
            if (middleText.length > 0) {
              const step = Math.floor(middleText.length / 3);
              const chunkLen = Math.floor(middleLimit / 3);
              for (let i = 0; i < 3; i++) {
                const start = i * step;
                const slice = middleText.substring(start, start + chunkLen);
                middle += "\n\n...[skipped]...\n\n" + slice;
              }
            }
            finalContent = intro + middle + "\n\n...[skipped]...\n\n" + outro;
            if (!hideContextToastsCheckbox.checked)
              showToast(
                `Selection content summarized via smart selection to fit limit.`,
                "info"
              );
          } else {
            // Simple Truncation
            finalContent =
              finalContent.substring(0, charLimit) + "... (truncated)";
            if (!hideContextToastsCheckbox.checked)
              showToast(`Selection content truncated to fit limit.`, "warning");
          }
        }

        const urlInfo =
          selectedContextMetadata && selectedContextMetadata.url
            ? `Source URL: ${selectedContextMetadata.url}\n\n`
            : "";
        const prompt = `${urlInfo}Summarize the following text:

${finalContent}`;
        appendUserMessage("Summarize selection");

        // Context switch: Clear history for new distinct task
        conversationHistory = [];
        lastContextSignature = selectedContextText;

        const messages = [{ role: "user", content: prompt }];

        streamResponse(messages, (aiResponse) => {
          if (enableHistoryCheckbox.checked) {
            conversationHistory.push(...messages);
            conversationHistory.push({
              role: "assistant",
              content: aiResponse,
            });
            saveConversationHistory();
            updateInputPlaceholder();
          }
        });
      }
    });
  }

  const getPageContent = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tabs || tabs.length === 0) return null;
    const tab = tabs[0];

    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        action: "get_full_page",
      });
      if (response && response.content) {
        return { content: response.content, tab };
      }
    } catch (error) {
      console.error("Error getting page content:", error);
    }
    return null;
  };

  if (addPageContextBtn) {
    addPageContextBtn.addEventListener("click", async () => {
      // Ignore current selection to prevent immediate revert
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs && tabs.length > 0) {
          const response = await browser.tabs.sendMessage(tabs[0].id, {
            action: "get_selection",
          });
          if (response && response.selection) {
            lastIgnoredSelection = response.selection.trim();
          }
        }
      } catch (e) {
        /* ignore */
      }

      const result = await getPageContent();
      if (result) {
        updateContextDisplay(result.content, true, {
          title: result.tab.title,
          url: result.tab.url,
          favIconUrl: result.tab.favIconUrl,
        });
        promptInput.focus();
      } else {
        showToast("Could not get page content", "warning");
      }
    });
  }

  const checkSelection = async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        const response = await browser.tabs.sendMessage(tab.id, {
          action: "get_selection",
        });
        const currentSelection =
          response && response.selection ? response.selection.trim() : "";

        if (currentSelection !== lastIgnoredSelection) {
          lastIgnoredSelection = "";
        }

        if (
          currentSelection &&
          currentSelection !== selectedContextText &&
          currentSelection !== lastIgnoredSelection
        ) {
          updateContextDisplay(currentSelection, false, {
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
          });
        }
      }
    } catch (error) {
      // content script might not be ready or page restricted
    }
  };

  promptInput.addEventListener("focus", checkSelection);

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendPromptBtn.disabled) {
        sendPromptBtn.click();
      }
    }
  });

  document
    .querySelector(".app-container")
    .addEventListener("mouseenter", checkSelection);

  removeContextBtn.addEventListener("click", () => {
    lastIgnoredSelection = selectedContextText;
    updateContextDisplay("");
  });

  const stopGeneratingBtn = document.getElementById("stop-generating");
  let abortController = null;

  const getModels = async () => {
    const baseUrl = baseUrlInput.value;
    const apiKey = apiKeyInput.value;
    const headers = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/models`, { headers });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            '403 Forbidden. Check API Key or CORS settings (e.g. OLLAMA_ORIGINS="*").'
          );
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        throw new Error("No models found");
      }

      modelSelect.innerHTML = "";
      data.data.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        const name = model.id.split("/").pop();
        option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        modelSelect.appendChild(option);
      });
      loadSelectedModel();
      if (closeSettingsBtn) closeSettingsBtn.disabled = false;
      if (settingsToggle) {
        settingsToggle.disabled = false;
        settingsPanel.classList.add("collapsed");
        settingsToggle.classList.add("collapsed");
      }
      updateButtonStates();
    } catch (error) {
      console.error("Error fetching models:", error);
      settingsPanel.classList.remove("collapsed");
      if (settingsToggle) {
        settingsToggle.classList.remove("collapsed");
        settingsToggle.disabled = true;
      }
      modelSelect.innerHTML =
        "<option disabled selected>No Connection</option>";
      if (closeSettingsBtn) closeSettingsBtn.disabled = true;

      const msg = error.message.includes("403")
        ? error.message
        : "Could not connect to LLM Server. Check URL.";
      showToast(msg, "warning");
      updateButtonStates();
    }
  };

  const saveBaseUrl = () => {
    browser.storage.local.set({ baseUrl: baseUrlInput.value });
  };

  const loadBaseUrl = async () => {
    const data = await browser.storage.local.get(["baseUrl", "apiKey"]);
    if (data.baseUrl) {
      baseUrlInput.value = data.baseUrl;
    }
    if (data.apiKey) {
      if (!cryptoKey) await initializeEncryption();
      const decrypted = await EncryptionUtils.decrypt(data.apiKey, cryptoKey);
      if (decrypted !== null) {
        apiKeyInput.value = decrypted;
      }
    }
  };

  const saveSelectedModel = () => {
    browser.storage.local.set({ selectedModel: modelSelect.value });
  };

  const loadSelectedModel = async () => {
    const data = await browser.storage.local.get("selectedModel");
    if (data.selectedModel) {
      modelSelect.value = data.selectedModel;
    }
  };

  modelSelect.addEventListener("change", () => {
    saveSelectedModel();
    updateButtonStates();
  });

  const saveBaseUrlBtn = document.getElementById("save-base-url");
  saveBaseUrlBtn.addEventListener("click", () => {
    saveBaseUrl();
    getModels();
  });

  const pickProviderBtn = document.getElementById("pick-provider");
  const providerDropdown = document.getElementById("provider-dropdown");

  if (pickProviderBtn && providerDropdown) {
    pickProviderBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent document click from closing immediately
      providerDropdown.classList.toggle("hidden");
    });

    const options = providerDropdown.querySelectorAll(".provider-option");
    options.forEach((option) => {
      option.addEventListener("click", () => {
        baseUrlInput.value = option.getAttribute("data-url");
        providerDropdown.classList.add("hidden");
      });
    });

    // Close on outside click logic is mostly handled by the existing document click listener
    // but that listener specifically targets settings-panel collapse.
    // We should add logic for this specific dropdown or make the existing one generic.

    document.addEventListener("click", (e) => {
      if (
        !providerDropdown.classList.contains("hidden") &&
        !providerDropdown.contains(e.target) &&
        !pickProviderBtn.contains(e.target)
      ) {
        providerDropdown.classList.add("hidden");
      }
    });
  }

  const saveApiKeyBtn = document.getElementById("save-api-key");
  const toggleApiKeyVisibilityBtn = document.getElementById(
    "toggle-api-key-visibility"
  );

  const saveApiKey = async () => {
    if (!cryptoKey) await initializeEncryption();
    const encrypted = await EncryptionUtils.encrypt(
      apiKeyInput.value,
      cryptoKey
    );
    browser.storage.local.set({ apiKey: encrypted });
  };

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener("click", () => {
      saveApiKey();
      getModels();
    });
  }

  if (toggleApiKeyVisibilityBtn) {
    toggleApiKeyVisibilityBtn.addEventListener("click", () => {
      const type =
        apiKeyInput.getAttribute("type") === "password" ? "text" : "password";
      apiKeyInput.setAttribute("type", type);

      const icon = toggleApiKeyVisibilityBtn.querySelector("img");
      if (type === "text") {
        icon.src = "assets/icons/visibility_on.svg";
      } else {
        icon.src = "assets/icons/visibility_off.svg";
      }
    });
  }

  const clearChatToolbar = document.getElementById("clear-chat-toolbar");
  const refreshModelsToolbar = document.getElementById(
    "refresh-models-toolbar"
  );

  if (clearChatToolbar) {
    clearChatToolbar.addEventListener("click", () => clearChatBtn.click());
  }
  if (refreshModelsToolbar) {
    refreshModelsToolbar.addEventListener("click", () =>
      refreshModelsBtn.click()
    );
  }

  const renderMessage = (message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      "message",
      message.role === "user" ? "user" : "ai"
    );

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.style.flexGrow = "1";

    if (message.role === "user") {
      messageContent.textContent = message.content;

      if (message.metadata) {
        const card = document.createElement("div");
        card.className = "page-card";

        if (message.metadata.favIconUrl) {
          const icon = document.createElement("img");
          icon.className = "page-card-icon";
          icon.src = message.metadata.favIconUrl;
          card.appendChild(icon);
        } else {
          const icon = document.createElement("div");
          icon.className = "page-card-icon";
          icon.textContent = "📄";
          icon.style.display = "flex";
          icon.style.alignItems = "center";
          icon.style.justifyContent = "center";
          card.appendChild(icon);
        }

        const info = document.createElement("div");
        info.className = "page-card-info";

        const title = document.createElement("div");
        title.className = "page-card-title";
        title.textContent = message.metadata.title || "Web Page";

        const url = document.createElement("div");
        url.className = "page-card-url";
        try {
          const urlObj = new URL(message.metadata.url);
          url.textContent = urlObj.hostname;
        } catch (e) {
          url.textContent = message.metadata.url;
        }

        info.appendChild(title);
        info.appendChild(url);
        card.appendChild(info);
        messageContent.appendChild(card);
      }
    } else {
      // AI Message
      messageContent.innerHTML = DOMPurify.sanitize(
        parseMarkdown(message.content),
        { ADD_ATTR: ["target"] }
      );
    }

    messageElement.appendChild(messageContent);

    if (message.role === "assistant") {
      const footer = document.createElement("div");
      footer.style.display = "flex";
      footer.style.alignItems = "center";
      footer.style.marginTop = "5px";

      const copyButton = document.createElement("button");
      const copyIcon = document.createElement("img");
      copyIcon.src = "assets/icons/copy.svg";
      copyIcon.className = "icon-img";
      copyButton.appendChild(copyIcon);
      copyButton.style.marginLeft = "0";

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(message.content);
      });

      footer.appendChild(copyButton);

      // Restore stats if available, else just model name if we saved it?
      // For now, minimal footer
      if (message.metadata && message.metadata.model) {
        const statsSpan = document.createElement("span");
        statsSpan.style.fontSize = "11px";
        statsSpan.style.color = "var(--text-secondary)";
        statsSpan.style.marginLeft = "10px";
        // Clean model name
        const modelName = message.metadata.model.split("/").pop();
        statsSpan.textContent =
          modelName.charAt(0).toUpperCase() + modelName.slice(1);
        footer.appendChild(statsSpan);
      }

      messageElement.appendChild(footer);
    }

    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  };

  const saveMessageLog = () => {
    browser.storage.local.set({ messageLog: fullMessageLog });
  };

  const saveConversationHistory = () => {
    browser.storage.local.set({
      conversationHistory: conversationHistory,
      lastContextSignature: lastContextSignature,
    });
  };

  const loadChatHistory = async () => {
    const data = await browser.storage.local.get([
      "messageLog",
      "chatHistory",
      "conversationHistory",
      "lastContextSignature",
    ]);

    // Migration: Security clear of old HTML history
    if (data.chatHistory && !data.messageLog) {
      browser.storage.local.remove("chatHistory");
      chatHistory.innerHTML = "";
      // We start fresh
    }

    if (data.messageLog) {
      fullMessageLog = data.messageLog;
      fullMessageLog.forEach((msg) => renderMessage(msg));
    }

    if (data.conversationHistory) {
      conversationHistory = data.conversationHistory;
    }
    if (data.lastContextSignature) {
      lastContextSignature = data.lastContextSignature;
    }

    updateInputPlaceholder();
  };

  const appendUserMessage = (text, metadata = null) => {
    const message = { role: "user", content: text, metadata };
    fullMessageLog.push(message);
    renderMessage(message);
    saveMessageLog();
    updateInputPlaceholder();
  };

  const streamResponse = async (messages, onComplete) => {
    const baseUrl = baseUrlInput.value;
    sendPromptBtn.style.display = "none";
    stopGeneratingBtn.style.display = "grid";
    abortController = new AbortController();
    const signal = abortController.signal;
    const loadingIndicator = document.createElement("div");
    loadingIndicator.classList.add("loading");
    chatHistory.appendChild(loadingIndicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const startTime = Date.now();
    let tokenCount = 0;

    const apiKey = apiKeyInput.value;
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
          model: modelSelect.value,
          messages: messages,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            '403 Forbidden. Check API Key or CORS settings (e.g. OLLAMA_ORIGINS="*").'
          );
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      chatHistory.removeChild(loadingIndicator);

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
      copyIcon.src = "assets/icons/copy.svg";
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

      chatHistory.appendChild(messageElement);
      chatHistory.scrollTop = chatHistory.scrollHeight;

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
              if (
                json.choices &&
                json.choices[0].delta &&
                json.choices[0].delta.content
              ) {
                const content = json.choices[0].delta.content;
                fullContent += content;
                tokenCount++;
                messageContent.innerHTML = DOMPurify.sanitize(
                  parseMarkdown(fullContent),
                  { ADD_ATTR: ["target"] }
                );
                chatHistory.scrollTop = chatHistory.scrollHeight;
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
      const modelName = modelSelect.value.split("/").pop();
      const displayModel =
        modelName.charAt(0).toUpperCase() + modelName.slice(1);

      statsSpan.textContent = `${displayModel} | ${tokenCount} tokens | ${tps} t/s`;

      // Save complete message to log
      fullMessageLog.push({
        role: "assistant",
        content: fullContent,
        metadata: { model: modelSelect.value },
      });
      saveMessageLog();

      sendPromptBtn.style.display = "grid";
      stopGeneratingBtn.style.display = "none";

      if (onComplete) {
        onComplete(fullContent);
      }
    } catch (error) {
      if (loadingIndicator.parentNode) {
        chatHistory.removeChild(loadingIndicator);
      }
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Error sending prompt:", error);
        showToast(error.message, "warning");
      }
      sendPromptBtn.style.display = "grid";
      stopGeneratingBtn.style.display = "none";
    }
  };

  sendPromptBtn.addEventListener("click", async () => {
    if (!modelSelect.value) {
      showToast("Please select a model first", "warning");
      return;
    }
    const prompt = promptInput.value;
    if (prompt) {
      appendUserMessage(prompt); // Display just the question

      let finalPrompt = prompt;
      let contextToUse = selectedContextText;
      const maxTokens =
        parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;

      // Process Context (RAG/Truncation)
      if (contextToUse) {
        // ... (Same context processing logic as before) ...
        const overhead = 21 + prompt.length;
        if (contextToUse.length + overhead > charLimit) {
          const availableSpace = charLimit - overhead;
          if (availableSpace > 0) {
            if (typeof RAGEngine !== "undefined" && enableRagCheckbox.checked) {
              const retrieved = RAGEngine.retrieve(
                selectedContextText,
                prompt,
                availableSpace
              );
              if (retrieved && retrieved.length < selectedContextText.length) {
                contextToUse = retrieved;
                if (!hideContextToastsCheckbox.checked)
                  showToast("Large context: Used relevant snippets.", "info");
              } else {
                contextToUse =
                  contextToUse.substring(0, availableSpace) + "... (truncated)";
                if (!hideContextToastsCheckbox.checked)
                  showToast("Context truncated to fit token limit.", "warning");
              }
            } else {
              contextToUse =
                contextToUse.substring(0, availableSpace) + "... (truncated)";
              if (!hideContextToastsCheckbox.checked)
                showToast("Context truncated to fit token limit.", "warning");
            }
          } else {
            contextToUse = contextToUse.substring(0, 100) + "... (truncated)";
          }
        }

        // Construct the prompt string that INCLUDES context
        const urlInfo =
          selectedContextMetadata && selectedContextMetadata.url
            ? `Source URL: ${selectedContextMetadata.url}\n\n`
            : "";
        
        finalPrompt = `You are a helpful browser assistant.

${urlInfo}Context:
${contextToUse}

Question:
${prompt}

Instructions:
1. Answer the question using the provided context if possible.
2. If the answer is not in the context, use your general knowledge or search the web if you are able to do so.
3. Do not simply state that the information is missing from the context unless you cannot answer from general knowledge either.`;
      }

      // HISTORY LOGIC
      let messagesToSend = [];
      const enableHistory = enableHistoryCheckbox.checked;

      // Check if context has changed
      if (enableHistory) {
        const currentContextSig = selectedContextText
          ? selectedContextText.substring(0, 100) + selectedContextText.length
          : "NO_CONTEXT";
        const lastContextSig = lastContextSignature
          ? lastContextSignature.substring(0, 100) + lastContextSignature.length
          : "NO_CONTEXT";

        // If context changed, reset history
        if (currentContextSig !== lastContextSig) {
          conversationHistory = [];
          lastContextSignature = selectedContextText;
        }
      } else {
        // If history disabled, always reset (stateless)
        conversationHistory = [];
      }

      if (enableHistory && conversationHistory.length > 0) {
        // FOLLOW-UP QUESTION
        // We assume the context was already sent in the history.
        // BUT, if the previous message didn't have context (general chat) and now we have context, we must include it.
        // Or if we had context and now we don't.

        // Simplification: If context is active now, we include it in THIS message if it wasn't the starter.
        // Actually, if we cleared history on context change (above), then:
        // 1. If history is empty: We are starting. Send `finalPrompt` (Context + Q).
        // 2. If history is NOT empty: We are following up on SAME context. Send `prompt` (Q only).

        messagesToSend = [
          ...conversationHistory,
          { role: "user", content: prompt },
        ];
      } else {
        // FIRST QUESTION (or History Disabled)
        // Send `finalPrompt` (Context + Q)
        // We add `finalPrompt` to history so the context is remembered for next time.
        messagesToSend = [{ role: "user", content: finalPrompt }];
      }

      streamResponse(messagesToSend, (aiResponse) => {
        if (enableHistory) {
          // Update History
          if (conversationHistory.length === 0) {
            // First turn: save the context-laden prompt
            conversationHistory.push({ role: "user", content: finalPrompt });
          } else {
            // Follow up: save the simple prompt
            conversationHistory.push({ role: "user", content: prompt });
          }
          conversationHistory.push({ role: "assistant", content: aiResponse });
          saveConversationHistory();
          updateInputPlaceholder();
        }
      });

      promptInput.value = "";
    }
  });

  stopGeneratingBtn.addEventListener("click", () => {
    if (abortController) {
      abortController.abort();
    }
  });

  const saveMaxTokens = () => {
    browser.storage.local.set({ maxTokens: maxTokensInput.value });
  };

  const saveEnableHistory = () => {
    browser.storage.local.set({ enableHistory: enableHistoryCheckbox.checked });
    updateInputPlaceholder();
  };

  const saveEnableRag = () => {
    browser.storage.local.set({ enableRag: enableRagCheckbox.checked });
  };

  const saveHideContextToasts = () => {
    browser.storage.local.set({
      hideContextToasts: hideContextToastsCheckbox.checked,
    });
  };

  const loadSettings = async () => {
    const data = await browser.storage.local.get([
      "maxTokens",
      "enableHistory",
      "enableRag",
      "hideContextToasts",
    ]);
    if (data.maxTokens) {
      maxTokensInput.value = data.maxTokens;
    }
    if (data.enableHistory !== undefined) {
      enableHistoryCheckbox.checked = data.enableHistory;
    }
    if (data.enableRag !== undefined) {
      enableRagCheckbox.checked = data.enableRag;
    }
    if (data.hideContextToasts !== undefined) {
      hideContextToastsCheckbox.checked = data.hideContextToasts;
    }
  };

  maxTokensInput.addEventListener("change", saveMaxTokens);
  enableHistoryCheckbox.addEventListener("change", saveEnableHistory);
  enableRagCheckbox.addEventListener("change", saveEnableRag);
  hideContextToastsCheckbox.addEventListener("change", saveHideContextToasts);

  summarizePageBtn.addEventListener("click", async () => {
    if (!modelSelect.value) {
      showToast("Please select a model first", "warning");
      return;
    }
    const result = await getPageContent();
    if (result) {
      const { content, tab } = result;
      const maxTokens =
        parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;
      let finalContent = content;

      if (finalContent.length > charLimit) {
        if (enableRagCheckbox.checked) {
          // Smart Selection Strategy
          const introLimit = Math.floor(charLimit * 0.2);
          const outroLimit = Math.floor(charLimit * 0.2);
          const middleLimit = charLimit - introLimit - outroLimit;
          const intro = finalContent.substring(0, introLimit);
          const outro = finalContent.substring(
            finalContent.length - outroLimit
          );
          const middleText = finalContent.substring(
            introLimit,
            finalContent.length - outroLimit
          );
          let middle = "";
          if (middleText.length > 0) {
            const step = Math.floor(middleText.length / 3);
            const chunkLen = Math.floor(middleLimit / 3);
            for (let i = 0; i < 3; i++) {
              const start = i * step;
              const slice = middleText.substring(start, start + chunkLen);
              middle += "\n\n...[skipped]...\n\n" + slice;
            }
          }
          finalContent = intro + middle + "\n\n...[skipped]...\n\n" + outro;
          if (!hideContextToastsCheckbox.checked)
            showToast(
              `Page content summarized via smart selection to fit limit.`,
              "info"
            );
        } else {
          // Simple Truncation
          finalContent =
            finalContent.substring(0, charLimit) + "... (truncated)";
          if (!hideContextToastsCheckbox.checked)
            showToast(`Page content truncated to fit limit.`, "warning");
        }
      }

      const urlInfo = tab.url ? `Source URL: ${tab.url}\n\n` : "";
      const prompt = `${urlInfo}Summarize the following web page content: ${finalContent}`;
      appendUserMessage("Summarize this page", {
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
      });

      // RESET HISTORY for new summary
      conversationHistory = [];
      lastContextSignature = content; // Implicit context

      const messages = [{ role: "user", content: prompt }];

      streamResponse(messages, (aiResponse) => {
        if (enableHistoryCheckbox.checked) {
          conversationHistory.push(...messages);
          conversationHistory.push({ role: "assistant", content: aiResponse });
          saveConversationHistory();
          updateInputPlaceholder();

          // Implicitly set context so user can ask follow ups
          updateContextDisplay(content, true, {
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
          });
        }
      });
    }
  });

  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML = "";
    conversationHistory = [];
    fullMessageLog = [];
    lastContextSignature = "";
    saveMessageLog();
    saveConversationHistory();
    updateInputPlaceholder();
  });

  refreshModelsBtn.addEventListener("click", () => {
    getModels();
  });

  const initializeContext = async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs && tabs.length > 0) {
        const response = await browser.tabs.sendMessage(tabs[0].id, {
          action: "get_selection",
        });
        const currentSelection =
          response && response.selection ? response.selection.trim() : "";

        if (currentSelection) {
          updateContextDisplay(currentSelection, false, {
            title: tabs[0].title,
            url: tabs[0].url,
            favIconUrl: tabs[0].favIconUrl,
          });
          return;
        }
      }
    } catch (error) {
      // Ignore errors (e.g. restricted pages)
    }

    // Fallback to page content
    const result = await getPageContent();
    if (result) {
      updateContextDisplay(result.content, true, {
        title: result.tab.title,
        url: result.tab.url,
        favIconUrl: result.tab.favIconUrl,
      });
    }
  };

  const init = async () => {
    await initializeEncryption();
    await loadBaseUrl();
    await loadSettings();

    const data = await browser.storage.local.get(["baseUrl", "selectedModel"]);
    if (data.baseUrl && data.selectedModel) {
      settingsPanel.classList.add("collapsed");
      settingsToggle.classList.add("collapsed");
    }

    getModels();
    loadChatHistory();
    initializeContext();
  };

  init();
});
