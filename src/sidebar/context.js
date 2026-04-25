import { DOM } from './dom.js';
import { State } from './state.js';
import { UI } from './ui.js';

export const ContextManager = {
  updateContextDisplay: (text, isPage = false, metadata = null) => {
    if (text) {
      State.selectedContextText = text;
      State.selectedContextMetadata = metadata;
      State.isPageContext = isPage;

      if (isPage) {
        DOM.contextTitle.textContent =
          metadata && metadata.title ? metadata.title : "Page Content";
      } else {
        DOM.contextTitle.textContent = "Selected Text";
      }

      if (metadata && metadata.url) {
        try {
          const urlObj = new URL(metadata.url);
          DOM.contextDetails.textContent =
            urlObj.hostname +
            (urlObj.pathname.length > 1 ? urlObj.pathname : "");
        } catch (e) {
          DOM.contextDetails.textContent = metadata.url;
        }
      } else {
        DOM.contextDetails.textContent =
          text.substring(0, 60) + (text.length > 60 ? "..." : "");
      }

      if (metadata && metadata.favIconUrl) {
        DOM.contextIcon.src = metadata.favIconUrl;
        DOM.contextIcon.style.display = "block";
        DOM.contextIconPlaceholder.style.display = "none";
      } else {
        DOM.contextIcon.style.display = "none";
        DOM.contextIconPlaceholder.style.display = "flex";
        DOM.contextIconPlaceholder.textContent = isPage ? "📄" : "📝";
      }

      DOM.contextIndicator.style.display = "block";

      if (DOM.summarizeSelectionBtn)
        DOM.summarizeSelectionBtn.style.display = isPage ? "none" : "";
      if (DOM.addPageContextBtn) DOM.addPageContextBtn.style.display = "none";

      UI.updateInputPlaceholder();
    } else {
      State.selectedContextText = "";
      State.selectedContextMetadata = null;
      State.isPageContext = false;
      DOM.contextTitle.textContent = "";
      DOM.contextDetails.textContent = "";

      DOM.contextIndicator.style.display = "none";
      if (DOM.summarizeSelectionBtn) DOM.summarizeSelectionBtn.style.display = "none";
      if (DOM.addPageContextBtn) DOM.addPageContextBtn.style.display = "";
      UI.updateInputPlaceholder();
    }
  },

  getPageContent: async () => {
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
  },

  checkSelection: async () => {
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

        if (currentSelection !== State.lastIgnoredSelection) {
          State.lastIgnoredSelection = "";
        }

        if (
          currentSelection &&
          currentSelection !== State.selectedContextText &&
          currentSelection !== State.lastIgnoredSelection
        ) {
          ContextManager.updateContextDisplay(currentSelection, false, {
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
          });
        }
      }
    } catch (error) {
    }
  },

  initializeContext: async () => {
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
          ContextManager.updateContextDisplay(currentSelection, false, {
            title: tabs[0].title,
            url: tabs[0].url,
            favIconUrl: tabs[0].favIconUrl,
          });
          return;
        }
      }
    } catch (error) {
    }

    const result = await ContextManager.getPageContent();
    if (result) {
      ContextManager.updateContextDisplay(result.content, true, {
        title: result.tab.title,
        url: result.tab.url,
        favIconUrl: result.tab.favIconUrl,
      });
    }
  }
};
