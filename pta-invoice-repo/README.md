# Argenziano School PTA — Invoice Generator

A single-file static HTML tool that generates invoice PDFs in the browser. No backend, no build step required for normal use.

## Live use

Open `index.html` in any modern browser, or visit the GitHub Pages URL once this repo is deployed.

Two modes:

- **PTA bills a customer.** The PTA appears as the seller at the top of the invoice. You fill in the customer's name, organization, and email. Invoice number auto-fills from the date as `MMDDYYYY`.
- **A vendor bills the PTA.** The vendor fills in their business name, street address, contact, email, phone, and optional tax ID. The PTA appears in the BILL TO section. The output PDF is what the PTA uses as documentation for paying the vendor.

Buttons:

- **Generate PDF** — downloads the invoice to your device.
- **Email PDF** — opens the OS share sheet with the PDF pre-attached. Pick Gmail (or any email app). Subject and body are filled in; you type the recipient.

## Publishing to GitHub Pages

1. Push this repo to GitHub.
2. In the repo on github.com: Settings → Pages.
3. Source: "Deploy from a branch". Branch: `main`. Folder: `/ (root)`. Save.
4. After about 60 seconds, the page is live at `https://<your-username>.github.io/<repo-name>/`.

Email PDF only works from a real `https://` origin. It does not work from `file://` URLs or from sandboxed preview iframes. GitHub Pages is fine.

## Repo layout

```
.
├── index.html               <- the deliverable; what GitHub Pages serves
├── README.md
├── .gitignore
├── src/
│   ├── assemble.py          <- rebuild script
│   ├── build.sh             <- runs assemble.py with the right inputs
│   ├── template.html        <- HTML template with __FONT_BASE64__ and __SRI_HASH__ placeholders
│   └── fonts/
│       ├── noto-sans-merged.ttf  <- Noto Sans Latin + Latin Extended-A merged
│       └── LICENSE.txt           <- SIL Open Font License 1.1
└── tests/
    ├── package.json
    ├── test.js              <- generates Mode A and Mode B PDFs, asserts content
    └── test-email.js        <- verifies email helpers and HTML wiring
```

## Updating

For small changes (text, layout, validation messages): edit `index.html` directly. The script is in a `<script>` block at the bottom of the file. Commit and push; GitHub Pages redeploys in about a minute.

For changes that affect the embedded font or a fresh rebuild from the template:

```bash
cd src
./build.sh
```

This regenerates `index.html` from `src/template.html` + `src/fonts/noto-sans-merged.ttf`. Requires Python 3.7+.

If you change the jsPDF version, recompute the SRI hash and update it in `src/assemble.py`:

```bash
curl -sLO https://cdn.jsdelivr.net/npm/jspdf@<version>/dist/jspdf.umd.min.js
openssl dgst -sha384 -binary jspdf.umd.min.js | openssl base64 -A
```

Paste the output into the `SRI_HASH` constant in `assemble.py` and update the script URL in `src/template.html`.

## Testing

```bash
cd tests
npm install
npm test
```

`test.js` generates a Mode A PDF (PTA billing Mystic River for the bus charter) and a Mode B PDF (a vendor named Acme Catering billing the PTA, with diacritics, Polish-style addresses, etc.) and writes them to `tests/mode-a.pdf` and `tests/mode-b.pdf`. Use any PDF reader to inspect them.

`test-email.js` checks the HTML wiring around the Email PDF button and prints the subject/body templates for both modes.

## Stack

- jsPDF 2.5.1 from cdn.jsdelivr.net (npm-mirrored), pinned with a verified SHA-384 SRI hash.
- Noto Sans (Latin + Latin Extended-A merged) inlined as base64 TTF. ~178KB of font data, covers Spanish, Portuguese, French, German, Italian, Polish, Czech, Hungarian, Romanian, and more. Anything outside Latin Extended-A (Cyrillic, Greek, CJK, Arabic, Hebrew, Devanagari) is rejected by the form's validator rather than silently mangled.
- All money handled as integer cents to avoid floating-point drift.
- Form state autosaves to `sessionStorage` so accidental reloads don't lose work.

## License

The font (`src/fonts/noto-sans-merged.ttf`) is under the SIL Open Font License 1.1. See `src/fonts/LICENSE.txt`.

The rest of this code is provided as-is for the Argenziano School PTA's use. No warranty.
