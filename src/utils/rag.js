/**
 * Rallx Browser AI - RAG Engine
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

/**
 * Simple client-side RAG (Retrieval-Augmented Generation) Engine
 * Uses keyword matching (Lexical Search) to find relevant text chunks.
 */
export const RAGEngine = {
  // Configuration
  CHUNK_SIZE: 1500, // Characters per chunk
  CHUNK_OVERLAP: 200, // Overlap to preserve context

  /**
   * Main entry point to get relevant context.
   * @param {string} fullText - The large body of text (page content).
   * @param {string} query - The user's question.
   * @param {number} maxChars - Maximum characters allowed for the context.
   * @returns {string} - The most relevant chunks combined.
   */
  retrieve(fullText, query, maxChars) {
    if (!fullText) return "";

    // 1. If text is small enough, return it all.
    if (fullText.length <= maxChars) {
      return fullText;
    }

    // 2. Split into chunks
    const chunks = this.createChunks(fullText);

    // 3. Score chunks against the query
    const scoredChunks = this.scoreChunks(chunks, query);

    // 4. Select top chunks that fit in maxChars
    const selectedChunks = this.selectChunks(scoredChunks, maxChars);

    // 5. Sort selected chunks by their original position to maintain narrative flow
    selectedChunks.sort((a, b) => a.index - b.index);

    // 6. Combine
    return selectedChunks.map((c) => c.text).join("\n\n...[skipped]...\n\n");
  },

  /**
   * Splits text into overlapping chunks.
   */
  createChunks(text) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + this.CHUNK_SIZE;

      // Try to find a sentence ending or whitespace to break cleanly
      if (endIndex < text.length) {
        // Look for last period, question mark, or newline within the last 10% of chunk
        const searchZone = text.substring(endIndex - 100, endIndex);
        const lastPunctuation = Math.max(
          searchZone.lastIndexOf(". "),
          searchZone.lastIndexOf("? "),
          searchZone.lastIndexOf("! "),
          searchZone.lastIndexOf("\n")
        );

        if (lastPunctuation !== -1) {
          endIndex = endIndex - 100 + lastPunctuation + 1;
        } else {
          // Fallback to last space
          const lastSpace = searchZone.lastIndexOf(" ");
          if (lastSpace !== -1) {
            endIndex = endIndex - 100 + lastSpace;
          }
        }
      }

      const chunkText = text.substring(startIndex, endIndex).trim();
      if (chunkText.length > 0) {
        chunks.push({
          index: chunks.length,
          text: chunkText,
        });
      }

      startIndex = endIndex - this.CHUNK_OVERLAP;
    }
    return chunks;
  },

  /**
   * Scores each chunk based on keyword frequency.
   */
  scoreChunks(chunks, query) {
    // Normalize query: lowercase, remove punctuation, unique words
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2); // Ignore short words

    const uniqueTerms = [...new Set(terms)];

    return chunks.map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let score = 0;

      uniqueTerms.forEach((term) => {
        // Count occurrences of the term in the chunk
        const regex = new RegExp(`\\b${term}\\b`, "gi");
        const matches = textLower.match(regex);
        if (matches) {
          score += matches.length;
        }
        // Bonus for exact phrase matching could go here
      });

      return { ...chunk, score };
    });
  },

  /**
   * Selects the highest scoring chunks that fit within the limit.
   */
  selectChunks(scoredChunks, maxChars) {
    // Sort by score descending
    const sorted = [...scoredChunks].sort((a, b) => b.score - a.score);

    const selected = [];
    let currentChars = 0;

    for (const chunk of sorted) {
      // Simple threshold: if score is 0, maybe don't include unless we have space?
      // Let's include if we have space, but prioritize high scores.

      // Check fit
      if (currentChars + chunk.text.length < maxChars) {
        selected.push(chunk);
        currentChars += chunk.text.length + 50; // +50 for separator
      } else {
        // If we can't fit this chunk, stop?
        // Or try smaller chunks? For now, just stop or skip.
        // If the very first/best chunk is too big (unlikely with 1500 chunk size), we skip it.
      }

      if (currentChars >= maxChars) break;
    }

    // If no chunks matched (score 0) or query was empty/too short,
    // maybe we should return the FIRST chunks (start of article)?
    // The current logic returns whatever fits from the sorted list.
    // If all scores are 0, it returns the ones that appeared first in sort (stable sort?)
    // Array.sort is not stable in all engines?
    // If scores are equal, we might want to prioritize original index.

    if (selected.length === 0 && scoredChunks.length > 0) {
      // Fallback: return first chunk
      return [scoredChunks[0]];
    }

    return selected;
  },
};
