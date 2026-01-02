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
  const maxTokensInput = document.getElementById("max-tokens");

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
      if (summarizeSelectionBtn) summarizeSelectionBtn.classList.add("disabled");
      if (addPageContextBtn) addPageContextBtn.classList.add("disabled");
    } else {
      sendPromptBtn.classList.remove("disabled");
      if (summarizePageBtn) summarizePageBtn.classList.remove("disabled");
      if (summarizeSelectionBtn) summarizeSelectionBtn.classList.remove("disabled");
      if (addPageContextBtn) addPageContextBtn.classList.remove("disabled");
    }
  };

  const DEFAULT_CONTEXT_TOKEN_LIMIT = 3098;

  let selectedContextText = "";
  let lastIgnoredSelection = "";
  let isPageContext = false;
  
  // Chat History State
  let conversationHistory = [];
  let lastContextSignature = "";

  const updateInputPlaceholder = () => {
    const enableHistory = enableHistoryCheckbox.checked;
    const currentContextSig = selectedContextText ? selectedContextText.substring(0, 100) + selectedContextText.length : "NO_CONTEXT";
    const lastSig = lastContextSignature ? lastContextSignature.substring(0, 100) + lastContextSignature.length : "NO_CONTEXT";
    
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
        const prompt = `Summarize the following text:

${selectedContextText}`;
        appendUserMessage("Summarize selection");
        
        // Context switch: Clear history for new distinct task
        conversationHistory = [];
        lastContextSignature = selectedContextText;

        const messages = [{ role: "user", content: prompt }];
        
        streamResponse(messages, (aiResponse) => {
            if (enableHistoryCheckbox.checked) {
                conversationHistory.push(...messages);
                conversationHistory.push({ role: "assistant", content: aiResponse });
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
      } catch(e) { /* ignore */ }

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
    try {
      const response = await fetch(`${baseUrl}/models`);
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
      showToast("Could not connect to LLM Server. Check URL.", "warning");
      updateButtonStates();
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

  modelSelect.addEventListener("change", () => {
    saveSelectedModel();
    updateButtonStates();
  });

  const saveBaseUrlBtn = document.getElementById("save-base-url");
  saveBaseUrlBtn.addEventListener("click", () => {
    saveBaseUrl();
    getModels();
  });

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

  const saveChatHistory = () => {
    browser.storage.local.set({ chatHistory: chatHistory.innerHTML });
  };
  
  const saveConversationHistory = () => {
    browser.storage.local.set({
        conversationHistory: conversationHistory,
        lastContextSignature: lastContextSignature
    });
  };

  const loadChatHistory = async () => {
    const data = await browser.storage.local.get(["chatHistory", "conversationHistory", "lastContextSignature"]);
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
    
    if (data.conversationHistory) {
        conversationHistory = data.conversationHistory;
    }
    if (data.lastContextSignature) {
        lastContextSignature = data.lastContextSignature;
    }
    
    updateInputPlaceholder();
  };

  const appendUserMessage = (text, metadata = null) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", "user");

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.textContent = text;

    if (metadata) {
      const card = document.createElement("div");
      card.className = "page-card";

      if (metadata.favIconUrl) {
        const icon = document.createElement("img");
        icon.className = "page-card-icon";
        icon.src = metadata.favIconUrl;
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
      title.textContent = metadata.title || "Web Page";

      const url = document.createElement("div");
      url.className = "page-card-url";
      try {
        const urlObj = new URL(metadata.url);
        url.textContent = urlObj.hostname;
      } catch (e) {
        url.textContent = metadata.url;
      }

      info.appendChild(title);
      info.appendChild(url);
      card.appendChild(info);
      messageContent.appendChild(card);
    }

    messageElement.appendChild(messageContent);
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    saveChatHistory();
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

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelSelect.value,
          messages: messages,
          stream: true,
        }),
        signal,
      });

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
                messageContent.innerHTML = parseMarkdown(fullContent);
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
      const displayModel = modelName.charAt(0).toUpperCase() + modelName.slice(1);

      statsSpan.textContent = `${displayModel} | ${tokenCount} tokens | ${tps} t/s`;

      saveChatHistory();
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
      const maxTokens = parseInt(maxTokensInput.value, 10) || DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;

      // Process Context (RAG/Truncation)
      if (contextToUse) {
        // ... (Same context processing logic as before) ...
        const overhead = 21 + prompt.length;
        if (contextToUse.length + overhead > charLimit) {
          const availableSpace = charLimit - overhead;
          if (availableSpace > 0) {
            if (typeof RAGEngine !== 'undefined') {
                const retrieved = RAGEngine.retrieve(selectedContextText, prompt, availableSpace);
                if (retrieved && retrieved.length < selectedContextText.length) {
                    contextToUse = retrieved;
                    showToast("Large context: Used relevant snippets.", "info");
                } else {
                    contextToUse = contextToUse.substring(0, availableSpace) + "... (truncated)";
                    showToast("Context truncated to fit token limit.", "warning");
                }
            } else {
                contextToUse = contextToUse.substring(0, availableSpace) + "... (truncated)";
                showToast("Context truncated to fit token limit.", "warning");
            }
          } else {
            contextToUse = contextToUse.substring(0, 100) + "... (truncated)";
          }
        }
        
        // Construct the prompt string that INCLUDES context
        finalPrompt = `Context:
${contextToUse}

Question:
${prompt}`;
      }

      // HISTORY LOGIC
      let messagesToSend = [];
      const enableHistory = enableHistoryCheckbox.checked;

      // Check if context has changed
      if (enableHistory) {
          const currentContextSig = selectedContextText ? selectedContextText.substring(0, 100) + selectedContextText.length : "NO_CONTEXT";
          const lastContextSig = lastContextSignature ? lastContextSignature.substring(0, 100) + lastContextSignature.length : "NO_CONTEXT";
          
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
          
          messagesToSend = [...conversationHistory, { role: "user", content: prompt }];
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

  const loadSettings = async () => {
    const data = await browser.storage.local.get(["maxTokens", "enableHistory"]);
    if (data.maxTokens) {
      maxTokensInput.value = data.maxTokens;
    }
    if (data.enableHistory !== undefined) {
        enableHistoryCheckbox.checked = data.enableHistory;
    }
  };

  maxTokensInput.addEventListener("change", saveMaxTokens);
  enableHistoryCheckbox.addEventListener("change", saveEnableHistory);

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
        const introLimit = Math.floor(charLimit * 0.2);
        const outroLimit = Math.floor(charLimit * 0.2);
        const middleLimit = charLimit - introLimit - outroLimit;
        const intro = finalContent.substring(0, introLimit);
        const outro = finalContent.substring(finalContent.length - outroLimit);
        const middleText = finalContent.substring(introLimit, finalContent.length - outroLimit);
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
        showToast(`Page content summarized via smart selection to fit limit.`, "info");
      }

      const prompt = `Summarize the following web page content: ${finalContent}`;
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
                        favIconUrl: tab.favIconUrl
                    });
                }
            });    }
  });

  clearChatBtn.addEventListener("click", () => {
    chatHistory.innerHTML = "";
    conversationHistory = [];
    lastContextSignature = "";
    saveChatHistory();
    saveConversationHistory();
    updateInputPlaceholder();
  });

  refreshModelsBtn.addEventListener("click", () => {
    getModels();
  });

  const init = async () => {
    await loadBaseUrl();
    await loadSettings();

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