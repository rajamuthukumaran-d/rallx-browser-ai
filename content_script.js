// This script doesn't need any code for the current functionality,
// as the summarization is handled by executing a function in the active tab.
// However, this file is here for future functionality, such as getting selected text.

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_selection") {
      sendResponse({ selection: window.getSelection().toString() });
    } else if (request.action === "get_full_page") {
      const clone = document.body.cloneNode(true);
      
      // Remove unwanted elements by tag name
      const unwantedTags = ['script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'aside', 'header', 'form', 'svg'];
      unwantedTags.forEach(tag => {
          const elements = clone.querySelectorAll(tag);
          elements.forEach(el => el.remove());
      });
      
      // Remove unwanted elements by common class/id names (heuristics)
      const unwantedSelectors = [
          '.ad', '.advertisement', '.social-share', '.share-buttons', 
          '.comments', '.comment-section', '.sidebar', '.widget', 
          '.menu', '.navigation', '.cookie-banner', '.popup'
      ];
      unwantedSelectors.forEach(selector => {
          const elements = clone.querySelectorAll(selector);
          elements.forEach(el => el.remove());
      });

      // Try to find main content
      const mainSelectors = ['article', 'main', '[role="main"]', '#content', '.content', '#main', '.main', '.post-content'];
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
      const text = contentElement.innerText.replace(/\s+/g, ' ').trim();
      
      sendResponse({ content: text });
    }
  });
