import { DOM } from './dom.js';
import { State } from './state.js';
import { EncryptionUtils } from '../utils/encryption_utils.js';
import { UI } from './ui.js';

export const Settings = {
  initializeEncryption: async () => {
    const data = await chrome.storage.local.get("masterKeyJWK");
    if (data.masterKeyJWK) {
      State.cryptoKey = await EncryptionUtils.importKey(data.masterKeyJWK);
    } else {
      State.cryptoKey = await EncryptionUtils.generateKey();
      const jwk = await EncryptionUtils.exportKey(State.cryptoKey);
      await chrome.storage.local.set({ masterKeyJWK: jwk });
    }
  },

  saveBaseUrl: () => {
    chrome.storage.local.set({ baseUrl: DOM.baseUrlInput.value });
  },

  loadBaseUrl: async () => {
    const data = await chrome.storage.local.get(["baseUrl", "apiKey"]);
    if (data.baseUrl) {
      DOM.baseUrlInput.value = data.baseUrl;
    }
    if (data.apiKey) {
      if (!State.cryptoKey) await Settings.initializeEncryption();
      const decrypted = await EncryptionUtils.decrypt(data.apiKey, State.cryptoKey);
      if (decrypted !== null) {
        DOM.apiKeyInput.value = decrypted;
      }
    }
  },

  saveApiKey: async () => {
    if (!State.cryptoKey) await Settings.initializeEncryption();
    const encrypted = await EncryptionUtils.encrypt(
      DOM.apiKeyInput.value,
      State.cryptoKey
    );
    chrome.storage.local.set({ apiKey: encrypted });
  },

  saveMaxTokens: () => {
    chrome.storage.local.set({ maxTokens: DOM.maxTokensInput.value });
  },

  saveEnableHistory: () => {
    chrome.storage.local.set({ enableHistory: DOM.enableHistoryCheckbox.checked });
    UI.updateInputPlaceholder();
  },

  saveEnableRag: () => {
    chrome.storage.local.set({ enableRag: DOM.enableRagCheckbox.checked });
  },

  saveIncludePageContent: () => {
    const isIncluded = DOM.includePageContentCheckbox.checked;
    chrome.storage.local.set({
      includePageContent: isIncluded,
    });

    DOM.enableRagCheckbox.disabled = !isIncluded;
    if (!isIncluded) {
      DOM.enableRagCheckbox.parentElement.classList.add("disabled-setting");
    } else {
      DOM.enableRagCheckbox.parentElement.classList.remove("disabled-setting");
    }
  },

  saveHideContextToasts: () => {
    chrome.storage.local.set({
      hideContextToasts: DOM.hideContextToastsCheckbox.checked,
    });
  },

  loadSettings: async () => {
    const data = await chrome.storage.local.get([
      "maxTokens",
      "enableHistory",
      "enableRag",
      "includePageContent",
      "hideContextToasts",
    ]);
    if (data.maxTokens) {
      DOM.maxTokensInput.value = data.maxTokens;
    }
    if (data.enableHistory !== undefined) {
      DOM.enableHistoryCheckbox.checked = data.enableHistory;
    }
    if (data.enableRag !== undefined) {
      DOM.enableRagCheckbox.checked = data.enableRag;
    }
    if (data.includePageContent !== undefined) {
      DOM.includePageContentCheckbox.checked = data.includePageContent;
      DOM.enableRagCheckbox.disabled = !data.includePageContent;
      if (!data.includePageContent) {
        DOM.enableRagCheckbox.parentElement.classList.add("disabled-setting");
      }
    }
    if (data.hideContextToasts !== undefined) {
      DOM.hideContextToastsCheckbox.checked = data.hideContextToasts;
    }
  }
};
