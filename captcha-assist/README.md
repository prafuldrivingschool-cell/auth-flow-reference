# Captcha Assist

Captcha Assist is a Manifest V3 Chrome extension that helps a human read CAPTCHA images. It detects likely CAPTCHA input fields, opens a local enhancement panel, supports zoom and image transformations, and lets the user refresh the site's existing CAPTCHA control.

## Safety boundary

This extension is **not a CAPTCHA solver or bypass**. It never generates CAPTCHA tokens, calls CAPTCHA-provider APIs, defeats challenge-response systems, submits forms, or automatically inserts a guessed answer. Any final CAPTCHA value must be entered and confirmed by the human.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository directory.
6. Pin **Captcha Assist** from Chrome's Extensions menu.
7. Open a webpage containing a CAPTCHA-like input and reload the page.

## Permissions

- `storage`: stores only user preferences and UI settings.
- `activeTab`: allows the popup to communicate with the currently active page.
- `<all_urls>` content-script matching: required because CAPTCHA-like fields may occur on arbitrary websites. The extension does not request cookies, webRequest, browsing history, or password access.

## Detection

The content script scores visible input fields using placeholder, name, ID, class, label, nearby text, and DOM proximity. It looks for terms such as `captcha`, `enter captcha`, `verification code`, and `security code`, then associates nearby images and refresh controls. A `MutationObserver` performs debounced rescans for dynamic pages.

## Image assistance

When the user opens a detected CAPTCHA, the extension copies the image into a local canvas and offers:

- Original
- Grayscale
- Contrast
- Sharpen
- Invert
- Zoom and reset zoom
- Refresh using the webpage's existing refresh control

The original webpage image is never modified. Processing occurs on a copied canvas.

## OCR

OCR is **off by default**. This repository intentionally does not include a remote OCR service or a bundled OCR engine. The settings page exposes the requested OCR preference, but the current build reports that local OCR is unavailable rather than pretending to provide a solver. This keeps the privacy and human-in-the-loop requirements intact.

## Privacy

There is no backend and no analytics. CAPTCHA images are processed only in the browser after the user requests assistance. CAPTCHA values are never collected, stored, transmitted, or automatically populated. The extension does not access cookies or CAPTCHA verification endpoints.

## Accessibility

The overlay uses semantic buttons, keyboard focus, an ARIA dialog, an ARIA live status region, Escape-to-close, visible focus outlines, and responsive sizing.

## Test page

Open `test/test-page.html` after allowing Chrome to access local file URLs for the extension if needed. It provides a synthetic CAPTCHA-like canvas and a refresh button. It is not a real CAPTCHA and does not perform verification.

Test initial detection, refresh, dynamic DOM changes, multiple candidates, missing image/refresh handling, keyboard navigation, image enhancement, zoom, OCR-disabled behavior, and duplicate MutationObserver events.

## Limitations

- Cross-origin or restricted iframes cannot be inspected by the top-level content script.
- Some sites deliberately hide or obfuscate their DOM; detection can therefore produce false negatives/positives.
- Cross-origin image policies can prevent canvas processing. The extension falls back to an explanatory message rather than bypassing browser security.
- The included test CAPTCHA is synthetic and only validates UI behavior.

## Security model

Extension code contains no `eval`, `Function`, remote scripts, external APIs, token generation, automatic form submission, or automatic CAPTCHA-field population. The project uses Manifest V3.

## Repository note

This repository originally contained an authentication-flow reference. Captcha Assist is now included as the requested extension project under the repository root; the earlier authentication reference remains available under its original files.
