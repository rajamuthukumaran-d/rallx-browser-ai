/**
 * Rallx Browser AI - Content Script
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

// This script doesn't need any code for the current functionality,
// as the summarization is handled by executing a function in the active tab.
// However, this file is here for future functionality, such as getting selected text.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_selection") {
    sendResponse({ selection: window.getSelection().toString() });
  } else if (request.action === "get_full_page") {
    const clone = document.body.cloneNode(true);

    // Remove unwanted elements by tag name
    const unwantedTags = [
      "script",
      "style",
      "noscript",
      "iframe",
      "nav",
      "footer",
      "aside",
      "header",
      "form",
      "svg",
    ];
    unwantedTags.forEach((tag) => {
      const elements = clone.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    // Remove unwanted elements by common class/id names (heuristics)
    const unwantedSelectors = [
      ".ad",
      ".advertisement",
      ".social-share",
      ".share-buttons",
      ".comments",
      ".comment-section",
      ".sidebar",
      ".widget",
      ".menu",
      ".navigation",
      ".cookie-banner",
      ".popup",
    ];
    unwantedSelectors.forEach((selector) => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    // Try to find main content
    const mainSelectors = [
      "article",
      "main",
      '[role="main"]',
      "#content",
      ".content",
      "#main",
      ".main",
      ".post-content",
    ];
    let mainContent = null;

    for (const selector of mainSelectors) {
      const element = clone.querySelector(selector);
      if (element) {
        mainContent = element;
        break;
      }
    }

    // If no main content found, fallback to body (which is already cleaned)
    const contentElement = mainContent || clone;

    // Get text and clean up whitespace
    // We use innerText to respect CSS styling (e.g. hidden elements are ignored)
    // but since we cloned, styling might be lost/default.
    // cloneNode(true) copies attributes but not computed styles unless attached to DOM.
    // However, innerText usually works on detached nodes in modern browsers mostly fine for text extraction.
    const text = contentElement.innerText.replace(/\s+/g, " ").trim();

    sendResponse({ content: text });
  }
});
