import { DOM } from './dom.js';
import { State } from './state.js';
import { UI } from './ui.js';
import { parseMarkdown } from '../utils/markdown_parser.js';

export const Chat = {
  renderMessage: (message) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", message.role === "user" ? "user" : "ai");

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
      messageContent.innerHTML = typeof DOMPurify !== 'undefined'
        ? DOMPurify.sanitize(parseMarkdown(message.content), { ADD_ATTR: ["target"] })
        : parseMarkdown(message.content);
    }

    messageElement.appendChild(messageContent);

    if (message.role === "assistant") {
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

      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(message.content);
      });

      footer.appendChild(copyButton);

      if (message.metadata && message.metadata.model) {
        const statsSpan = document.createElement("span");
        statsSpan.style.fontSize = "11px";
        statsSpan.style.color = "var(--text-secondary)";
        statsSpan.style.marginLeft = "10px";
        const modelName = message.metadata.model.split("/").pop();
        statsSpan.textContent =
          modelName.charAt(0).toUpperCase() + modelName.slice(1);
        footer.appendChild(statsSpan);
      }

      messageElement.appendChild(footer);
    }

    DOM.chatHistory.appendChild(messageElement);
    DOM.chatHistory.scrollTop = DOM.chatHistory.scrollHeight;
  },

  saveMessageLog: () => {
    chrome.storage.local.set({ messageLog: State.fullMessageLog });
  },

  saveConversationHistory: () => {
    chrome.storage.local.set({
      conversationHistory: State.conversationHistory,
      lastContextSignature: State.lastContextSignature,
    });
  },

  loadChatHistory: async () => {
    const data = await chrome.storage.local.get([
      "messageLog",
      "chatHistory",
      "conversationHistory",
      "lastContextSignature",
    ]);

    if (data.chatHistory && !data.messageLog) {
      chrome.storage.local.remove("chatHistory");
      DOM.chatHistory.innerHTML = "";
    }

    if (data.messageLog) {
      State.fullMessageLog = data.messageLog;
      State.fullMessageLog.forEach((msg) => Chat.renderMessage(msg));
    }

    if (data.conversationHistory) {
      State.conversationHistory = data.conversationHistory;
    }
    if (data.lastContextSignature) {
      State.lastContextSignature = data.lastContextSignature;
    }

    UI.updateInputPlaceholder();
  },

  appendUserMessage: (text, metadata = null) => {
    const message = { role: "user", content: text, metadata };
    State.fullMessageLog.push(message);
    Chat.renderMessage(message);
    Chat.saveMessageLog();
    UI.updateInputPlaceholder();
  }
};
