/**
 * api.js — HTTP request helpers for the backend REST API
 */

const BASE = 'http://localhost:3001/api';

export const api = {
  async post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  /**
   * Upload a file via multipart/form-data.
   * Returns { url, name, size, mimeType }
   */
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/upload`);

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },
};
