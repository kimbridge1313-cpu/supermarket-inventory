import { AnimatePresence, motion } from 'framer-motion';
import Barcode from 'react-barcode';
import {
  Archive,
  BarcodeIcon,
  Box,
  Calculator,
  Edit3,
  FileDown,
  PackagePlus,
  Printer,
  Save,
  Search,
  Settings,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';

type Product = {
  id: string;
  barcode: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  untaxedPrice: number;
  vendor: string;
  stock: number;
};

type LineType = 'purchase' | 'return';

type BatchLine = {
  id: string;
  type: LineType;
  productId: string;
  barcode: string;
  name: string;
  vendor: string;
  qty: number;
  unitCost: number;
};

type BatchRecord = {
  id: string;
  date: string;
  vendor: string;
  total: number;
  lines: BatchLine[];
};

const today = new Date().toISOString().slice(0, 10);

const seedProducts: Product[] = [
  {
    id: 'p-001',
    barcode: '4710001000012',
    name: '味全鮮乳 936ml',
    category: '冷藏乳品',
    cost: 68,
    price: 89,
    untaxedPrice: 84.76,
    vendor: '大成食品',
    stock: 24,
  },
  {
    id: 'p-002',
    barcode: '4710001000029',
    name: '義美小泡芙',
    category: '餅乾零食',
    cost: 26,
    price: 39,
    untaxedPrice: 37.14,
    vendor: '義美供應',
    stock: 56,
  },
  {
    id: 'p-003',
    barcode: '4710001000036',
    name: '台糖砂糖 1kg',
    category: '民生食品',
    cost: 34,
    price: 45,
    untaxedPrice: 42.86,
    vendor: '台糖經銷',
    stock: 18,
  },
  {
    id: 'p-004',
    barcode: '4710001000043',
    name: '家庭號衛生紙',
    category: '日用品',
    cost: 118,
    price: 149,
    untaxedPrice: 141.9,
    vendor: '清潔用品商',
    stock: 10,
  },
];

const money = (value: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);
const uid = () => Math.random().toString(36).slice(2, 10);

function App() {
  const [tab, setTab] = useState<'batch' | 'products' | 'records' | 'label'>('batch');
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [records, setRecords] = useState<BatchRecord[]>([]);
  const [scanCode, setScanCode] = useState('4710001000012');
  const [mode, setMode] = useState<LineType>('purchase');
  const [lines, setLines] = useState<BatchLine[]>([]);
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(seedProducts[0].id);
  const [notice, setNotice] = useState('測試版：資料目前僅保存在前端 state，重新整理後會還原。');

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [product.name, product.barcode, product.category, product.vendor].some((field) => field.toLowerCase().includes(keyword)),
    );
  }, [products, query]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const batchTotal = lines.reduce((sum, line) => sum + (line.type === 'return' ? -1 : 1) * line.qty * line.unitCost, 0);

  function addScannedLine() {
    const found = products.find((product) => product.barcode === scanCode.trim());
    if (!found) {
      setNotice('找不到商品。測試版可先到商品主檔新增，再回到進退貨流程。');
      return;
    }

    setLines((current) => [
      ...current,
      {
        id: uid(),
        type: mode,
        productId: found.id,
        barcode: found.barcode,
        name: found.name,
        vendor: found.vendor,
        qty: 1,
        unitCost: found.cost,
      },
    ]);
    setNotice(`${found.name} 已加入${mode === 'purchase' ? '進貨' : '退貨'}清單。`);
  }

  function updateLine(id: string, patch: Partial<BatchLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function deleteLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function saveBatch() {
    if (lines.length === 0) {
      setNotice('目前沒有可儲存的進退貨明細。');
      return;
    }

    const vendor = lines.length === 1 ? lines[0].vendor : '多廠商';
    const total = batchTotal;
    const savedLines = lines.map((line) => ({ ...line }));

    setRecords((current) => [{ id: uid(), date: today, vendor, total, lines: savedLines }, ...current]);
    setProducts((current) =>
      current.map((product) => {
        const delta = savedLines
          .filter((line) => line.productId === product.id)
          .reduce((sum, line) => sum + (line.type === 'return' ? -line.qty : line.qty), 0);
        return { ...product, stock: product.stock + delta };
      }),
    );
    setLines([]);
    setNotice('本次進退貨紀錄已儲存，庫存示意數量已同步更新。');
  }

  function addProduct() {
    const next: Product = {
      id: `p-${uid()}`,
      barcode: `471${Date.now().toString().slice(-10)}`,
      name: '新商品',
      category: '未分類',
      cost: 0,
      price: 0,
      untaxedPrice: 0,
      vendor: '未設定',
      stock: 0,
    };
    setProducts((current) => [next, ...current]);
    setSelectedProductId(next.id);
    setNotice('已新增一筆前端示意商品。');
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...patch } : product)));
  }

  function deleteProduct(id: string) {
    if (products.length <= 1) return;
    const nextProducts = products.filter((product) => product.id !== id);
    setProducts(nextProducts);
    setSelectedProductId(nextProducts[0].id);
    setNotice('商品已從前端 state 刪除。正式版需確認歷史紀錄保留策略。');
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <Badge>Vercel 測試版</Badge>
          <h1>超市庫存管理</h1>
          <p>商品主檔、手機掃碼進退貨、批次紀錄與貨卡列印的前端原型。</p>
        </div>
        <div className="hero-actions">
          <Button variant="outline"><FileDown size={18} /> 匯出示意</Button>
          <Button><Settings size={18} /> 系統設定</Button>
        </div>
      </section>

      <nav className="tabs" aria-label="功能分頁">
        <TabButton active={tab === 'batch'} onClick={() => setTab('batch')} icon={<PackagePlus size={18} />} label="進退貨" />
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} icon={<Archive size={18} />} label="商品主檔" />
        <TabButton active={tab === 'records'} onClick={() => setTab('records')} icon={<Calculator size={18} />} label="批次紀錄" />
        <TabButton active={tab === 'label'} onClick={() => setTab('label')} icon={<Printer size={18} />} label="貨卡列印" />
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
        >
          {tab === 'batch' && (
            <BatchPanel
              mode={mode}
              setMode={setMode}
              scanCode={scanCode}
              setScanCode={setScanCode}
              addScannedLine={addScannedLine}
              lines={lines}
              updateLine={updateLine}
              deleteLine={deleteLine}
              saveBatch={saveBatch}
              batchTotal={batchTotal}
            />
          )}
          {tab === 'products' && (
            <ProductsPanel
              query={query}
              setQuery={setQuery}
              products={filteredProducts}
              addProduct={addProduct}
              updateProduct={updateProduct}
              deleteProduct={deleteProduct}
            />
          )}
          {tab === 'records' && <RecordsPanel records={records} />}
          {tab === 'label' && (
            <LabelPanel products={products} selectedProduct={selectedProduct} setSelectedProductId={setSelectedProductId} />
          )}
        </motion.section>
      </AnimatePresence>

      <div className="notice">{notice}</div>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button className={active ? 'tab active' : 'tab'} onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}

function BatchPanel(props: {
  mode: LineType;
  setMode: (mode: LineType) => void;
  scanCode: string;
  setScanCode: (value: string) => void;
  addScannedLine: () => void;
  lines: BatchLine[];
  updateLine: (id: string, patch: Partial<BatchLine>) => void;
  deleteLine: (id: string) => void;
  saveBatch: () => void;
  batchTotal: number;
}) {
  return (
    <div className="grid two-columns">
      <Card>
        <CardHeader>
          <CardTitle>手機掃碼進退貨</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="segmented">
            <button className={props.mode === 'purchase' ? 'selected' : ''} onClick={() => props.setMode('purchase')} type="button">
              進貨
            </button>
            <button className={props.mode === 'return' ? 'selected' : ''} onClick={() => props.setMode('return')} type="button">
              退貨
            </button>
          </div>
          <label className="field-label">掃描或輸入商品條碼</label>
          <div className="scan-row">
            <Input value={props.scanCode} onChange={(event) => props.setScanCode(event.target.value)} inputMode="numeric" />
            <Button onClick={props.addScannedLine}><BarcodeIcon size={18} /> 加入</Button>
          </div>
          <p className="hint">正式版可接手機相機掃碼。測試版先以手動輸入條碼模擬。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本次總額</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="total-number">{money(props.batchTotal)}</div>
          <div className="summary-grid">
            <div><span>明細筆數</span><strong>{props.lines.length}</strong></div>
            <div><span>狀態</span><strong>尚未接 Firebase</strong></div>
          </div>
          <Button className="full" onClick={props.saveBatch}><Save size={18} /> 儲存本次紀錄</Button>
        </CardContent>
      </Card>

      <Card className="wide">
        <CardHeader>
          <CardTitle>進退貨清單</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>類型</th>
                  <th>商品</th>
                  <th>數量</th>
                  <th>單價</th>
                  <th>小計</th>
                  <th>刪除</th>
                </tr>
              </thead>
              <tbody>
                {props.lines.map((line) => (
                  <tr key={line.id}>
                    <td><Badge>{line.type === 'purchase' ? '進貨' : '退貨'}</Badge></td>
                    <td>
                      <strong>{line.name}</strong>
                      <small>{line.barcode}</small>
                    </td>
                    <td><Input type="number" min={0} value={line.qty} onChange={(event) => props.updateLine(line.id, { qty: Number(event.target.value) })} /></td>
                    <td><Input type="number" min={0} value={line.unitCost} onChange={(event) => props.updateLine(line.id, { unitCost: Number(event.target.value) })} /></td>
                    <td className="money">{money((line.type === 'return' ? -1 : 1) * line.qty * line.unitCost)}</td>
                    <td><Button variant="ghost" size="icon" onClick={() => props.deleteLine(line.id)}><Trash2 size={18} /></Button></td>
                  </tr>
                ))}
                {props.lines.length === 0 && (
                  <tr><td colSpan={6} className="empty">尚未加入商品</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsPanel(props: {
  query: string;
  setQuery: (value: string) => void;
  products: Product[];
  addProduct: () => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>商品主檔</CardTitle>
        <div className="toolbar">
          <div className="search-box"><Search size={18} /><Input placeholder="搜尋商品、條碼、分類、廠商" value={props.query} onChange={(event) => props.setQuery(event.target.value)} /></div>
          <Button onClick={props.addProduct}><Box size={18} /> 新增商品</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="product-grid">
          {props.products.map((product) => (
            <div className="product-card" key={product.id}>
              <div className="product-card-head">
                <Badge>{product.category}</Badge>
                <Button variant="ghost" size="icon" onClick={() => props.deleteProduct(product.id)}><Trash2 size={16} /></Button>
              </div>
              <Input value={product.name} onChange={(event) => props.updateProduct(product.id, { name: event.target.value })} />
              <div className="mini-grid">
                <label>條碼<Input value={product.barcode} onChange={(event) => props.updateProduct(product.id, { barcode: event.target.value })} /></label>
                <label>廠商<Input value={product.vendor} onChange={(event) => props.updateProduct(product.id, { vendor: event.target.value })} /></label>
                <label>進價<Input type="number" value={product.cost} onChange={(event) => props.updateProduct(product.id, { cost: Number(event.target.value) })} /></label>
                <label>售價<Input type="number" value={product.price} onChange={(event) => props.updateProduct(product.id, { price: Number(event.target.value), untaxedPrice: Number(event.target.value) / 1.05 })} /></label>
                <label>庫存<Input type="number" value={product.stock} onChange={(event) => props.updateProduct(product.id, { stock: Number(event.target.value) })} /></label>
                <label>未稅價<Input type="number" value={Math.round(product.untaxedPrice)} onChange={(event) => props.updateProduct(product.id, { untaxedPrice: Number(event.target.value) })} /></label>
              </div>
              <Button variant="outline" className="full"><Edit3 size={16} /> 儲存修改</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordsPanel({ records }: { records: BatchRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>批次進退貨紀錄</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>廠商</th>
                <th>筆數</th>
                <th>總額</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.vendor}</td>
                  <td>{record.lines.length}</td>
                  <td className="money">{money(record.total)}</td>
                  <td><Badge>前端示意</Badge></td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={5} className="empty">尚無紀錄。請先儲存一筆進退貨。</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function LabelPanel({ products, selectedProduct, setSelectedProductId }: { products: Product[]; selectedProduct: Product; setSelectedProductId: (id: string) => void }) {
  return (
    <div className="grid two-columns">
      <Card>
        <CardHeader>
          <CardTitle>選擇貨卡商品</CardTitle>
        </CardHeader>
        <CardContent>
          <select className="select" value={selectedProduct.id} onChange={(event) => setSelectedProductId(event.target.value)}>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
          </select>
          <p className="hint">正式版會再依標籤機 API 替換列印動作。此版保留前端貨卡預覽。</p>
          <Button className="full" onClick={() => window.print()}><Printer size={18} /> 列印預覽</Button>
        </CardContent>
      </Card>
      <Card className="label-card">
        <CardContent>
          <div className="shelf-label">
            <div className="label-name">{selectedProduct.name}</div>
            <div className="label-price">{money(selectedProduct.price)}</div>
            <div className="label-meta">{selectedProduct.category}｜{selectedProduct.vendor}</div>
            <Barcode value={selectedProduct.barcode} width={1.4} height={42} displayValue fontSize={12} margin={0} />
          </div>
          <div className="label-actions">
            <Button variant="outline"><Undo2 size={16} /> 變更價格</Button>
            <Button><Printer size={16} /> 送出列印</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
