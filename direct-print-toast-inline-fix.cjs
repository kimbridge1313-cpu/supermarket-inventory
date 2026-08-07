const fs = require('node:fs');

const file = 'public/feie-price-card.js';
if (!fs.existsSync(file)) throw new Error('Missing public/feie-price-card.js');

let text = fs.readFileSync(file, 'utf8');

const confirmCss = '    .feie-confirm{background:#0071e3!important;color:#fff!important}';
const cssStart = text.indexOf(confirmCss);
const mediaStart = text.indexOf('    @media(max-width:560px)', cssStart);
if (cssStart < 0 || mediaStart < 0) throw new Error('Unable to locate direct print toast CSS range');
text = text.slice(0, cssStart) + confirmCss + '\n' + text.slice(mediaStart);

const toastAnchor = `  directToast.setAttribute('aria-live', 'polite');\n  document.body.appendChild(directToast);`;
const toastWithStyle = `  directToast.setAttribute('aria-live', 'polite');\n  directToast.style.cssText = 'position:fixed;left:50%;bottom:24px;z-index:31000;max-width:min(420px,calc(100vw - 28px));transform:translate(-50%,16px);opacity:0;pointer-events:none;padding:12px 16px;border-radius:16px;background:rgba(28,28,30,.92);color:#fff;box-shadow:0 18px 54px rgba(0,0,0,.22);font-size:14px;font-weight:700;text-align:center;transition:.2s ease';\n  document.body.appendChild(directToast);`;
if (!text.includes(toastAnchor)) throw new Error('Unable to locate direct print toast element');
text = text.replace(toastAnchor, toastWithStyle);

const oldShow = `    directToast.textContent = message;\n    directToast.className = 'feie-direct-toast' + (type ? ' ' + type : '');\n    requestAnimationFrame(() => directToast.classList.add('visible'));\n    directToastTimer = setTimeout(() => directToast.classList.remove('visible'), type === 'error' ? 5200 : 2800);`;
const newShow = `    directToast.textContent = message;\n    directToast.style.background = type === 'error' ? 'rgba(145,28,28,.94)' : 'rgba(28,28,30,.92)';\n    directToast.style.opacity = '0';\n    directToast.style.transform = 'translate(-50%,16px)';\n    requestAnimationFrame(() => {\n      directToast.style.opacity = '1';\n      directToast.style.transform = 'translate(-50%,0)';\n    });\n    directToastTimer = setTimeout(() => {\n      directToast.style.opacity = '0';\n      directToast.style.transform = 'translate(-50%,16px)';\n    }, type === 'error' ? 5200 : 2800);`;
if (!text.includes(oldShow)) throw new Error('Unable to locate direct print toast show function');
text = text.replace(oldShow, newShow);

if (text.includes('\\\\n    .feie-direct-toast')) throw new Error('Malformed direct toast CSS remains');
if (!text.includes("directToast.style.cssText = 'position:fixed")) throw new Error('Inline direct toast styling was not applied');

fs.writeFileSync(file, text);
console.log('direct print toast inline fix applied');
