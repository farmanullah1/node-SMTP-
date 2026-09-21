import React, { useState, useEffect, useRef } from 'react';

export default function PreviewCanvas({ previewData, activeView, activeDevice, onViewChange, onDeviceChange }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const iframeRef = useRef(null);

  // Update iframe document when rendered HTML changes
  useEffect(() => {
    if (iframeRef.current && previewData?.html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(previewData.html);
        doc.close();
      }
    }
  }, [previewData?.html, activeView]);

  function handleCopy() {
    let textToCopy = '';
    if (activeView === 'plaintext') {
      textToCopy = previewData?.text || '';
    } else {
      textToCopy = previewData?.html || '';
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  return (
    <section class="preview-area">
      {/* Toolbar */}
      <div class="preview-toolbar">
        <div class="toolbar-group">
          <div class="view-tabs" role="tablist">
            <button
              type="button"
              class={`view-tab ${activeView === 'rendered' ? 'active' : ''}`}
              onClick={() => onViewChange('rendered')}
            >
              Rendered HTML
            </button>
            <button
              type="button"
              class={`view-tab ${activeView === 'plaintext' ? 'active' : ''}`}
              onClick={() => onViewChange('plaintext')}
            >
              Plain Text Fallback
            </button>
            <button
              type="button"
              class={`view-tab ${activeView === 'source' ? 'active' : ''}`}
              onClick={() => onViewChange('source')}
            >
              HTML Source
            </button>
          </div>
        </div>

        <div class="toolbar-group">
          {/* Device Switcher */}
          <div class="device-toggle">
            <button
              type="button"
              class={`device-btn ${activeDevice === 'desktop' ? 'active' : ''}`}
              onClick={() => onDeviceChange('desktop')}
              title="Desktop Viewport (650px)"
            >
              🖥️ Desktop
            </button>
            <button
              type="button"
              class={`device-btn ${activeDevice === 'mobile' ? 'active' : ''}`}
              onClick={() => onDeviceChange('mobile')}
              title="Mobile Smartphone Viewport (375px)"
            >
              📱 Mobile
            </button>
            <button
              type="button"
              class={`device-btn ${activeDevice === 'full' ? 'active' : ''}`}
              onClick={() => onDeviceChange('full')}
              title="Full Width"
            >
              ⛶ Full
            </button>
          </div>

          {/* Copy Action */}
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onClick={handleCopy}
            title="Copy current preview contents"
          >
            {copySuccess ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Dynamic Subject Bar */}
      <div class="subject-preview-bar">
        <span class="badge">Subject</span>
        <span class="subject-text">
          {previewData?.subject || 'Loading template...'}
        </span>
      </div>

      {/* Canvas Viewport */}
      <div class="canvas-stage">
        {activeView === 'rendered' && (
          <div class={`email-frame-wrapper ${activeDevice}`}>
            <iframe
              ref={iframeRef}
              class="email-iframe"
              sandbox="allow-same-origin allow-popups"
              title="Email Live Preview"
            />
          </div>
        )}

        {activeView === 'plaintext' && (
          <pre class="code-inspector-pane">
            {previewData?.text || 'Generating plain text alternative...'}
          </pre>
        )}

        {activeView === 'source' && (
          <pre class="code-inspector-pane">
            {previewData?.html || 'Compiling HTML source...'}
          </pre>
        )}
      </div>
    </section>
  );
}
