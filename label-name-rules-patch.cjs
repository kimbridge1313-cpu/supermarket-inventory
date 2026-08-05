const fs = require('node:fs');

const replacement = String.raw`const capacitySpecPattern=/\d+(?:\.\d+)?\s?(?:ml|mL|ML|cc|CC|l|L|g|G|kg|KG|公克|公斤|斤|台斤|兩)/g;
    function extractSpec(name){const specs=[];let m;capacitySpecPattern.lastIndex=0;while((m=capacitySpecPattern.exec(String(name||"")))!==null)specs.push(m[0].replace(/\s+/g,""));capacitySpecPattern.lastIndex=0;return specs.join(" ")}
    function generateLabelNameFromName(name){let base=String(name||"").trim();const packMatch=base.match(/(?:[*×xX]\s*)?(\d+\s*入)\s*$/);const pack=packMatch?packMatch[1].replace(/\s+/g,""):"";if(packMatch)base=base.slice(0,packMatch.index);const spec=extractSpec(base);if(spec){base=base.replace(capacitySpecPattern,"");capacitySpecPattern.lastIndex=0}base=base.replace(/[（(]\s*[）)]/g,"").replace(/\s+/g,"").replace(/^[*×xX－\-—_]+|[*×xX－\-—_]+$/g,"").trim();return{labelName:base+(pack?"*"+pack:""),spec}}`;

function validateRules() {
  const generate = new Function(`${replacement};return generateLabelNameFromName;`)();
  const cases = [
    ['布丁 100g*12入', '布丁*12入', '100g'],
    ['統一 肉燥麵(包裝)', '統一肉燥麵(包裝)', ''],
    ['統一 肉燥麵(包裝)*5入', '統一肉燥麵(包裝)*5入', ''],
    ['義美 蘇打餅乾(紫菜)192g', '義美蘇打餅乾(紫菜)', '192g'],
    ['統一 麥香奶茶 300ml', '統一麥香奶茶', '300ml'],
    ['統一 麥香奶茶 300ml*6入', '統一麥香奶茶*6入', '300ml'],
    ['統一 麥香奶茶 300ml*24入', '統一麥香奶茶*24入', '300ml']
  ];

  for (const [input, expectedName, expectedSpec] of cases) {
    const actual = generate(input);
    if (actual.labelName !== expectedName || actual.spec !== expectedSpec) {
      throw new Error(`Label rule failed for ${input}: ${JSON.stringify(actual)}`);
    }
  }
}

function patchLabelRules() {
  const file = 'index.html';
  if (!fs.existsSync(file)) return;

  let text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('const specPattern=');
  const end = start >= 0 ? text.indexOf('function stripVietnameseMarks', start) : -1;

  if (start < 0 || end < 0) {
    throw new Error('Unable to locate existing label name rules');
  }

  text = text.slice(0, start) + replacement + '\n    ' + text.slice(end);
  fs.writeFileSync(file, text);
}

validateRules();
patchLabelRules();
