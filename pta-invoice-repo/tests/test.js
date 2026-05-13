// End-to-end test for both invoice modes.
const fs = require('fs');
const { jsPDF } = require('jspdf');

const html = fs.readFileSync('../index.html', 'utf8');
const FONT_B64 = html.match(/const EMBEDDED_FONT_BASE64 = '([A-Za-z0-9+/=]+)'/)[1];

const ORG = { name:'Argenziano School PTA', address1:'290 Washington Street', address2:'Somerville, MA 02143', ein:'04-2781633' };
const PDF_COLORS = { TEXT:[34,34,34], BODY:[51,51,51], MUTED:[102,102,102], RULE_STRONG:[204,204,204], RULE_LIGHT:[238,238,238] };
const LAYOUT = { LEFT:54, RIGHT:558, TOP_MARGIN:54, BOTTOM_LIMIT:720, MAX_DESC_WIDTH:380, LINE_HEIGHT_BODY:14, LINE_HEIGHT_DESC:13, LINE_HEIGHT_REF:12 };
const MODE_A='pta-to-customer', MODE_B='vendor-to-pta';

function fc(c){return '$'+(c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function sC(d,r){d.setTextColor(r[0],r[1],r[2]);}
function sD(d,r){d.setDrawColor(r[0],r[1],r[2]);}
function lines(doc,x,y,ls,h){for(const l of ls){if(!l)continue;doc.text(l,x,y);y+=h;}return y;}
function curs(doc){return{y:LAYOUT.TOP_MARGIN,moveTo(y){this.y=y;},advance(d){this.y+=d;},ensureSpace(n){if(this.y+n>LAYOUT.BOTTOM_LIMIT){doc.addPage();this.y=LAYOUT.TOP_MARGIN;return true;}return false;}};}

function drawHeader(doc,c,info){
  c.moveTo(86); const titleY=c.y;
  doc.setFontSize(24);sC(doc,PDF_COLORS.TEXT);doc.text('INVOICE',LAYOUT.LEFT,titleY);
  let leftY=titleY+38; const s=info.seller;
  doc.setFontSize(12);sC(doc,PDF_COLORS.TEXT);doc.text(s.org||s.name||'',LAYOUT.LEFT,leftY);leftY+=17;
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);
  leftY=lines(doc,LAYOUT.LEFT,leftY,[s.contact,s.addr1,s.addr2,s.email,s.phone].filter(Boolean),LAYOUT.LINE_HEIGHT_BODY);
  if(s.taxId){leftY+=2;doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);const lbl=info.mode===MODE_B?'Tax ID: ':'EIN: ';doc.text(lbl+s.taxId,LAYOUT.LEFT,leftY);leftY+=LAYOUT.LINE_HEIGHT_BODY;}
  let rightY=titleY;
  doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);doc.text('Invoice Number',LAYOUT.RIGHT,rightY,{align:'right'});rightY+=14;
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);doc.text(info.invoiceNumber,LAYOUT.RIGHT,rightY,{align:'right'});rightY+=22;
  doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);doc.text('Invoice Date',LAYOUT.RIGHT,rightY,{align:'right'});rightY+=14;
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);doc.text(info.invoiceDateLong,LAYOUT.RIGHT,rightY,{align:'right'});rightY+=8;
  c.moveTo(Math.max(leftY,rightY)+20);
}
function drawBillTo(doc,c,b,mode){
  c.ensureSpace(90);
  doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);doc.text('BILL TO',LAYOUT.LEFT,c.y);c.advance(16);
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);
  c.y=lines(doc,LAYOUT.LEFT,c.y,[b.name,b.org,b.addr1,b.addr2,b.email].filter(Boolean),LAYOUT.LINE_HEIGHT_BODY);
  if(b.taxId){c.advance(2);doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);const lbl=mode===MODE_B?'EIN: ':'Tax ID: ';doc.text(lbl+b.taxId,LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);}
  c.advance(16);
}
function drawItemsHeader(doc,c){
  doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);doc.text('DESCRIPTION',LAYOUT.LEFT,c.y);doc.text('AMOUNT',LAYOUT.RIGHT,c.y,{align:'right'});c.advance(6);
  sD(doc,PDF_COLORS.RULE_STRONG);doc.setLineWidth(0.75);doc.line(LAYOUT.LEFT,c.y,LAYOUT.RIGHT,c.y);c.advance(16);
}
function drawItem(doc,c,i){
  doc.setFontSize(10);const dl=doc.splitTextToSize(i.description,LAYOUT.MAX_DESC_WIDTH);
  let rl=[];if(i.reference){doc.setFontSize(9);rl=doc.splitTextToSize(i.reference,LAYOUT.MAX_DESC_WIDTH);}
  if(c.ensureSpace(dl.length*LAYOUT.LINE_HEIGHT_DESC+rl.length*LAYOUT.LINE_HEIGHT_REF+24))drawItemsHeader(doc,c);
  const aY=c.y;
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);for(const l of dl){doc.text(l,LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_DESC);}
  if(rl.length){doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);for(const l of rl){doc.text(l,LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_REF);}}
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);doc.text(fc(i.amountCents),LAYOUT.RIGHT,aY,{align:'right'});
  c.advance(8);sD(doc,PDF_COLORS.RULE_LIGHT);doc.setLineWidth(0.5);doc.line(LAYOUT.LEFT,c.y,LAYOUT.RIGHT,c.y);c.advance(16);
}
function drawTotal(doc,c,t){
  c.ensureSpace(30);doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);
  doc.text('Total Due',LAYOUT.LEFT,c.y);doc.text(fc(t),LAYOUT.RIGHT,c.y,{align:'right'});c.advance(40);
}
function drawPay(doc,c,s,mode){
  c.ensureSpace(160);
  doc.setFontSize(9);sC(doc,PDF_COLORS.MUTED);doc.text('PAYMENT INSTRUCTIONS',LAYOUT.LEFT,c.y);c.advance(16);
  doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);
  doc.text('Make check payable to:',LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);
  doc.text(s.org||s.name||'',LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY+6);
  if(s.addr1){
    doc.text('Mail to:',LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);
    doc.text(s.org||s.name||'',LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);
    doc.text(s.addr1,LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);
    if(s.addr2){doc.text(s.addr2,LAYOUT.LEFT,c.y);c.advance(LAYOUT.LINE_HEIGHT_BODY);}
  }
  if(mode===MODE_A){c.advance(12);doc.setFontSize(10);sC(doc,PDF_COLORS.BODY);doc.text('Thank you for supporting the Argenziano School community.',LAYOUT.LEFT,c.y);}
}

function build(data,out){
  const doc=new jsPDF({unit:'pt',format:'letter'});
  doc.addFileToVFS('NotoSans-Regular.ttf',FONT_B64);
  doc.addFont('NotoSans-Regular.ttf','NotoSans','normal');
  doc.setFont('NotoSans','normal');
  doc.setProperties({title:'Test',author:data.seller.org});
  const c=curs(doc);
  drawHeader(doc,c,data);drawBillTo(doc,c,data.buyer,data.mode);
  drawItemsHeader(doc,c);for(const i of data.items)drawItem(doc,c,i);
  drawTotal(doc,c,data.totalCents);drawPay(doc,c,data.seller,data.mode);
  fs.writeFileSync(out,Buffer.from(doc.output('arraybuffer')));
}

// Mode A
const itemsA=[{description:'Bus transportation for field trip',reference:'Eastern Bus \u2014 Order #76201',amountCents:77500}];
build({mode:MODE_A,invoiceNumber:'05132026',invoiceDateLong:'May 13, 2026',
  seller:{org:ORG.name,addr1:ORG.address1,addr2:ORG.address2,taxId:ORG.ein},
  buyer:{name:'Alice Chou',org:'Mystic River Watershed Association',email:'alice.chou@mysticriver.org'},
  items:itemsA,totalCents:77500
},'./mode-a.pdf');

// Mode B
const itemsB=[
  {description:'Catering for Spring Carnival',reference:'Quote Q-2026-04',amountCents:124500},
  {description:'Setup and breakdown labor',reference:'',amountCents:21000},
];
build({mode:MODE_B,invoiceNumber:'ACME-2026-0042',invoiceDateLong:'May 13, 2026',
  seller:{org:'Acme Catering Co.',contact:'María González',addr1:'742 Evergreen Terrace',addr2:'Cambridge, MA 02139',
    email:'billing@acmecatering.example',phone:'(617) 555-0142',taxId:'12-3456789'},
  buyer:{org:ORG.name,addr1:ORG.address1,addr2:ORG.address2,taxId:ORG.ein},
  items:itemsB,totalCents:145500
},'./mode-b.pdf');

console.log('Built mode-a.pdf and mode-b.pdf');
