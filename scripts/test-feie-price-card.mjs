import assert from 'node:assert/strict';
import { buildFeieBarcodeTag, buildFeieCompactBarcodeCommand, buildFeiePriceCard, countCutTags } from '../lib/feie-price-card.mjs';

const settings = { storeName: '宜梧來來超市' };

function card(product) {
  return buildFeiePriceCard({ product, settings });
}

{
  const result = card({ labelName: '布丁*12入', spec: '100g', price: 120, barcode: '4710123456789' });
  assert.equal(result.content.nameZh, '布丁*12入');
  assert.equal(result.content.spec, '100g');
  assert.equal(result.content.barcodeSpacingMode, 'official-function-compact-48dot');
  assert.equal(result.content.barcodeHeightDots, 48);
  assert.equal(result.markup.includes('<BC128_C>'), false);
  assert.equal(result.markup.includes('\x1b\x64\x02'), false);
  assert.equal(result.markup.includes('\x1d\x68\x30'), true);
  assert.equal(result.markup.includes('\x1d\x77\x02'), true);
  assert.equal(result.markup.includes('\x1d\x6b\x49'), true);
  assert.equal(result.markup.endsWith('<BR>'), false);
  assert.equal(countCutTags(result.markup), 0);
  assert.equal(result.content.cutMode, 'device-auto');
}

{
  const command = buildFeieCompactBarcodeCommand('130511114450');
  assert.equal(command.startsWith('\x1d\x48\x32\x1d\x68\x30\x1d\x77\x02\x1d\x6b\x49'), true);
  assert.equal(command.includes('\x1b\x64\x02'), false);
  assert.equal(command.endsWith('{B130511114450'), true);
  const roundTrip = new URLSearchParams({ content: command }).get('content');
  assert.equal(roundTrip, command);
}

{
  const result = card({ labelName: '義美紅豆牛奶冰棒', price: 20, barcode: '130511114450' });
  assert.equal(result.markup.includes('<W><L><BOLD>義美紅豆牛奶冰棒</BOLD></L></W>'), true);
  assert.equal(result.content.barcodeSpacingMode, 'official-function-compact-48dot');
}

{
  const result = card({ labelName: '義美蘇打餅乾(紫菜)', price: 55, barcode: '4710123456789' });
  assert.equal(result.markup.includes('<L><BOLD>義美蘇打餅乾(紫菜)</BOLD></L>'), true);
  assert.equal(result.markup.includes('<W><L><BOLD>義美蘇打餅乾(紫菜)</BOLD></L></W>'), false);
}

for (const name of ['統一肉燥麵(包裝)*5入', '統一麥香奶茶']) {
  const result = card({ labelName: name, price: 55, barcode: '4710123456789' });
  assert.equal(result.content.nameZh, name);
  assert.equal(result.markup.includes(name), true);
}

{
  const result = card({
    labelName: '越南咖啡',
    nameVi: 'Cà phê sữa đá Đặc biệt',
    price: 55,
    barcode: '4710123456789',
  });
  assert.equal(result.content.nameVi, 'Ca phe sua da Dac biet');
  assert.equal(result.markup.includes('Cà phê'), false);
  assert.equal(result.markup.includes('Ca phe sua da Dac biet'), true);
}

{
  const result = card({ labelName: '測試商品', nameVi: '', nameId: '', price: 10, barcode: '1234567890123' });
  assert.equal(result.content.nameVi, '');
  assert.equal(result.content.nameId, '');
  assert.equal(result.markup.includes('VI -'), false);
  assert.equal(result.markup.includes('ID -'), false);
}

{
  const result = card({ labelName: '惡意<CUT>商品', spec: '<QR>100g</QR>', price: 10, barcode: '1234567890123' });
  assert.equal(countCutTags(result.markup), 0);
  assert.equal(result.markup.includes('<QR>'), false);
  assert.match(result.markup, /惡意CUT商品/);
}

assert.deepEqual(buildFeieBarcodeTag('4710123456789'), {
  tag: '<BC128_C>4710123456789</BC128_C>', format: 'Code 128C', text: '4710123456789'
});
assert.deepEqual(buildFeieBarcodeTag('ABC123'), {
  tag: '<BC128_A>ABC123</BC128_A>', format: 'Code 128A', text: 'ABC123'
});
assert.deepEqual(buildFeieBarcodeTag('Abc123'), {
  tag: '<BC128_B>Abc123</BC128_B>', format: 'Code 128B', text: 'Abc123'
});
assert.equal(buildFeieBarcodeTag('12345678901234567890123').format, '純文字');

{
  const result = card({ labelName: '長條碼測試', price: 55, barcode: '123456789012345' });
  assert.equal(result.content.barcodeSpacingMode, 'native-no-br');
  assert.equal(result.markup.includes('<BC128_C>123456789012345</BC128_C>'), true);
}

{
  const result = card({ labelName: '測試商品', price: 55, barcode: '1234567890123' });
  assert.equal(result.content.times, 1);
  assert.match(result.markup, /<RIGHT><W><B>55<\/B><\/W><BOLD>元<\/BOLD><\/RIGHT>$/);
}

console.log('feie price card formatter tests passed');
