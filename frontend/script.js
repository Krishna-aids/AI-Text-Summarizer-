/* ============================================
   Automatic Text Summarization System
   script.js
   ──────────────────────────────────────────
   PRESERVED (zero changes):
     · fetch('/extract')  fetch('/summarize')
     · handleFile()       extractFromBackend()
     · displayPreview()   startGeneration()
     · displaySummary()   resetFile()
     · showToast()        all DOM IDs
     · download blob logic

   ADDED (UX only, no API changes):
     · PDF iframe rendering
     · DOCX Mammoth.js rendering
     · Live stats panel (word count + estimate)
     · Large doc warning (>3000 words)
     · Generate button text → "Generating Summary…"
     · Rotating AI status messages
     · Skeleton loading blocks
     · Summary typing animation
     · Intelligence panel (compression stats)
     · Copy button
============================================ */

// ── DOM REFERENCES ──────────────────────────
const fileInput     = document.getElementById('file-input');
const uploadZone    = document.getElementById('upload-zone');
const uploadText    = document.getElementById('upload-text');
const uploadHint    = document.getElementById('upload-hint');
const fileInfo      = document.getElementById('file-info');
const fileNameEl    = document.getElementById('file-name');
const fileRemove    = document.getElementById('file-remove');

const previewEmpty  = document.getElementById('preview-empty');
const previewText   = document.getElementById('preview-text');
const wordCount     = document.getElementById('word-count');

const outputEmpty   = document.getElementById('output-empty');
const outputText    = document.getElementById('output-text');
const outputBadge   = document.getElementById('output-badge');

const btnGenerate   = document.getElementById('btn-generate');
const btnText       = btnGenerate.querySelector('.btn-text');
const btnLoader     = document.getElementById('btn-loader');
const btnIcon       = btnGenerate.querySelector('.btn-icon');

const btnDownload   = document.getElementById('btn-download');

// ── STATE ────────────────────────────────────
let currentFileText   = '';
let currentSummary    = '';
let selectedLength    = 'short';
let currentFileObj    = null;   // kept for PDF/DOCX rich preview
let aiStatusInterval  = null;   // for rotating messages
let typingTimer       = null;   // for typing animation

// ── DRAG AND DROP ────────────────────────────
['dragenter', 'dragover'].forEach(evt => {
  uploadZone.addEventListener(evt, e => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(evt => {
  uploadZone.addEventListener(evt, e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  });
});

uploadZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── FILE INPUT CHANGE ────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
});

// ── REMOVE FILE ──────────────────────────────
fileRemove.addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  resetFile();
});

// ── HANDLE FILE ──────────────────────────────
async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'txt'].includes(ext)) {
    showToast('Unsupported format. Please upload PDF, DOCX, or TXT.', 'error');
    return;
  }

  // Show filename chip
  fileNameEl.textContent = file.name;
  fileInfo.style.display = 'block';
  uploadText.textContent = 'File loaded';
  uploadHint.textContent = `${(file.size / 1024).toFixed(1)} KB`;

  // UX: collapse drop zone to compact strip — hides the large icon
  uploadZone.classList.add('drop-zone--loaded');

  // Store file object for rich rendering
  currentFileObj = file;

  if (ext === 'txt') {
    // Read TXT directly in the browser — no backend needed
    const reader = new FileReader();
    reader.onload  = e => {
      displayPreview(e.target.result);
      renderTxtPreview(e.target.result);
    };
    reader.onerror = () => showToast('Error reading file.', 'error');
    reader.readAsText(file);
  } else if (ext === 'pdf') {
    // Show PDF in iframe immediately, then extract text via backend
    renderPdfPreview(file);
    await extractFromBackend(file);
  } else if (ext === 'docx') {
    // Render DOCX with Mammoth, then extract text via backend
    renderDocxPreview(file);
    await extractFromBackend(file);
  }
}

// ── EXTRACT VIA BACKEND ───────────────────────
async function extractFromBackend(file) {
  uploadText.textContent = 'Extracting text…';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/extract', {
      method: 'POST',
      body: formData          // ← no Content-Type header; browser sets multipart boundary
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Extraction failed (${response.status})`);
    }

    const data = await response.json();

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text could be extracted from the document.');
    }

    uploadText.textContent = 'File loaded';
    displayPreview(data.text);

  } catch (err) {
    uploadText.textContent = 'Drag & drop or click to browse';
    showToast(`Extraction error: ${err.message}`, 'error');
    resetFile();
  }
}

// ── DISPLAY PREVIEW ───────────────────────────
function displayPreview(text) {
  currentFileText = text.trim();

  // Word count badge
  const words = currentFileText.split(/\s+/).filter(Boolean).length;
  wordCount.textContent = `${words.toLocaleString()} words`;
  wordCount.style.display = 'inline-flex';

  // Enable generate button
  btnGenerate.disabled = false;

  // UX additions
  updateLiveStats();
  checkDocumentSize();
}

// ── RENDER PREVIEWS BY FILE TYPE ──────────────

function renderTxtPreview(text) {
  hideAllPreviews();
  previewEmpty.style.display = 'none';
  previewText.style.display  = 'block';
  previewText.textContent    = text;
}

function renderPdfPreview(file) {
  hideAllPreviews();
  previewEmpty.style.display = 'none';
  const iframe = document.getElementById('preview-pdf');
  const url = URL.createObjectURL(file);
  iframe.src = url;
  iframe.style.display = 'block';
}

function renderDocxPreview(file) {
  hideAllPreviews();
  previewEmpty.style.display = 'none';
  const container = document.getElementById('preview-docx');
  container.style.display = 'block';
  container.innerHTML = '<em style="color:var(--text-3);font-size:12px;">Rendering document…</em>';

  const reader = new FileReader();
  reader.onload = e => {
    mammoth.convertToHtml({ arrayBuffer: e.target.result })
      .then(result => {
        container.innerHTML = result.value || '<em style="color:var(--text-3)">No content to display.</em>';
      })
      .catch(() => {
        container.innerHTML = '<em style="color:var(--text-3)">Could not render DOCX preview.</em>';
      });
  };
  reader.readAsArrayBuffer(file);
}

function hideAllPreviews() {
  previewText.style.display  = 'none';
  document.getElementById('preview-pdf').style.display   = 'none';
  document.getElementById('preview-docx').style.display  = 'none';
}

// ── LIVE STATS ────────────────────────────────
const ESTIMATE_MAP = { short: 60, medium: 130, detailed: 280 };

function updateLiveStats() {
  if (!currentFileText) return;
  const docWords = currentFileText.split(/\s+/).filter(Boolean).length;
  const estWords = ESTIMATE_MAP[selectedLength] || 130;

  document.getElementById('stat-doc-words').textContent = `${docWords.toLocaleString()} words`;
  document.getElementById('stat-est-words').textContent = `~${estWords} words`;
  document.getElementById('live-stats').style.display   = 'block';
}

// ── LARGE DOCUMENT WARNING ────────────────────
function checkDocumentSize() {
  const words   = currentFileText.split(/\s+/).filter(Boolean).length;
  const notice  = document.getElementById('large-doc-notice');
  if (!notice) return;
  notice.style.display = words > 3000 ? 'flex' : 'none';
}

// ── RADIO SELECTION ───────────────────────────
document.querySelectorAll('input[name="length"]').forEach(radio => {
  radio.addEventListener('change', () => {
    selectedLength = radio.value;
    updateLiveStats(); // refresh estimated word count on change
  });
});

// ── GENERATE SUMMARY ──────────────────────────
btnGenerate.addEventListener('click', () => {
  if (!currentFileText) return;
  startGeneration();
});

// ── API CONFIG ────────────────────────────────
const API_URL = '/summarize';

async function startGeneration() {
  // Show loader — original logic
  btnText.style.display   = 'none';
  btnIcon.style.display   = 'none';
  btnLoader.style.display = 'flex';
  btnGenerate.disabled    = true;

  // UX: update button label text (text node is hidden but set for accessibility)
  btnText.textContent = 'Generating Summary…';

  // UX: show skeleton + rotating messages
  showSkeletonAndStatus();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:   currentFileText,
        length: selectedLength        // passes "short" | "medium" | "detailed"
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const data = await response.json();
  
    
     const summary = data.llm_summary || data.model_summary;

    if (!summary) throw new Error('Empty response from server.');
    displaySummary(summary);

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    resetGenerateBtn();
  }
}

function resetGenerateBtn() {
  btnText.style.display   = 'inline';
  btnIcon.style.display   = 'inline';
  btnLoader.style.display = 'none';
  btnGenerate.disabled    = false;

  // Restore button label
  btnText.textContent = 'Generate Summary';

  // UX: clear skeleton + status
  hideSkeletonAndStatus();
}
// ── FORMAT SUMMARY TEXT → HTML ─────────────────
function formatSummaryHTML(text) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false; }
      return;
    }

    // ✅ Fix: matches "Improved Summary:", "Key Insights:", "Important Points:"
    // Old regex /^[A-Z][^:]+:$/ failed if line had trailing space or lowercase words
    if (/^[A-Za-z][^:\n]+:\s*$/.test(trimmed)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p class="summary-section-title">${trimmed.replace(/:$/, '')}</p>`;
      return;
    }

    // Bullet: "- text" or "* text"
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) { html += '<ul class="summary-list">'; inList = true; }
      html += `<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`;
      return;
    }

    if (inList) { html += '</ul>'; inList = false; }
    html += `<p class="summary-para">${trimmed}</p>`;
  });

  if (inList) html += '</ul>';
  return html;
}


// ── DISPLAY SUMMARY ───────────────────────────
function displaySummary(summary) {
  currentSummary = summary;

  outputEmpty.style.display = 'none';
  outputText.style.display  = 'block';

  // Badge
  const labels = { short: 'Short', medium: 'Medium', detailed: 'Detailed' };
  outputBadge.textContent   = labels[selectedLength] || 'Summary';
  outputBadge.style.display = 'inline-flex';

  // Enable download
  btnDownload.disabled = false;

  // Show actions row
  const outputActions = document.getElementById('output-actions');
  if (outputActions) outputActions.style.display = 'flex';

  // Show plain text during typing animation, then swap to formatted HTML
  typeText(outputText, summary, () => {
    // ✅ After typing finishes → replace raw text with formatted HTML
    outputText.innerHTML = formatSummaryHTML(summary);

    // Then render intelligence panel
    renderIntelPanel(summary);
  });

  outputText.closest('.glass-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// ── DOWNLOAD SUMMARY ──────────────────────────
btnDownload.addEventListener('click', () => {
  if (!currentSummary) return;

  const filename = `summary_${selectedLength}_${Date.now()}.txt`;
  const header = [
    'Automatic Text Summarization System',
    '====================================',
    `Length: ${selectedLength.charAt(0).toUpperCase() + selectedLength.slice(1)}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'SUMMARY',
    '-------',
    ''
  ].join('\n');

  const blob = new Blob([header + currentSummary], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Summary downloaded successfully!', 'success');
});

// ── RESET FILE ────────────────────────────────
function resetFile() {
  fileInput.value   = '';
  currentFileText   = '';
  currentFileObj    = null;

  fileInfo.style.display   = 'none';
  uploadText.textContent   = 'Drag & drop or click to browse';
  uploadHint.textContent   = 'PDF · DOCX · TXT';

  // UX: restore drop zone to full size
  uploadZone.classList.remove('drop-zone--loaded');

  // Reset all preview panes
  hideAllPreviews();
  previewEmpty.style.display = 'flex';
  wordCount.style.display    = 'none';

  // Hide live stats & warning
  document.getElementById('live-stats').style.display       = 'none';
  document.getElementById('large-doc-notice').style.display = 'none';

  // Reset output
  outputText.style.display  = 'none';
  outputEmpty.style.display = 'flex';
  outputBadge.style.display = 'none';
  outputText.textContent    = '';
  currentSummary            = '';

  // Reset intel panel
  const intel = document.getElementById('intel-panel');
  if (intel) intel.style.display = 'none';

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  const outputActions = document.getElementById('output-actions');
  if (outputActions) outputActions.style.display = 'none';
}

// ── TOAST NOTIFICATIONS ───────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '28px',
    right: '24px',
    background: type === 'success' ? 'var(--accent)' : type === 'error' ? '#EF4444' : 'var(--primary)',
    color: '#fff',
    padding: '13px 20px',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: '500',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: '9999',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'all 0.25s ease',
    maxWidth: '340px',
    lineHeight: '1.5',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)'
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 280);
  }, 3500);
}

// ── SKELETON + AI STATUS ──────────────────────
const AI_MESSAGES = [
  'Analyzing document structure…',
  'Extracting key topics…',
  'Understanding context…',
  'Compressing information…',
  'Generating summary…',
  'Refining output…',
];

function showSkeletonAndStatus() {
  // Show skeleton
  const sk = document.getElementById('skeleton-wrap');
  if (sk) sk.style.display = 'flex';

  // Hide empty state
  outputEmpty.style.display = 'none';

  // Show AI status
  const aiStatus = document.getElementById('ai-status');
  const aiMsg    = document.getElementById('ai-status-msg');
  if (!aiStatus || !aiMsg) return;
  aiStatus.style.display = 'flex';

  let msgIndex = 0;
  aiMsg.textContent = AI_MESSAGES[0];

  aiStatusInterval = setInterval(() => {
    // Fade out
    aiMsg.classList.add('fade');
    setTimeout(() => {
      msgIndex = (msgIndex + 1) % AI_MESSAGES.length;
      aiMsg.textContent = AI_MESSAGES[msgIndex];
      aiMsg.classList.remove('fade');
    }, 420);
  }, 2600);
}

function hideSkeletonAndStatus() {
  if (aiStatusInterval) {
    clearInterval(aiStatusInterval);
    aiStatusInterval = null;
  }
  const sk = document.getElementById('skeleton-wrap');
  if (sk) sk.style.display = 'none';

  const aiStatus = document.getElementById('ai-status');
  if (aiStatus) aiStatus.style.display = 'none';
}

// ── TYPING ANIMATION ──────────────────────────
function typeText(el, text, onDone) {
  if (typingTimer) clearInterval(typingTimer);
  el.textContent = '';
  let i = 0;
  const speed = 14; // ms per character — fast enough not to feel slow

  typingTimer = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i];
      i++;
    } else {
      clearInterval(typingTimer);
      typingTimer = null;
      if (typeof onDone === 'function') onDone();
    }
  }, speed);
}

// ── INTELLIGENCE PANEL ────────────────────────
function renderIntelPanel(summary) {
  const panel = document.getElementById('intel-panel');
  if (!panel) return;

  const origWords    = currentFileText.split(/\s+/).filter(Boolean).length;
  const summaryWords = summary.split(/\s+/).filter(Boolean).length;
  const ratio        = origWords > 0
    ? Math.round((1 - summaryWords / origWords) * 100)
    : 0;

  document.getElementById('intel-original').textContent = origWords.toLocaleString();
  document.getElementById('intel-summary').textContent  = summaryWords.toLocaleString();
  document.getElementById('intel-ratio').textContent    = `${ratio}%`;

  panel.style.display = 'flex';
}

// ── COPY BUTTON ───────────────────────────────
const btnCopy = document.getElementById('btn-copy');
if (btnCopy) {
  btnCopy.addEventListener('click', () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary).then(() => {
      showToast('Summary copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not copy to clipboard.', 'error');
    });
  });
}
