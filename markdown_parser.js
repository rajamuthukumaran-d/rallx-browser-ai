const parseMarkdown = (text) => {
  // Helper to escape HTML to prevent XSS from the source text
  // but allow our own generated tags later.
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Split text by code blocks so we don't format inside them
  // Regex captures the code block content including delimiters
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map(part => {
    // If it's a code block
    if (part.startsWith('```')) {
      // Remove backticks
      const content = part.replace(/^```|```$/g, '');
      // Return pre/code block, content is already "raw", but we should escape it 
      // so <script> inside code block doesn't run.
      return `<pre><code>${escapeHtml(content)}</code></pre>`;
    }
    // If it's inline code
    if (part.startsWith('`')) {
      const content = part.replace(/^`|`$/g, '');
      return `<code>${escapeHtml(content)}</code>`;
    }

    // Process normal text
    let html = escapeHtml(part);

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Links
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Unordered Lists (simple heuristic: line starting with - or * ) 
    // Wrapping in <ul> is hard with regex-only on stream, so we use line breaks and bullets.
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '• $1<br>');

    // Ordered Lists
    html = html.replace(/^\s*(\d+\.)\s+(.*)$/gm, '$1 $2<br>');

    // Newlines to <br> for line breaks that aren't headers or lists
    // (Headers and lists usually imply block level, but here we are doing simple inline replacement)
    // We'll just convert all newlines to <br> for preservation, 
    // but collapse multiple <br>s if needed?
    // Simple approach: \n -> <br>
    html = html.replace(/\n/g, '<br>');

    return html;
  }).join('');
};
