/**
 * Rallx Browser AI - Encryption Utils
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

const EncryptionUtils = {
  // Generate a new AES-GCM key
  generateKey: async () => {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Export key to JWK for storage
  exportKey: async (key) => {
    return await window.crypto.subtle.exportKey("jwk", key);
  },

  // Import key from JWK
  importKey: async (jwk) => {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "AES-GCM",
      },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Encrypt text
  encrypt: async (text, key) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV should be unique per encryption

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    // Return as string: IV + EncryptedData (base64 encoded)
    // We'll use a simple JSON structure or delimiter
    const encryptedArray = new Uint8Array(encrypted);
    const combined = {
      iv: Array.from(iv),
      data: Array.from(encryptedArray),
    };
    return JSON.stringify(combined);
  },

  // Decrypt text
  decrypt: async (encryptedString, key) => {
    try {
      const combined = JSON.parse(encryptedString);
      const iv = new Uint8Array(combined.iv);
      const data = new Uint8Array(combined.data);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  },
};
