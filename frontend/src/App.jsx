import React, { useState, useEffect } from 'react';
import { bookService } from './services/bookService';
import { sound } from './utils/audio';
import { showToast } from './utils/notifications';

// Normaliza las propiedades del libro para que funcionen con los nombres de Django y de la UI
const normalizeBook = (b) => {
  const parsedCost = parseFloat(b.cost_usd ?? b.cost ?? 0) || 0;
  const parsedStock = parseInt(b.stock_quantity ?? b.stock ?? 0, 10) || 0;

  return {
    ...b,
    cost: parsedCost,
    cost_usd: parsedCost,
    stock: parsedStock,
    stock_quantity: parsedStock,
    selling_price_local: b.selling_price_local ? parseFloat(b.selling_price_local) : null,
    supplier_country: b.supplier_country || 'ES',
    category: b.category || 'General',
  };
};

export default function App() {
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' | 'grid'
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockActive, setLowStockActive] = useState(false);

  // Modales y Estados
  const [activeBook, setActiveBook] = useState(null);
  const [fxResult, setFxResult] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    cost: '',
    stock: '',
    supplier_country: 'ES',
  });

  // Paginación
  const limit = 6;
  const [offset, setOffset] = useState(0);

  const loadBooks = async (newOffset = 0) => {
    setLoading(true);
    try {
      let res;
      if (categoryFilter.trim()) {
        res = await bookService.searchByCategory(categoryFilter.trim());
      } else if (lowStockActive) {
        res = await bookService.getLowStock(10);
      } else {
        res = await bookService.list(limit, newOffset);
      }

      const rawList = res.results || [];
      const normalizedList = rawList.map(normalizeBook);

      setBooks(normalizedList);
      setTotalBooks(res.count ?? normalizedList.length);
      setOffset(newOffset);
      setCurrentIndex(0);
    } catch (err) {
      sound.error();
      showToast(err.message || 'Error al conectar con la base de datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks(0);

    const handleLog = (e) => {
      setLogs((prev) => [e.detail, ...prev.slice(0, 29)]);
    };
    window.addEventListener('api-log', handleLog);
    return () => window.removeEventListener('api-log', handleLog);
  }, [lowStockActive]);

  // Navegación Carrusel
  const prevCard = () => {
    if (books.length === 0) return;
    sound.nav();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : books.length - 1));
  };

  const nextCard = () => {
    if (books.length === 0) return;
    sound.nav();
    setCurrentIndex((prev) => (prev < books.length - 1 ? prev + 1 : 0));
  };

  // Cálculo FX
  const handleCalculatePrice = async (id) => {
    sound.action();
    setLoading(true);
    try {
      const res = await bookService.calculatePrice(id);
      setFxResult(res);
      sound.fxSuccess();
      showToast('Cálculo de precio generado con éxito', 'success');
    } catch (err) {
      sound.error();
      showToast(err.message || 'Error consultando tasa de cambio', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Guardar (Crear / Actualizar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const costVal = parseFloat(formData.cost);
    const stockVal = parseInt(formData.stock, 10);

    if (isNaN(costVal) || costVal <= 0 || isNaN(stockVal) || stockVal < 0) {
      sound.error();
      showToast('El costo debe ser > 0 y el inventario >= 0', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn,
        category: formData.category,
        cost_usd: costVal,
        stock_quantity: stockVal,
        supplier_country: formData.supplier_country || 'ES',
      };

      if (editingBook) {
        await bookService.update(editingBook.id, payload);
        showToast('Libro actualizado exitosamente', 'success');
      } else {
        await bookService.create(payload);
        showToast('Nuevo libro ingresado al inventario', 'success');
      }

      sound.select();
      setIsFormOpen(false);
      setEditingBook(null);
      loadBooks(offset);
    } catch (err) {
      sound.error();
      showToast(err.message || 'Error guardando libro', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setLoading(true);
    try {
      await bookService.delete(bookToDelete.id);
      sound.action();
      showToast('Registro eliminado de la base de datos', 'info');
      setBookToDelete(null);
      if (activeBook?.id === bookToDelete.id) setActiveBook(null);
      loadBooks(0);
    } catch (err) {
      sound.error();
      showToast(err.message || 'Error al eliminar registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (b) => {
    setEditingBook(b);
    setFormData({
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      cost: b.cost_usd,
      stock: b.stock_quantity,
      supplier_country: b.supplier_country || 'ES',
    });
    setIsFormOpen(true);
  };

  return (
    <div className="crt min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Contenedor de Notificaciones */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" />

      {/* Barra Superior */}
      <header className="border-b border-cyan-900/60 bg-slate-900/80 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <h1 className="font-pixel text-sm md:text-base text-cyan-400 tracking-wider">
            SISTEMA::INVENTARIO_LIBRERÍA
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => sound.toggleMute()}
            className="px-3 py-1.5 text-xs border border-slate-700 hover:border-cyan-400 rounded transition font-mono"
          >
            🔊 AUDIO
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'carousel' ? 'grid' : 'carousel')}
            className="px-3 py-1.5 text-xs border border-cyan-500 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded font-pixel"
          >
            VISTA: {viewMode === 'carousel' ? 'CARRUSEL' : 'CUADRÍCULA'}
          </button>

          <button
            onClick={() => {
              setEditingBook(null);
              setFormData({ title: '', author: '', isbn: '', category: '', cost: '', stock: '', supplier_country: 'ES' });
              setIsFormOpen(true);
            }}
            className="px-3 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded shadow-lg shadow-cyan-500/20 font-mono"
          >
            + AGREGAR LIBRO
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section className="px-6 py-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por categoría..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded focus:border-cyan-400 outline-none text-slate-200"
          />
          <button
            onClick={() => {
              setLowStockActive(false);
              loadBooks(0);
            }}
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-cyan-400"
          >
            FILTRAR
          </button>

          <button
            onClick={() => {
              setCategoryFilter('');
              setLowStockActive(!lowStockActive);
            }}
            className={`px-3 py-1.5 rounded border transition ${
              lowStockActive
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                : 'border-amber-600/60 bg-amber-950/20 hover:bg-amber-900/40 text-amber-400'
            }`}
          >
            ⚠️ BAJO STOCK (&lt;10)
          </button>

          {(categoryFilter || lowStockActive) && (
            <button
              onClick={() => {
                setCategoryFilter('');
                setLowStockActive(false);
                loadBooks(0);
              }}
              className="text-rose-400 hover:underline px-2"
            >
              [RESTAURAR]
            </button>
          )}
        </div>

        <div className="text-slate-400">
          REGISTROS: <span className="text-cyan-400">{books.length ? currentIndex + 1 : 0}</span> DE {totalBooks}
        </div>
      </section>

      {/* Vista Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500 animate-pulse z-40" />
        )}

        {books.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-pixel text-xs">
            NO SE ENCONTRARON REGISTROS EN EL INVENTARIO.
          </div>
        ) : viewMode === 'carousel' ? (
          /* Carrusel Retro 3D */
          <div className="flex flex-col items-center justify-center w-full max-w-4xl">
            <div className="relative w-72 h-96 perspective-1000 flex items-center justify-center my-6">
              {books.map((b, idx) => {
                const offsetIdx = idx - currentIndex;
                const isSelected = offsetIdx === 0;
                if (Math.abs(offsetIdx) > 2) return null;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setActiveBook(b);
                      setFxResult(null);
                      sound.select();
                    }}
                    style={{
                      transform: `translateX(${offsetIdx * 130}px) translateZ(${isSelected ? 100 : -100}px) rotateY(${offsetIdx * -25}deg)`,
                      zIndex: 30 - Math.abs(offsetIdx),
                      opacity: Math.abs(offsetIdx) > 1 ? 0.3 : 1,
                    }}
                    className={`absolute inset-0 rounded-xl border-2 transition-all duration-300 cursor-pointer p-5 flex flex-col justify-between bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl ${
                      isSelected ? 'border-cyan-400 shadow-cyan-500/20 scale-105' : 'border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-pixel text-[9px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded">
                          {b.category}
                        </span>
                        <span className={`text-xs font-bold font-mono ${b.stock_quantity < 5 ? 'text-rose-400' : 'text-slate-400'}`}>
                          STOCK: {b.stock_quantity}
                        </span>
                      </div>
                      <h3 className="font-bold text-base mt-4 text-slate-100 leading-snug line-clamp-3">
                        {b.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{b.author}</p>
                    </div>

                    <div className="border-t border-slate-700/80 pt-3">
                      <div className="text-xs text-slate-400 font-mono">ISBN: {b.isbn}</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                        ${Number(b.cost_usd).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controles de Selección */}
            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={prevCard}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 rounded font-pixel text-xs"
              >
                ◀ ANTERIOR
              </button>

              <button
                onClick={() => {
                  const b = books[currentIndex];
                  setActiveBook(b);
                  setFxResult(null);
                  sound.select();
                }}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded font-pixel text-xs shadow-lg shadow-cyan-500/20"
              >
                SELECCIONAR
              </button>

              <button
                onClick={nextCard}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 rounded font-pixel text-xs"
              >
                SIGUIENTE ▶
              </button>
            </div>
          </div>
        ) : (
          /* Cuadrícula Táctica */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {books.map((b) => (
              <div
                key={b.id}
                className="border border-slate-800 bg-slate-900/60 hover:border-cyan-500 p-5 rounded-lg flex flex-col justify-between transition group"
              >
                <div>
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span className="text-cyan-400">[{b.category}]</span>
                    <span className={b.stock_quantity < 5 ? 'text-rose-400' : ''}>Stock: {b.stock_quantity}</span>
                  </div>
                  <h4 className="font-bold text-base mt-2 group-hover:text-cyan-300 transition line-clamp-2">
                    {b.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{b.author}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-emerald-400 font-mono font-bold">${Number(b.cost_usd).toFixed(2)} USD</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCalculatePrice(b.id)}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded text-xs font-mono"
                    >
                      ⚡ PRECIO FX
                    </button>
                    <button
                      onClick={() => {
                        setActiveBook(b);
                        setFxResult(null);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                    >
                      DETALLE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {!categoryFilter && !lowStockActive && (
          <div className="flex items-center gap-3 mt-8 font-mono text-xs">
            <button
              disabled={offset === 0}
              onClick={() => loadBooks(Math.max(0, offset - limit))}
              className="px-3 py-1 border border-slate-700 disabled:opacity-30 rounded hover:border-cyan-400"
            >
              « PÁG ANTERIOR
            </button>
            <span className="text-slate-400">
              PÁGINA {Math.floor(offset / limit) + 1} DE {Math.ceil(totalBooks / limit) || 1}
            </span>
            <button
              disabled={offset + limit >= totalBooks}
              onClick={() => loadBooks(offset + limit)}
              className="px-3 py-1 border border-slate-700 disabled:opacity-30 rounded hover:border-cyan-400"
            >
              PÁG SIGUIENTE »
            </button>
          </div>
        )}
      </main>

      {/* Drawer de Auditoría */}
      <footer className="border-t border-slate-800 bg-slate-950 font-mono text-xs">
        <div
          onClick={() => setShowLogs(!showLogs)}
          className="px-6 py-2 bg-slate-900/60 hover:bg-slate-900 cursor-pointer flex justify-between items-center text-slate-400"
        >
          <span>TERMINAL DE AUDITORÍA ({logs.length} PETICIONES REGISTRADAS)</span>
          <span>{showLogs ? '▼ CERRAR' : '▲ INSPECCIONAR'}</span>
        </div>
        {showLogs && (
          <div className="max-h-40 overflow-y-auto p-4 bg-slate-950/90 flex flex-col gap-1 border-t border-slate-900">
            {logs.length === 0 ? (
              <span className="text-slate-600">Aún no se han capturado peticiones HTTP.</span>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-4 text-[11px]">
                  <span className="text-slate-500">[{l.timestamp}]</span>
                  <span className={l.ok ? 'text-emerald-400' : 'text-rose-400'}>{l.method}</span>
                  <span className="text-slate-300">{l.endpoint}</span>
                  <span className={l.status < 400 ? 'text-cyan-400' : 'text-amber-400'}>HTTP {l.status}</span>
                  <span className="text-slate-500">{l.duration}ms</span>
                </div>
              ))
            )}
          </div>
        )}
      </footer>

      {/* MODAL: Detalle del Libro y Desglose FX */}
      {activeBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl max-w-lg w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setActiveBook(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <span className="font-pixel text-[10px] text-cyan-400 bg-cyan-950 px-2 py-1 rounded">
              {activeBook.category}
            </span>
            <h2 className="text-xl font-bold mt-2 text-white">{activeBook.title}</h2>
            <p className="text-sm text-slate-400">Autor: {activeBook.author}</p>

            <div className="grid grid-cols-2 gap-4 my-4 font-mono text-xs bg-slate-950 p-3 rounded border border-slate-800">
              <div><span className="text-slate-500">ISBN:</span> {activeBook.isbn}</div>
              <div><span className="text-slate-500">Inventario:</span> {activeBook.stock_quantity} unidades</div>
              <div><span className="text-slate-500">Costo Base:</span> ${Number(activeBook.cost_usd).toFixed(2)} USD</div>
              <div><span className="text-slate-500">País Proveedor:</span> {activeBook.supplier_country}</div>
            </div>

            {/* Módulo de Integración Externa */}
            <div className="mt-4 p-4 rounded bg-slate-950/80 border border-amber-500/30">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-amber-400 text-xs">CÁLCULO DE PRECIO DE VENTA (FX)</span>
                <button
                  onClick={() => handleCalculatePrice(activeBook.id)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs font-mono"
                >
                  ⚡ EJECUTAR CÁLCULO
                </button>
              </div>

              {fxResult && (
                <div className="mt-3 text-xs font-mono space-y-1 border-t border-slate-800 pt-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Costo Original:</span>
                    <span>${fxResult.cost_usd || fxResult.original_cost_usd} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Margen de Ganancia:</span>
                    <span>{fxResult.margin_percentage || '40%'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Costo con Margen:</span>
                    <span>${fxResult.cost_with_margin_usd} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tasa de Cambio (USD → {fxResult.currency || 'VES'}):</span>
                    <span>{fxResult.exchange_rate}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                    <span>Precio Final ({fxResult.currency || 'VES'}):</span>
                    <span>
                      {Number(fxResult.selling_price_local).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {fxResult.currency || 'VES'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setBookToDelete(activeBook)}
                className="px-3 py-1.5 border border-rose-600/50 text-rose-400 hover:bg-rose-950/30 rounded text-xs font-mono"
              >
                ELIMINAR REGISTRO
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    openEdit(activeBook);
                    setActiveBook(null);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                >
                  EDITAR
                </button>
                <button
                  onClick={() => setActiveBook(null)}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-mono"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Formulario de Creación / Edición */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitForm}
            className="bg-slate-900 border-2 border-cyan-500 rounded-xl max-w-md w-full p-6 relative shadow-2xl font-mono text-xs"
          >
            <h3 className="font-pixel text-sm text-cyan-400 mb-4">
              {editingBook ? 'EDITAR_REGISTRO' : 'NUEVO_LIBRO'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">TÍTULO</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">AUTOR</label>
                <input
                  required
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">ISBN</label>
                  <input
                    required
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">CATEGORÍA</label>
                  <input
                    required
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">COSTO (USD)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">INVENTARIO (STOCK)</label>
                  <input
                    required
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PAÍS PROVEEDOR (CÓDIGO)</label>
                <input
                  type="text"
                  maxLength="2"
                  value={formData.supplier_country}
                  onChange={(e) => setFormData({ ...formData, supplier_country: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-200 focus:border-cyan-400 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded text-slate-300"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded font-pixel text-[10px]"
              >
                GUARDAR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Alerta de Eliminación */}
      {bookToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-xl max-w-sm w-full p-6 text-center font-mono text-xs">
            <h4 className="font-pixel text-sm text-rose-500 mb-2">ALERTA DE ELIMINACIÓN</h4>
            <p className="text-slate-300 my-4">
              ¿Estás seguro de que deseas eliminar permanentemente el libro:
              <br />
              <strong className="text-white">"{bookToDelete.title}"</strong>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded text-slate-300"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}