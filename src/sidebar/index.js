import { DOM } from './dom.js';
import { State } from './state.js';
import { UI } from './ui.js';
import { Settings } from './settings.js';
import { Chat } from './chat.js';
import { API } from './api.js';
import { ContextManager } from './context.js';
import { RAGEngine } from '../utils/rag.js';

const init = async () => {
  await Settings.initializeEncryption();
  await Settings.loadBaseUrl();
  await Settings.loadSettings();

  const data = await browser.storage.local.get(["baseUrl", "selectedModel"]);
  if (data.baseUrl && data.selectedModel) {
    if (DOM.settingsPanel) DOM.settingsPanel.classList.add("collapsed");
    if (DOM.settingsToggle) DOM.settingsToggle.classList.add("collapsed");
  }

  API.getModels();
  Chat.loadChatHistory();
  ContextManager.initializeContext();
};

if (DOM.settingsToggle) {
  DOM.settingsToggle.addEventListener("click", () => {
    if (!DOM.settingsPanel.classList.contains("collapsed") && DOM.closeSettingsBtn.disabled) return;
    DOM.settingsPanel.classList.toggle("collapsed");
    DOM.settingsToggle.classList.toggle("collapsed");
  });
}

if (DOM.closeSettingsBtn) {
  DOM.closeSettingsBtn.addEventListener("click", () => {
    DOM.settingsPanel.classList.add("collapsed");
    if (DOM.settingsToggle) DOM.settingsToggle.classList.add("collapsed");
  });
}

document.addEventListener("click", (e) => {
  if (!DOM.settingsPanel.classList.contains("collapsed") && !DOM.closeSettingsBtn.disabled) {
    const isClickInsidePanel = DOM.settingsPanel.contains(e.target);
    const isClickOnToggle = DOM.settingsToggle && DOM.settingsToggle.contains(e.target);

    if (!isClickInsidePanel && !isClickOnToggle) {
      DOM.settingsPanel.classList.add("collapsed");
      if (DOM.settingsToggle) DOM.settingsToggle.classList.add("collapsed");
    }
  }
});

if (DOM.summarizeSelectionBtn) {
  DOM.summarizeSelectionBtn.addEventListener("click", () => {
    if (!DOM.modelSelect.value) {
      UI.showToast("Please select a model first", "warning");
      return;
    }
    if (State.selectedContextText) {
      const maxTokens = parseInt(DOM.maxTokensInput.value, 10) || State.DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;
      let finalContent = State.selectedContextText;

      if (finalContent.length > charLimit) {
        if (DOM.enableRagCheckbox.checked) {
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
          if (!DOM.hideContextToastsCheckbox.checked) UI.showToast(`Selection content summarized via smart selection to fit limit.`, "info");
        } else {
          finalContent = finalContent.substring(0, charLimit) + "... (truncated)";
          if (!DOM.hideContextToastsCheckbox.checked) UI.showToast(`Selection content truncated to fit limit.`, "warning");
        }
      }

      const urlInfo = State.selectedContextMetadata && State.selectedContextMetadata.url
        ? `Source URL: ${State.selectedContextMetadata.url}\n\n` : "";
      const prompt = `${urlInfo}Summarize the following text:\n\n${finalContent}`;
      Chat.appendUserMessage("Summarize selection");

      State.conversationHistory = [];
      State.lastContextSignature = State.selectedContextText;

      const messages = [{ role: "user", content: prompt }];
      API.streamResponse(messages, (aiResponse) => {
        if (DOM.enableHistoryCheckbox.checked) {
          State.conversationHistory.push(...messages);
          State.conversationHistory.push({ role: "assistant", content: aiResponse });
          Chat.saveConversationHistory();
          UI.updateInputPlaceholder();
        }
      });
    }
  });
}

if (DOM.addPageContextBtn) {
  DOM.addPageContextBtn.addEventListener("click", async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const response = await browser.tabs.sendMessage(tabs[0].id, { action: "get_selection" });
        if (response && response.selection) State.lastIgnoredSelection = response.selection.trim();
      }
    } catch (e) {}

    const result = await ContextManager.getPageContent();
    if (result) {
      ContextManager.updateContextDisplay(result.content, true, {
        title: result.tab.title, url: result.tab.url, favIconUrl: result.tab.favIconUrl,
      });
      DOM.promptInput.focus();
    } else {
      UI.showToast("Could not get page content", "warning");
    }
  });
}

if (DOM.promptInput) {
  DOM.promptInput.addEventListener("focus", ContextManager.checkSelection);
  DOM.promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendPromptBtn.disabled) DOM.sendPromptBtn.click();
    }
  });
}

if (DOM.appContainer) DOM.appContainer.addEventListener("mouseenter", ContextManager.checkSelection);
if (DOM.removeContextBtn) {
  DOM.removeContextBtn.addEventListener("click", () => {
    State.lastIgnoredSelection = State.selectedContextText;
    ContextManager.updateContextDisplay("");
  });
}

if (DOM.modelSelect) {
  DOM.modelSelect.addEventListener("change", () => {
    API.saveSelectedModel();
    UI.updateButtonStates();
  });
}

if (DOM.saveBaseUrlBtn) {
  DOM.saveBaseUrlBtn.addEventListener("click", () => {
    Settings.saveBaseUrl();
    API.getModels();
  });
}

if (DOM.pickProviderBtn && DOM.providerDropdown) {
  DOM.pickProviderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    DOM.providerDropdown.classList.toggle("hidden");
  });
  const options = DOM.providerDropdown.querySelectorAll(".provider-option");
  options.forEach((option) => {
    option.addEventListener("click", () => {
      DOM.baseUrlInput.value = option.getAttribute("data-url");
      DOM.providerDropdown.classList.add("hidden");
    });
  });
  document.addEventListener("click", (e) => {
    if (!DOM.providerDropdown.classList.contains("hidden") && !DOM.providerDropdown.contains(e.target) && !DOM.pickProviderBtn.contains(e.target)) {
      DOM.providerDropdown.classList.add("hidden");
    }
  });
}

if (DOM.saveApiKeyBtn) {
  DOM.saveApiKeyBtn.addEventListener("click", async () => {
    await Settings.saveApiKey();
    API.getModels();
  });
}

if (DOM.toggleApiKeyVisibilityBtn) {
  DOM.toggleApiKeyVisibilityBtn.addEventListener("click", () => {
    const type = DOM.apiKeyInput.getAttribute("type") === "password" ? "text" : "password";
    DOM.apiKeyInput.setAttribute("type", type);
    const icon = DOM.toggleApiKeyVisibilityBtn.querySelector("img");
    icon.src = type === "text" ? "../../assets/icons/visibility_on.svg" : "../../assets/icons/visibility_off.svg";
  });
}

if (DOM.clearChatToolbar) DOM.clearChatToolbar.addEventListener("click", () => DOM.clearChatBtn.click());
if (DOM.refreshModelsToolbar) DOM.refreshModelsToolbar.addEventListener("click", () => DOM.refreshModelsBtn.click());

if (DOM.sendPromptBtn) {
  DOM.sendPromptBtn.addEventListener("click", async () => {
    if (!DOM.modelSelect.value) {
      UI.showToast("Please select a model first", "warning");
      return;
    }
    const prompt = DOM.promptInput.value;
    if (prompt) {
      Chat.appendUserMessage(prompt);
      let finalPrompt = prompt;
      let contextToUse = State.selectedContextText;
      const maxTokens = parseInt(DOM.maxTokensInput.value, 10) || State.DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;

      if (contextToUse) {
        if (State.isPageContext && !DOM.includePageContentCheckbox.checked) {
          contextToUse = "";
        }
        if (contextToUse) {
          const overhead = 21 + prompt.length;
          if (contextToUse.length + overhead > charLimit) {
            const availableSpace = charLimit - overhead;
            if (availableSpace > 0) {
              if (DOM.enableRagCheckbox.checked) {
                const retrieved = RAGEngine.retrieve(State.selectedContextText, prompt, availableSpace);
                if (retrieved && retrieved.length < State.selectedContextText.length) {
                  contextToUse = retrieved;
                  if (!DOM.hideContextToastsCheckbox.checked) UI.showToast("Large context: Used relevant snippets.", "info");
                } else {
                  contextToUse = contextToUse.substring(0, availableSpace) + "... (truncated)";
                  if (!DOM.hideContextToastsCheckbox.checked) UI.showToast("Context truncated to fit token limit.", "warning");
                }
              } else {
                contextToUse = contextToUse.substring(0, availableSpace) + "... (truncated)";
                if (!DOM.hideContextToastsCheckbox.checked) UI.showToast("Context truncated to fit token limit.", "warning");
              }
            } else {
              contextToUse = contextToUse.substring(0, 100) + "... (truncated)";
            }
          }
        }

        const urlInfo = State.selectedContextMetadata && State.selectedContextMetadata.url
          ? `Source URL: ${State.selectedContextMetadata.url}\n\n` : "";

        const contextInfo = contextToUse ? `Context:\n"""\n${contextToUse}\n"""` : "Use the Source URL to understand the context or search for it if you have access.";
        finalPrompt = `You are a helpful browser assistant.\n\n${urlInfo}${contextInfo}\n\nQuestion:\n${prompt}\n\nInstructions:\n1. Answer the question using the provided context if possible.\n2. If the answer is not in the context, use your general knowledge or search the web if you are able to do so.\n3. Do not simply state that the information is missing from the context unless you cannot answer from general knowledge either.`;
      }

      let messagesToSend = [];
      const enableHistory = DOM.enableHistoryCheckbox.checked;

      if (enableHistory) {
        const currentContextSig = State.selectedContextText
          ? State.selectedContextText.substring(0, 100) + State.selectedContextText.length
          : "NO_CONTEXT";
        const lastContextSig = State.lastContextSignature
          ? State.lastContextSignature.substring(0, 100) + State.lastContextSignature.length
          : "NO_CONTEXT";

        if (currentContextSig !== lastContextSig) {
          State.conversationHistory = [];
          State.lastContextSignature = State.selectedContextText;
        }
      } else {
        State.conversationHistory = [];
      }

      if (enableHistory && State.conversationHistory.length > 0) {
        messagesToSend = [...State.conversationHistory, { role: "user", content: prompt }];
      } else {
        messagesToSend = [{ role: "user", content: finalPrompt }];
      }

      API.streamResponse(messagesToSend, (aiResponse) => {
        if (enableHistory) {
          if (State.conversationHistory.length === 0) {
            State.conversationHistory.push({ role: "user", content: finalPrompt });
          } else {
            State.conversationHistory.push({ role: "user", content: prompt });
          }
          State.conversationHistory.push({ role: "assistant", content: aiResponse });
          Chat.saveConversationHistory();
          UI.updateInputPlaceholder();
        }
      });
      DOM.promptInput.value = "";
    }
  });
}

if (DOM.stopGeneratingBtn) {
  DOM.stopGeneratingBtn.addEventListener("click", () => {
    if (State.abortController) State.abortController.abort();
  });
}

if (DOM.maxTokensInput) DOM.maxTokensInput.addEventListener("change", Settings.saveMaxTokens);
if (DOM.enableHistoryCheckbox) DOM.enableHistoryCheckbox.addEventListener("change", Settings.saveEnableHistory);
if (DOM.enableRagCheckbox) DOM.enableRagCheckbox.addEventListener("change", Settings.saveEnableRag);
if (DOM.includePageContentCheckbox) DOM.includePageContentCheckbox.addEventListener("change", Settings.saveIncludePageContent);
if (DOM.hideContextToastsCheckbox) DOM.hideContextToastsCheckbox.addEventListener("change", Settings.saveHideContextToasts);

if (DOM.summarizePageBtn) {
  DOM.summarizePageBtn.addEventListener("click", async () => {
    if (!DOM.modelSelect.value) {
      UI.showToast("Please select a model first", "warning");
      return;
    }
    const result = await ContextManager.getPageContent();
    if (result) {
      const { content, tab } = result;
      const maxTokens = parseInt(DOM.maxTokensInput.value, 10) || State.DEFAULT_CONTEXT_TOKEN_LIMIT;
      const charLimit = maxTokens * 4;
      let finalContent = content;

      if (finalContent.length > charLimit) {
        if (DOM.enableRagCheckbox.checked) {
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
          if (!DOM.hideContextToastsCheckbox.checked) UI.showToast(`Page content summarized via smart selection to fit limit.`, "info");
        } else {
          finalContent = finalContent.substring(0, charLimit) + "... (truncated)";
          if (!DOM.hideContextToastsCheckbox.checked) UI.showToast(`Page content truncated to fit limit.`, "warning");
        }
      }

      const urlInfo = tab.url ? `Source URL: ${tab.url}\n\n` : "";
      let prompt = "";
      if (DOM.includePageContentCheckbox.checked) {
        prompt = `${urlInfo}Summarize the following web page content: ${finalContent}`;
      } else {
        prompt = `${urlInfo}Summarize this web page. Please use the URL and your general knowledge or search capabilities to provide a summary of what this page is about.`;
      }

      Chat.appendUserMessage("Summarize this page", {
        title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl,
      });

      State.conversationHistory = [];
      State.lastContextSignature = content;

      const messages = [{ role: "user", content: prompt }];
      API.streamResponse(messages, (aiResponse) => {
        if (DOM.enableHistoryCheckbox.checked) {
          State.conversationHistory.push(...messages);
          State.conversationHistory.push({ role: "assistant", content: aiResponse });
          Chat.saveConversationHistory();
          UI.updateInputPlaceholder();
          ContextManager.updateContextDisplay(content, true, {
            title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl,
          });
        }
      });
    }
  });
}

if (DOM.clearChatBtn) {
  DOM.clearChatBtn.addEventListener("click", () => {
    DOM.chatHistory.innerHTML = "";
    State.conversationHistory = [];
    State.fullMessageLog = [];
    State.lastContextSignature = "";
    Chat.saveMessageLog();
    Chat.saveConversationHistory();
    UI.updateInputPlaceholder();
  });
}

if (DOM.refreshModelsBtn) DOM.refreshModelsBtn.addEventListener("click", () => API.getModels());

init();
