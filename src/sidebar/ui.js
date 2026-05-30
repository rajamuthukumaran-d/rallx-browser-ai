import { DOM } from './dom.js';
import { State } from './state.js';

export const UI = {
  showToast: (message, type = "info") => {
    const toast = DOM.toast;
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast show";
    if (type === "warning") {
      toast.classList.add("warning");
    }
    setTimeout(() => {
      toast.className = "toast hidden";
    }, 3000);
  },

  updateButtonStates: () => {
    const hasModel = DOM.modelSelect && DOM.modelSelect.value && DOM.modelSelect.value !== "No Connection";
    const disabled = !hasModel;

    if (DOM.sendPromptBtn) DOM.sendPromptBtn.disabled = disabled;
    if (DOM.summarizePageBtn) DOM.summarizePageBtn.disabled = disabled;
    if (DOM.summarizeSelectionBtn) DOM.summarizeSelectionBtn.disabled = disabled;
    if (DOM.addPageContextBtn) DOM.addPageContextBtn.disabled = disabled;

    if (disabled) {
      if (DOM.sendPromptBtn) DOM.sendPromptBtn.classList.add("disabled");
      if (DOM.summarizePageBtn) DOM.summarizePageBtn.classList.add("disabled");
      if (DOM.summarizeSelectionBtn) DOM.summarizeSelectionBtn.classList.add("disabled");
      if (DOM.addPageContextBtn) DOM.addPageContextBtn.classList.add("disabled");
    } else {
      if (DOM.sendPromptBtn) DOM.sendPromptBtn.classList.remove("disabled");
      if (DOM.summarizePageBtn) DOM.summarizePageBtn.classList.remove("disabled");
      if (DOM.summarizeSelectionBtn) DOM.summarizeSelectionBtn.classList.remove("disabled");
      if (DOM.addPageContextBtn) DOM.addPageContextBtn.classList.remove("disabled");
    }
  },

  updateInputPlaceholder: () => {
    if (!DOM.promptInput) return;
    const enableHistory = DOM.enableHistoryCheckbox && DOM.enableHistoryCheckbox.checked;
    const currentContextSig = State.selectedContextText
      ? State.selectedContextText.substring(0, 100) + State.selectedContextText.length
      : "NO_CONTEXT";
    const lastSig = State.lastContextSignature
      ? State.lastContextSignature.substring(0, 100) + State.lastContextSignature.length
      : "NO_CONTEXT";

    const isSameContext = currentContextSig === lastSig;

    if (enableHistory && State.conversationHistory.length > 0 && isSameContext) {
      DOM.promptInput.placeholder = "Ask a follow-up...";
    } else if (State.selectedContextText) {
      DOM.promptInput.placeholder = State.isPageContext
        ? "Ask about this page..."
        : "Ask about selection...";
    } else {
      DOM.promptInput.placeholder = "Ask anything...";
    }
  }
};
