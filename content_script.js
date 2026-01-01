// This script doesn't need any code for the current functionality,
// as the summarization is handled by executing a function in the active tab.
// However, this file is here for future functionality, such as getting selected text.

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_selection") {
      sendResponse({ selection: window.getSelection().toString() });
    } else if (request.action === "get_full_page") {
      sendResponse({ content: document.body.innerText });
    }
  });
