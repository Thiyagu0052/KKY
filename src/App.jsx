import { useEffect, useMemo, useState } from 'react';
import { db } from '../js/store.js';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
  { id: 'register', icon: '▤', label: 'Silver Register' },
  { id: 'settlements', icon: '₹', label: 'Settlement Summary' },
  { id: 'shops', icon: '♙', label: 'Shops' },
];

const SAMPLE_ENTRIES = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    date: '2026-07-23',
    shopId: '00000000-0000-4000-8000-000000000010',
    shopName: 'Sri Raja Jewellers',
    type: 'Delivery',
    weight: 6369,
    touch: 65,
    kooli: 11,
    pure: 4840.4,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    date: '2026-07-23',
    shopId: '00000000-0000-4000-8000-000000000010',
    shopName: 'Sri Raja Jewellers',
    type: 'Return Kacha',
    weight: 3616,
    touch: 67.02,
    kooli: 0,
    pure: 2423.4,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    date: '2026-07-25',
    shopId: '00000000-0000-4000-8000-000000000010',
    shopName: 'Sri Raja Jewellers',
    type: 'Return Kacha',
    weight: 1415,
    touch: 65.59,
    kooli: 0,
    pure: 928.1,
  },
];

const SAMPLE_SHOPS = [
  { id: '00000000-0000-4000-8000-000000000010', name: 'Sri Raja Jewellers', owner: '', phone: '', address: '' },
];

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function grams(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function calculatePure(weight, touch, kooli, type) {
  const base = type === 'Delivery' ? touch + kooli : touch;
  return Number((weight * base / 100).toFixed(1));
}

function getTotals(entries) {
  const delivery = entries.filter((row) => row.type === 'Delivery').reduce((sum, row) => sum + Number(row.pure || 0), 0);
  const returns = entries.filter((row) => row.type !== 'Delivery').reduce((sum, row) => sum + Number(row.pure || 0), 0);
  return { delivery, returns, hold: delivery - returns };
}

function getShopSummary(entries) {
  const groups = new Map();
  entries.forEach((row) => {
    const name = (row.shopName || 'Unknown Shop').trim();
    const key = name.toLowerCase().replace(/^sri\s+/, '').replace(/[^a-z0-9]/g, '');
    const group = groups.get(key) || { name, delivery: 0, returns: 0, hold: 0 };
    if (row.type === 'Delivery') group.delivery += Number(row.pure || 0);
    else group.returns += Number(row.pure || 0);
    group.hold = group.delivery - group.returns;
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getEntryImages(entry) {
  if (Array.isArray(entry?.images) && entry.images.length) return entry.images;
  if (entry?.imageUrl) return [{ url: entry.imageUrl, name: 'Attachment' }];
  return [];
}

function PageHead({ title, description, action }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function EntryModal({ entry, shops, onClose, onSave }) {
  const [form, setForm] = useState({
    date: entry?.date || new Date().toISOString().slice(0, 10),
    shopId: entry?.shopId || '',
    type: entry?.type || 'Delivery',
    weight: entry?.weight || '',
    touch: entry?.touch || '',
    kooli: entry?.kooli ?? 11,
  });
  const [attachedImages, setAttachedImages] = useState(() => getEntryImages(entry));
  const [selectedFiles, setSelectedFiles] = useState([]);

  const preview = useMemo(() => {
    const weight = Number(form.weight || 0);
    const touch = Number(form.touch || 0);
    const kooli = Number(form.kooli || 0);
    return calculatePure(weight, touch, kooli, form.type);
  }, [form]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFilesChange = (event) => {
    setSelectedFiles(Array.from(event.target.files || []));
  };

  const removeExistingImage = (index) => {
    setAttachedImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const shop = shops.find((item) => item.id === form.shopId);
    const uploadedImages = selectedFiles.length ? await db.saveImages(selectedFiles) : [];
    const images = [
      ...attachedImages.filter((image) => image?.url),
      ...uploadedImages.map((url, index) => ({ url, name: selectedFiles[index]?.name || 'attachment' })),
    ];
    const payload = {
      ...entry,
      id: entry?.id || crypto.randomUUID(),
      date: form.date,
      shopId: form.shopId,
      shopName: shop?.name || '',
      type: form.type,
      weight: Number(form.weight || 0),
      touch: Number(form.touch || 0),
      kooli: form.type === 'Delivery' ? Number(form.kooli || 0) : 0,
      pure: preview,
      images,
      imageUrl: images[0]?.url || '',
    };
    onSave(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{entry ? 'Edit Silver Entry' : 'Add Silver Entry'}</h2>
          <button className="icon-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>Date</label>
              <input name="date" type="date" required value={form.date} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Shop Name</label>
              <select name="shopId" required value={form.shopId} onChange={handleChange}>
                <option value="">Select a shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select name="type" required value={form.type} onChange={handleChange}>
                <option value="Delivery">Delivery</option>
                <option value="Return Kacha">Return Kacha</option>
              </select>
            </div>
            <div className="field">
              <label>Weight (g)</label>
              <input name="weight" type="number" min="0.01" step="0.01" required value={form.weight} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Touch</label>
              <input name="touch" type="number" min="0" step="0.01" required value={form.touch} onChange={handleChange} />
            </div>
            <div className="field">
              <label>11 Kooli Addition</label>
              <input name="kooli" type="number" min="0" step="0.01" value={form.kooli} onChange={handleChange} />
            </div>
            <div className="field full">
              <label>Attachment</label>
              <input type="file" multiple accept="image/*" onChange={handleFilesChange} />
              <small className="muted">Images upload to Supabase and are mirrored to Firebase when configured.</small>
            </div>
            <div className="field full">
              <label>Calculated Pure</label>
              <input value={preview.toFixed(1)} readOnly />
            </div>
            {(attachedImages.length || selectedFiles.length) && (
              <div className="field full">
                <label>Attached Images</label>
                <div className="attachment-list">
                  {attachedImages.map((image, index) => (
                    <div key={`${image.url}-${index}`} className="attachment-card">
                      <img src={image.url} alt={image.name || 'Entry attachment'} />
                      <div>
                        <strong>{image.name || 'Attachment'}</strong>
                        <div className="muted">Existing</div>
                      </div>
                      <button type="button" className="icon-btn" onClick={() => removeExistingImage(index)}>✕</button>
                    </div>
                  ))}
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="attachment-card">
                      <div className="attachment-placeholder">{file.name}</div>
                      <div>
                        <strong>{file.name}</strong>
                        <div className="muted">New upload</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button className="primary">Save Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImageGalleryModal({ entry, onClose }) {
  const images = getEntryImages(entry);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentImage = images[activeIndex];

  if (!currentImage) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="image-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Entry Images</h2>
          <button className="icon-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="gallery-stage">
          <img src={currentImage.url} alt={currentImage.name || 'Entry image'} />
        </div>
        {images.length > 1 && (
          <div className="gallery-nav">
            <button type="button" className="secondary" onClick={() => setActiveIndex((current) => (current > 0 ? current - 1 : images.length - 1))}>← Previous</button>
            <span>{activeIndex + 1} / {images.length}</span>
            <button type="button" className="secondary" onClick={() => setActiveIndex((current) => (current < images.length - 1 ? current + 1 : 0))}>Next →</button>
          </div>
        )}
        <div className="gallery-thumbs">
          {images.map((image, index) => (
            <button key={`${image.url}-${index}`} type="button" className={`gallery-thumb ${index === activeIndex ? 'active' : ''}`} onClick={() => setActiveIndex(index)}>
              <img src={image.url} alt={image.name || 'Attachment'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopModal({ shop, onClose, onSave }) {
  const [form, setForm] = useState({
    name: shop?.name || '',
    owner: shop?.owner || '',
    phone: shop?.phone || '',
    address: shop?.address || '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...shop,
      id: shop?.id || crypto.randomUUID(),
      name: form.name,
      owner: form.owner,
      phone: form.phone,
      address: form.address,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{shop ? 'Edit Shop' : 'Add Shop'}</h2>
          <button className="icon-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label>Shop Name</label>
              <input name="name" required value={form.name} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Owner</label>
              <input name="owner" value={form.owner} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} />
            </div>
            <div className="field full">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button className="primary">Save Shop</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="confirm-copy">{message}</div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [registerFilter, setRegisterFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) setActivePage(hash);
  }, []);

  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  useEffect(() => {
    const boot = async () => {
      await db.init();
      const data = db.get();
      const seeded = {
        shops: data.shops?.length ? data.shops : SAMPLE_SHOPS,
        silverEntries: data.silverEntries?.length ? data.silverEntries : SAMPLE_ENTRIES,
      };
      if (!data.shops?.length && !data.silverEntries?.length) {
        db.save(seeded);
      }
      setShops(seeded.shops);
      setEntries(seeded.silverEntries);
      setLoading(false);
    };
    boot();
  }, []);

  useEffect(() => {
    if (loading) return;
    db.save({ shops, silverEntries: entries });
  }, [shops, entries, loading]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totals = useMemo(() => getTotals(entries), [entries]);
  const shopSummary = useMemo(() => getShopSummary(entries), [entries]);
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const query = registerFilter.toLowerCase();
      const matchesQuery = !query || [entry.date, entry.shopName, entry.type].join(' ').toLowerCase().includes(query);
      const matchesType = !typeFilter || entry.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [entries, registerFilter, typeFilter]);

  const filteredShops = useMemo(() => {
    const query = shopFilter.toLowerCase();
    return shops.filter((shop) => !query || shop.name.toLowerCase().includes(query));
  }, [shops, shopFilter]);

  const saveEntry = (payload) => {
    setEntries((current) => {
      const next = current.some((item) => item.id === payload.id)
        ? current.map((item) => (item.id === payload.id ? payload : item))
        : [payload, ...current];
      return next;
    });
    setModal(null);
    setToast('Entry saved');
  };

  const saveShop = (payload) => {
    setShops((current) => {
      const next = current.some((item) => item.id === payload.id)
        ? current.map((item) => (item.id === payload.id ? payload : item))
        : [payload, ...current];
      return next;
    });
    setModal(null);
    setToast('Shop saved');
  };

  const removeEntry = (id) => {
    setEntries((current) => current.filter((item) => item.id !== id));
    setModal(null);
    setToast('Entry removed');
  };

  const removeShop = (id) => {
    setShops((current) => current.filter((item) => item.id !== id));
    setModal(null);
    setToast('Shop removed');
  };

  const renderDashboard = () => (
    <>
      <PageHead
        title="Silver Pure Summary"
        description="One consolidated pure-weight row for every shop."
        action={<button className="primary" onClick={() => setModal({ type: 'entry' })}>＋ Add Entry</button>}
      />
      <div className="stat-grid">
        <div className="card stat">
          <span className="icon">↗</span>
          <div className="stat-label">Total Delivery</div>
          <div className="stat-value">{grams(totals.delivery)} g</div>
          <div className="stat-trend">Pure silver delivered</div>
        </div>
        <div className="card stat">
          <span className="icon">↙</span>
          <div className="stat-label">Total Return</div>
          <div className="stat-value">{grams(totals.returns)} g</div>
          <div className="stat-trend">Pure silver returned</div>
        </div>
        <div className="card stat">
          <span className="icon">◈</span>
          <div className="stat-label">In Hold</div>
          <div className="stat-value">{grams(totals.hold)} g</div>
          <div className="stat-trend">Delivery minus return</div>
        </div>
        <div className="card stat">
          <span className="icon">♙</span>
          <div className="stat-label">Active Shops</div>
          <div className="stat-value">{shopSummary.length}</div>
          <div className="stat-trend">Shared register partners</div>
        </div>
      </div>
      <div className="card table-card" style={{ marginTop: 18 }}>
        <div className="table-tools">
          <strong>Shop-wise Consolidated Pure Summary</strong>
          <button className="button secondary" onClick={() => setActivePage('settlements')}>Open Settlement Summary</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Pure Delivered</th>
              <th>Pure Returned</th>
              <th>In Hold</th>
            </tr>
          </thead>
          <tbody>
            {shopSummary.map((item) => (
              <tr key={item.name}>
                <td><strong>{item.name}</strong></td>
                <td>{grams(item.delivery)} g</td>
                <td>{grams(item.returns)} g</td>
                <td><strong className={item.hold < 0 ? 'text-red' : ''}>{grams(item.hold)} g</strong></td>
              </tr>
            ))}
            {!shopSummary.length && <tr><td colSpan="4" className="empty">No shops added.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderRegister = () => (
    <>
      <PageHead
        title="Silver Delivery & Return Register"
        description="Pure is automatically calculated."
        action={<button className="primary" onClick={() => setModal({ type: 'entry' })}>＋ Add Entry</button>}
      />
      <div className="card table-card">
        <div className="table-tools">
          <input value={registerFilter} onChange={(event) => setRegisterFilter(event.target.value)} placeholder="Search date, shop, type…" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option>
            <option value="Delivery">Delivery</option>
            <option value="Return Kacha">Return Kacha</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Shop Name</th>
              <th>Type</th>
              <th>Weight (g)</th>
              <th>Touch</th>
              <th>Touch + 11 (Kooli)</th>
              <th>Pure</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const images = getEntryImages(entry);
              return (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.shopName}</td>
                  <td><span className={`badge ${entry.type === 'Delivery' ? 'completed' : 'pending'}`}>{entry.type}</span></td>
                  <td>{grams(entry.weight)}</td>
                  <td>{Number(entry.touch).toFixed(2)}</td>
                  <td>{entry.type === 'Delivery' ? Number(entry.touch + entry.kooli).toFixed(2) : '—'}</td>
                  <td><strong>{grams(entry.pure)} g</strong></td>
                  <td>
                    {images.length ? (
                      <div className="image-cell">
                        <button className="entry-image" type="button" onClick={() => setModal({ type: 'gallery', entry })}>
                          <img src={images[0].url} alt={images[0].name || 'Entry attachment'} />
                        </button>
                        {images.length > 1 && <span className="image-count">+{images.length - 1}</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="actions">
                    <button className="icon-btn" onClick={() => setModal({ type: 'entry', entry })}>✎</button>
                    <button className="icon-btn" onClick={() => setModal({ type: 'delete-entry', entryId: entry.id })}>⌫</button>
                  </td>
                </tr>
              );
            })}
            {!filteredEntries.length && <tr><td colSpan="9" className="empty">No silver entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="stat-grid" style={{ marginTop: 18 }}>
        <div className="card stat"><div className="stat-label">Total Delivery (Pure)</div><div className="stat-value">{grams(totals.delivery)} g</div></div>
        <div className="card stat"><div className="stat-label">Total Return (Pure)</div><div className="stat-value">{grams(totals.returns)} g</div></div>
        <div className="card stat"><div className="stat-label">In Hold (Pure)</div><div className="stat-value">{grams(totals.hold)} g</div></div>
      </div>
    </>
  );

  const renderSettlements = () => (
    <>
      <PageHead title="Settlement Summary" description="Shop-wise consolidated pure delivery, return, and in-hold balance." />
      <div className="stat-grid">
        <div className="card stat"><div className="stat-label">All Shops Delivery</div><div className="stat-value">{grams(totals.delivery)} g</div><div className="stat-trend">Total pure delivered</div></div>
        <div className="card stat"><div className="stat-label">All Shops Return</div><div className="stat-value">{grams(totals.returns)} g</div><div className="stat-trend">Total pure returned</div></div>
        <div className="card stat"><div className="stat-label">All Shops In Hold</div><div className="stat-value">{grams(totals.hold)} g</div><div className="stat-trend">Net pure balance</div></div>
      </div>
      <div className="card table-card" style={{ marginTop: 18 }}>
        <div className="table-tools">
          <input value={shopFilter} onChange={(event) => setShopFilter(event.target.value)} placeholder="Search shop…" />
          <strong>Pure weight in grams</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Delivery Total (Pure)</th>
              <th>Return Total (Pure)</th>
              <th>In Hold (Pure)</th>
            </tr>
          </thead>
          <tbody>
            {shopSummary.map((item) => (
              <tr key={item.name}>
                <td><strong>{item.name}</strong></td>
                <td>{grams(item.delivery)} g</td>
                <td>{grams(item.returns)} g</td>
                <td><strong className={item.hold < 0 ? 'text-red' : ''}>{grams(item.hold)} g</strong></td>
              </tr>
            ))}
            {!shopSummary.length && <tr><td colSpan="4" className="empty">No shops added.</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <th>Grand Total</th>
              <th>{grams(totals.delivery)} g</th>
              <th>{grams(totals.returns)} g</th>
              <th>{grams(totals.hold)} g</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );

  const renderShops = () => (
    <>
      <PageHead title="Shops" description="Manage shops used in your silver register." action={<button className="primary" onClick={() => setModal({ type: 'shop' })}>＋ Add Shop</button>} />
      <div className="card table-card">
        <div className="table-tools">
          <input value={shopFilter} onChange={(event) => setShopFilter(event.target.value)} placeholder="Search shops…" />
        </div>
        <table>
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Owner</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.name}</td>
                <td>{shop.owner || '—'}</td>
                <td>{shop.phone || '—'}</td>
                <td>{shop.address || '—'}</td>
                <td className="actions">
                  <button className="icon-btn" onClick={() => setModal({ type: 'shop', shop })}>✎</button>
                  <button className="icon-btn" onClick={() => setModal({ type: 'delete-shop', shopId: shop.id })}>⌫</button>
                </td>
              </tr>
            ))}
            {!filteredShops.length && <tr><td colSpan="5" className="empty">Add a shop to begin.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderContent = () => {
    if (loading) {
      return <div className="card" style={{ padding: 24 }}>Loading Silver ERP…</div>;
    }
    if (activePage === 'register') return renderRegister();
    if (activePage === 'settlements') return renderSettlements();
    if (activePage === 'shops') return renderShops();
    return renderDashboard();
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <b className="brand-mark">S</b>
          <div>Silver ERP<small>PURE WEIGHT LEDGER</small></div>
        </div>
        <nav className="nav">
          <div className="nav-label">Silver operations</div>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-link ${activePage === item.id ? 'active' : ''}`} onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}>
              <b className="ico">{item.icon}</b>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Shared cloud ready<br />Installable on Android</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Menu" onClick={() => setSidebarOpen((current) => !current)}>☰</button>
          <div className="global-search">
            <span>⌕</span>
            <input placeholder="Use register search…" readOnly />
          </div>
          <div className="topbar-actions">
            <span className="muted">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <div className="user"><i className="avatar">A</i><span>Administrator</span></div>
          </div>
        </header>
        <section className="content">{renderContent()}</section>
      </main>
      {toast && <div className="toast success">{toast}</div>}
      {modal?.type === 'entry' && <EntryModal entry={modal.entry} shops={shops} onClose={() => setModal(null)} onSave={saveEntry} />}
      {modal?.type === 'shop' && <ShopModal shop={modal.shop} onClose={() => setModal(null)} onSave={saveShop} />}
      {modal?.type === 'gallery' && <ImageGalleryModal entry={modal.entry} onClose={() => setModal(null)} />}
      {modal?.type === 'delete-entry' && <ConfirmModal title="Delete Entry" message="Remove this silver entry? The pure totals will be recalculated." onClose={() => setModal(null)} onConfirm={() => removeEntry(modal.entryId)} />}
      {modal?.type === 'delete-shop' && <ConfirmModal title="Delete Shop" message="Remove this shop? Existing register entries stay available." onClose={() => setModal(null)} onConfirm={() => removeShop(modal.shopId)} />}
    </div>
  );
}

export default App;
