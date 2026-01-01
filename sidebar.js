document.addEventListener("DOMContentLoaded", () => {
  const baseUrlInput = document.getElementById("base-url");
  const refreshModelsBtn = document.getElementById("refresh-models");
  const modelSelect = document.getElementById("model-select");
  const promptInput = document.getElementById("prompt-input");
  const sendPromptBtn = document.getElementById("send-prompt");
  const summarizePageBtn = document.getElementById("summarize-page");
  const clearChatBtn = document.getElementById("clear-chat");
  const chatHistory = document.getElementById("chat-history");

  const contextIndicator = document.getElementById("context-indicator");
  const contextText = document.getElementById("context-text");
  const removeContextBtn = document.getElementById("remove-context");

  const settingsToggle = document.getElementById("settings-toggle");
  const settingsPanel = document.getElementById("settings-panel");

  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("collapsed");
    settingsToggle.classList.toggle("collapsed");
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

  const DEFAULT_CONTEXT_TOKEN_LIMIT = 3098;

  let selectedContextText = "";
  let lastIgnoredSelection = "";

  const updateContextDisplay = (text) => {
    if (text) {
      selectedContextText = text;
      contextText.textContent = `Selected Context: "${text.substring(0, 50)}${
        text.length > 50 ? "..." : ""
      }"`;
      contextIndicator.style.display = "flex";
      // If we are setting a new context, we can forget about what was previously ignored
      lastIgnoredSelection = "";
    } else {
      selectedContextText = "";
      contextText.textContent = "";
      contextIndicator.style.display = "none";
    }
  };

  const checkSelection = async () => {
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

        // If the selection has changed from what we explicitly ignored, reset the ignore state.
        // This handles the case where user unselects or selects something else.
        // We check if currentSelection is DIFFERENT from lastIgnoredSelection.
        // However, if we just ignored "A", and selection is still "A", we don't want to reset.
        // If selection becomes "B" or "", we reset.
        if (currentSelection !== lastIgnoredSelection) {
          lastIgnoredSelection = "";
        }

        if (
          currentSelection &&
          currentSelection !== selectedContextText &&
          currentSelection !== lastIgnoredSelection
        ) {
          updateContextDisplay(currentSelection);
        }
      }
    } catch (error) {
      // console.log('Error getting selection:', error);
      // content script might not be ready or page restricted
    }
  };

  promptInput.addEventListener("focus", checkSelection);

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPromptBtn.click();
    }
  });

  // Also check when mouse enters the chat area, to catch selections made while sidebar was open
  document
    .querySelector(".chat-container")
    .addEventListener("mouseenter", checkSelection);

  removeContextBtn.addEventListener("click", () => {
    lastIgnoredSelection = selectedContextText;
    updateContextDisplay("");
  });

  const stopGeneratingBtn = document.getElementById("stop-generating");
  let abortController = null;

  const getModels = async () => {
    const baseUrl = baseUrlInput.value;
    try {
      const response = await fetch(`${baseUrl}/models`);
      const data = await response.json();
      modelSelect.innerHTML = "";
      data.data.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });
      loadSelectedModel();
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const saveBaseUrl = () => {
    browser.storage.local.set({ baseUrl: baseUrlInput.value });
  };

  const loadBaseUrl = async () => {
    const data = await browser.storage.local.get("baseUrl");
    if (data.baseUrl) {
      baseUrlInput.value = data.baseUrl;
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

  modelSelect.addEventListener("change", saveSelectedModel);
  const saveBaseUrlBtn = document.getElementById("save-base-url");
  saveBaseUrlBtn.addEventListener("click", saveBaseUrl);

  const saveChatHistory = () => {
    browser.storage.local.set({ chatHistory: chatHistory.innerHTML });
  };

  const loadChatHistory = async () => {
    const data = await browser.storage.local.get("chatHistory");
    if (data.chatHistory) {
      chatHistory.innerHTML = data.chatHistory;
      chatHistory.scrollTop = chatHistory.scrollHeight;

      // Re-add event listeners to copy buttons
      const messages = chatHistory.querySelectorAll(".message");
      messages.forEach((message) => {
        const copyButton = message.querySelector("button");
        const messageContent = message.querySelector("div");
        if (copyButton && messageContent) {
          copyButton.addEventListener("click", () => {
            navigator.clipboard.writeText(messageContent.textContent);
          });
        }
      });
    }
  };

  const streamResponse = async (prompt) => {
    const baseUrl = baseUrlInput.value;
    sendPromptBtn.style.display = "none";
    stopGeneratingBtn.style.display = "block";
    abortController = new AbortController();
    const signal = abortController.signal;
    const loadingIndicator = document.createElement("div");
    loadingIndicator.classList.add("loading");
    chatHistory.appendChild(loadingIndicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelSelect.value,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }),
        signal,
      });

      chatHistory.removeChild(loadingIndicator);

      const messageElement = document.createElement("div");
      messageElement.classList.add("message");
      const messageContent = document.createElement("div");
      // Allow wrapping for long text
      messageContent.style.whiteSpace = "pre-wrap";
      messageContent.style.flexGrow = "1";

      const copyButton = document.createElement("button");
      copyButton.textContent = "Copy";

      let fullContent = "";

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(fullContent);
      });

      messageElement.appendChild(messageContent);
      messageElement.appendChild(copyButton);
      chatHistory.appendChild(messageElement);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialResponse = "";

      const push = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            saveChatHistory();
            sendPromptBtn.style.display = "block";
            stopGeneratingBtn.style.display = "none";
            return;
          }
          partialResponse += decoder.decode(value, { stream: true });
          const lines = partialResponse.split("\n");
          partialResponse = lines.pop();
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data.trim() === "[DONE]") {
                saveChatHistory();
                sendPromptBtn.style.display = "block";
                stopGeneratingBtn.style.display = "none";
                return;
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
                  messageContent.textContent += content;
                  chatHistory.scrollTop = chatHistory.scrollHeight;
                }
              } catch (error) {
                console.error("Error parsing JSON:", error);
              }
            }
          }
          push();
        });
      };
      push();
    } catch (error) {
      if (loadingIndicator.parentNode) {
        chatHistory.removeChild(loadingIndicator);
      }
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Error sending prompt:", error);
      }
      sendPromptBtn.style.display = "block";
      stopGeneratingBtn.style.display = "none";
    }
  };

  sendPromptBtn.addEventListener("click", async () => {
    const prompt = promptInput.value;
    if (prompt) {
      let finalPrompt = prompt;

      const maxTokens =
        parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;

      if (selectedContextText) {
        let contextToUse = selectedContextText;
        // Calculate overhead: "Context:\n" + "\n\nQuestion:\n" + prompt
        const overhead = 21 + prompt.length;

        if (contextToUse.length + overhead > charLimit) {
          const availableSpace = charLimit - overhead;
          if (availableSpace > 0) {
            contextToUse =
              contextToUse.substring(0, availableSpace) + "... (truncated)";
          } else {
            // If prompt is huge, we might not have space for context.
            // Prioritize prompt, drop context or truncate heavily.
            contextToUse = contextToUse.substring(0, 100) + "... (truncated)";
          }
          showToast("Context truncated to fit token limit.", "warning");
        }
        finalPrompt = `Context:\n${contextToUse}\n\nQuestion:\n${prompt}`;
      }

      streamResponse(finalPrompt);
      promptInput.value = "";

      // Reset context
      updateContextDisplay("");
      lastIgnoredSelection = "";
    }
  });

  stopGeneratingBtn.addEventListener("click", () => {
    if (abortController) {
      abortController.abort();
    }
  });

  const maxTokensInput = document.getElementById("max-tokens");

  // ... existing code ...

  const saveMaxTokens = () => {
    browser.storage.local.set({ maxTokens: maxTokensInput.value });
  };

  const loadMaxTokens = async () => {
    const data = await browser.storage.local.get("maxTokens");
    if (data.maxTokens) {
      maxTokensInput.value = data.maxTokens;
    }
  };

  maxTokensInput.addEventListener("change", saveMaxTokens);

  // ... existing code ...

  summarizePageBtn.addEventListener("click", async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tabs || tabs.length === 0) return;
    const tabId = tabs[0].id;

    try {
      const response = await browser.tabs.sendMessage(tabId, {
        action: "get_full_page",
      });
      if (response && response.content) {
        const maxTokens =
          parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
        const charLimit = maxTokens * 4;
        let content = response.content;

        if (content.length > charLimit) {
          content = content.substring(0, charLimit);
          showToast(`Page content truncated to fit token limit.`, "warning");
        }

        const prompt = `Summarize the following web page content: ${content}`;
        streamResponse(prompt);
      }
    } catch (error) {
      console.error("Error getting page content:", error);
    }
  });

  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML = "";
    saveChatHistory();
  });

  refreshModelsBtn.addEventListener("click", () => {
    getModels();
  });

  const init = async () => {
    await loadBaseUrl();
    await loadMaxTokens();

    // Check if configuration exists to auto-collapse
    // We check baseUrlInput.value because it might be the default value which is valid
    const data = await browser.storage.local.get(["baseUrl", "selectedModel"]);
    if (data.baseUrl && data.selectedModel) {
      settingsPanel.classList.add("collapsed");
      settingsToggle.classList.add("collapsed");
    }

    getModels();
    loadChatHistory();
  };

  init();
});
