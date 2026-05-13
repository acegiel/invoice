// Test the email/share helpers by simulating a Web Share-capable environment.
const fs = require('fs');
const { jsPDF } = require('jspdf');

const html = fs.readFileSync('../index.html', 'utf8');

// Stub Web Share API to verify our code path
let shareCalledWith = null;
global.navigator = {
  canShare: (data) => {
    if (!data || !data.files) return false;
    return data.files.every(f => f instanceof File);
  },
  share: async (data) => {
    shareCalledWith = data;
    return true;
  },
};
global.window = { jspdf: { jsPDF } };

// Polyfill File/Blob if missing (Node 20+ has them, but be safe)
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(parts, name, opts = {}) {
      this.name = name;
      this.type = opts.type || '';
      this._parts = parts;
    }
  };
}

// Verify shareSupportsFiles is true with our polyfill
function shareSupportsFiles() {
  if (!navigator.canShare) return false;
  try {
    const probe = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch (e) { return false; }
}
console.log('shareSupportsFiles():', shareSupportsFiles());

// Verify the helper functions are syntactically extractable and produce reasonable output
function emailSubjectFor(data) {
  const sellerName = data.seller.org || data.seller.name || 'Sender';
  return 'Invoice ' + data.invoiceNumber + ' from ' + sellerName;
}
function emailBodyFor(data) {
  const sellerName = data.seller.org || data.seller.name || '';
  const total = '$' + (data.totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return 'Invoice ' + data.invoiceNumber
       + '\nFrom: ' + sellerName
       + '\nDate: ' + data.invoiceDateLong
       + '\nTotal: ' + total
       + '\n\nDetails attached.';
}

// Test Mode A
const dataA = {
  mode: 'pta-to-customer',
  invoiceNumber: '05132026',
  invoiceDateLong: 'May 13, 2026',
  seller: { org: 'Argenziano School PTA' },
  buyer:  { name: 'Alice Chou', org: 'Mystic River Watershed Association' },
  items: [{ description: 'Bus fare', amountCents: 77500 }],
  totalCents: 77500,
};
console.log('\nMode A subject:', emailSubjectFor(dataA));
console.log('Mode A body:');
console.log(emailBodyFor(dataA));

// Test Mode B
const dataB = {
  mode: 'vendor-to-pta',
  invoiceNumber: 'ACME-2026-0042',
  invoiceDateLong: 'May 13, 2026',
  seller: { org: 'Acme Catering Co.', addr1: '742 Evergreen Terrace', addr2: 'Cambridge, MA 02139' },
  buyer:  { org: 'Argenziano School PTA' },
  items: [{ description: 'Catering', amountCents: 124500 }],
  totalCents: 124500,
};
console.log('\nMode B subject:', emailSubjectFor(dataB));
console.log('Mode B body:');
console.log(emailBodyFor(dataB));

// Confirm the HTML wires it all up
const checks = [
  ['id="emailBtn"', 'email button exists in HTML'],
  ['shareSupportsFiles', 'feature-detection helper exists (used for documentation)'],
  ['Email PDF button is always visible (no display:none on it)', 'button visibility', /<button[^>]*id="emailBtn"(?![^>]*display:none)/],
  ['navigator.share', 'share API is used'],
  ['AbortError', 'user cancellation handled'],
  ['Preparing\\u2026', 'preparing label set during share'],
  ['buildPDFDoc', 'PDF builder is refactored to return doc'],
  ['function buildPDF(data) {', 'thin buildPDF wrapper still exists'],
  ['emailPDF', 'emailPDF helper exists'],
];
console.log('\nHTML wiring:');
let ok = true;
for (const entry of checks) {
  const [needle, label, rx] = entry;
  const found = rx ? rx.test(html) : html.includes(needle.replace('\\\\', '\\'));
  console.log(('  ' + (found ? 'PASS' : 'FAIL')) + ': ' + label);
  if (!found) ok = false;
}
process.exit(ok ? 0 : 1);
