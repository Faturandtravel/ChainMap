'use client';

import { useState, useEffect } from 'react';
import { LogisticsBlockchain, Block, ShipmentStatus, ShipmentData } from '@/lib/blockchain';
import { INDONESIA_CITIES, ROUTE_COLORS } from '@/lib/constants';
import MapWrapper from '@/components/MapWrapper';

const STORAGE_KEY = 'chain_map_blockchain_data_v1';

export default function Home() {
  const [blockchain] = useState(() => new LogisticsBlockchain());
  const [chain, setChain] = useState<Block[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<{
    valid: boolean;
    invalidBlockIndex?: number;
  }>({ valid: true });

  // Right sidebar tab: 'routes' (Input & Route List) | 'ledger' (Blockchain Audit & Security)
  const [rightPanelTab, setRightPanelTab] = useState<'routes' | 'ledger'>('routes');

  // Filter Routes on Map
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('ALL');

  // Form State for Real Input
  const [fromCity, setFromCity] = useState('Jakarta');
  const [toCity, setToCity] = useState('Bandung');
  const [itemName, setItemName] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('In Transit');
  const [selectedColor, setSelectedColor] = useState(ROUTE_COLORS[0].hex);
  const [sender, setSender] = useState('');
  const [recipient, setRecipient] = useState('');
  const [routeLabel, setRouteLabel] = useState('');

  // Toggle Advanced Options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Status & Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [blockToTamper, setBlockToTamper] = useState<number>(0);
  const [originalChainBackup, setOriginalChainBackup] = useState<string>('');

  // Auto-generate tracking number when cities change
  useEffect(() => {
    if (!shipmentId || shipmentId.startsWith('TRK-') || shipmentId.startsWith('RESI-')) {
      const fromCode = fromCity.substring(0, 3).toUpperCase();
      const toCode = toCity.substring(0, 3).toUpperCase();
      const rand = Math.floor(100 + Math.random() * 900);
      setShipmentId(`TRK-${fromCode}-${toCode}-${rand}`);
    }
  }, [fromCity, toCity]);

  // Load saved data from localStorage
  useEffect(() => {
    async function loadSavedData() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Block[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const statusMap: Record<string, ShipmentStatus> = {
              'Diproses': 'Processing',
              'Dalam Pengiriman': 'In Transit',
              'Transit': 'Transit',
              'Terkirim': 'Delivered',
            };
            blockchain.chain = parsed.map(
              (b) => {
                if (b.data.status && statusMap[b.data.status]) {
                  b.data.status = statusMap[b.data.status];
                }
                if (b.data.item === 'Kargo Prioritas') {
                  b.data.item = 'Priority Cargo';
                }
                return new Block(b.index, b.timestamp, b.data, b.previousHash);
              }
            );
            for (const blk of blockchain.chain) {
              blk.hash = await blk.computeHash();
            }
            const copy = [...blockchain.chain];
            setChain(copy);
            setOriginalChainBackup(JSON.stringify(copy));
            const integrity = await blockchain.checkIntegrity();
            setIntegrityStatus(integrity);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load local data:', err);
      }
      blockchain.clearChain();
      setChain([]);
      setOriginalChainBackup('');
      setIntegrityStatus({ valid: true });
    }
    loadSavedData();
  }, [blockchain]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3200);
  };

  const saveChainToStorage = (updatedChain: Block[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChain));
    } catch (e) {
      console.warn('Failed to save to storage:', e);
    }
  };

  // Add New Shipment
  const handleAddShipment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (fromCity === toCity) {
      showToast('Origin and destination cities cannot be the same.', 'error');
      return;
    }

    const cleanItem = itemName.trim() || 'Priority Cargo';
    const cleanTrackingId = shipmentId.trim() || `TRK-${Date.now().toString().slice(-6)}`;

    if (chain.some((b) => b.data.shipmentId.toLowerCase() === cleanTrackingId.toLowerCase())) {
      showToast(`Tracking ID ${cleanTrackingId} is already registered. Please use a different ID.`, 'error');
      return;
    }

    const legLabel = routeLabel.trim() || `${fromCity} -> ${toCity}`;

    const newShipmentData: ShipmentData = {
      id: `${Date.now()}`,
      shipmentId: cleanTrackingId,
      item: cleanItem,
      fromCity,
      fromCoords: INDONESIA_CITIES[fromCity],
      toCity,
      toCoords: INDONESIA_CITIES[toCity],
      status,
      color: selectedColor,
      label: legLabel,
      sender: sender.trim() || `${fromCity} Hub`,
      recipient: recipient.trim() || `${toCity} Warehouse`,
    };

    await blockchain.addBlock(newShipmentData);
    const updatedChain = [...blockchain.chain];
    setChain(updatedChain);
    setOriginalChainBackup(JSON.stringify(updatedChain));
    saveChainToStorage(updatedChain);

    const integrity = await blockchain.checkIntegrity();
    setIntegrityStatus(integrity);

    showToast(`Route ${fromCity} -> ${toCity} added to ledger successfully.`, 'success');

    setItemName('');
    setRouteLabel('');
    setSelectedShipmentId(cleanTrackingId);

    // Automatically set next origin to current destination
    setFromCity(toCity);
    const otherCities = Object.keys(INDONESIA_CITIES).filter((c) => c !== toCity);
    if (otherCities.length > 0) {
      setToCity(otherCities[0]);
    }
  };

  // Select city directly from map marker click
  const handleCitySelectFromMap = (cityName: string, role: 'from' | 'to') => {
    if (role === 'from') {
      setFromCity(cityName);
      showToast(`Origin City: ${cityName}`, 'info');
    } else {
      setToCity(cityName);
      showToast(`Destination City: ${cityName}`, 'info');
    }
  };

  // Update shipment status
  const handleUpdateStatus = async (blockIndex: number, newStatus: ShipmentStatus) => {
    if (blockIndex < chain.length) {
      blockchain.chain[blockIndex].data.status = newStatus;
      blockchain.chain[blockIndex].hash = await blockchain.chain[blockIndex].computeHash();
      for (let i = blockIndex + 1; i < blockchain.chain.length; i++) {
        blockchain.chain[i].previousHash = blockchain.chain[i - 1].hash;
        blockchain.chain[i].hash = await blockchain.chain[i].computeHash();
      }
      const updated = [...blockchain.chain];
      setChain(updated);
      setOriginalChainBackup(JSON.stringify(updated));
      saveChainToStorage(updated);
      const integrity = await blockchain.checkIntegrity();
      setIntegrityStatus(integrity);
      showToast(`Status updated: ${newStatus}`, 'success');
    }
  };

  // Clear all data
  const handleClearAll = () => {
    if (chain.length === 0) return;
    if (window.confirm('Clear all routes and reset blockchain?')) {
      blockchain.clearChain();
      setChain([]);
      setOriginalChainBackup('');
      localStorage.removeItem(STORAGE_KEY);
      setSelectedShipmentId('ALL');
      setIntegrityStatus({ valid: true });
      showToast('All routes have been cleared.', 'info');
    }
  };

  // Tamper Simulation
  const handleTamperSelectedBlock = async () => {
    if (chain.length > 0 && blockToTamper < chain.length) {
      const targetBlock = blockchain.chain[blockToTamper];
      targetBlock.data.toCity = targetBlock.data.toCity === 'Denpasar' ? 'Balikpapan (Tampered)' : 'Denpasar (Tampered)';
      targetBlock.data.item = 'Compromised Asset (Data Tampered)';
      const updated = [...blockchain.chain];
      setChain(updated);
      const integrity = await blockchain.checkIntegrity();
      setIntegrityStatus(integrity);
      showToast(`Block #${blockToTamper} tampered! Integrity compromised.`, 'error');
    }
  };

  // Restore Tamper
  const handleRestoreChain = async () => {
    if (!originalChainBackup) return;
    try {
      const parsed: Block[] = JSON.parse(originalChainBackup);
      blockchain.chain = parsed.map(
        (b) => new Block(b.index, b.timestamp, b.data, b.previousHash)
      );
      for (const blk of blockchain.chain) {
        blk.hash = await blk.computeHash();
      }
      setChain([...blockchain.chain]);
      saveChainToStorage([...blockchain.chain]);
      const integrity = await blockchain.checkIntegrity();
      setIntegrityStatus(integrity);
      showToast('Blockchain state restored.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
    showToast('Hash copied to clipboard.', 'info');
  };

  return (
    <main className="min-h-screen bg-black text-[#ededed] font-sans selection:bg-white selection:text-black">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2.5 ${
              notification.type === 'success'
                ? 'bg-zinc-950 border-emerald-500/50 text-[#00e599]'
                : notification.type === 'error'
                ? 'bg-zinc-950 border-red-500/50 text-red-400'
                : 'bg-zinc-950 border-blue-500/50 text-[#0070f3]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Top Header Navbar */}
      <header className="border-b border-zinc-800 bg-black/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <svg width="14" height="14" viewBox="0 0 1155 1000" fill="none">
                <path d="M577.347 0L1154.69 1000H0L577.347 0Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">ChainMap</span>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono px-1.5 py-0.5 rounded">
                  Geospatial Ledger
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Multi-Hub Supply Chain Tracking
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            {chain.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-mono text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 transition cursor-pointer"
              >
                Reset All
              </button>
            )}

            <div
              className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 border transition ${
                chain.length === 0
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  : integrityStatus.valid
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-400 animate-pulse'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  chain.length === 0
                    ? 'bg-zinc-500'
                    : integrityStatus.valid
                    ? 'bg-[#00e599] shadow-[0_0_8px_#00e599]'
                    : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                }`}
              />
              <span className="text-[11px]">
                {chain.length === 0
                  ? '0 Routes'
                  : integrityStatus.valid
                  ? `${chain.length} ${chain.length === 1 ? 'Valid Route' : 'Valid Routes'}`
                  : `Integrity Compromised`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Left Side = Large Map (Col-7 / Col-8), Right Side = All Cards (Col-5 / Col-4) */}
      <div className="max-w-[1720px] mx-auto p-3 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT SIDE: EXPANSIVE GEOSPATIAL MAP */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
              {/* Map Header Bar */}
              <div className="p-3.5 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-zinc-950">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                    Logistics Network Route Map
                  </h2>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 font-mono px-2 py-0.5 rounded border border-zinc-800">
                    {chain.length} Active {chain.length === 1 ? 'Route' : 'Routes'}
                  </span>
                </div>

                {chain.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500 font-mono text-[11px]">Highlight:</span>
                    <select
                      value={selectedShipmentId}
                      onChange={(e) => setSelectedShipmentId(e.target.value)}
                      className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-2.5 py-1 font-mono focus:outline-none"
                    >
                      <option value="ALL">All Routes ({chain.length})</option>
                      {chain.map((b) => (
                        <option key={`opt-${b.data.shipmentId}`} value={b.data.shipmentId}>
                          {b.data.label ? `${b.data.label}: ` : ''}{b.data.fromCity} -&gt; {b.data.toCity}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Map Canvas */}
              <div className="p-2 bg-black">
                <MapWrapper
                  chain={chain}
                  isValid={integrityStatus.valid}
                  selectedShipmentId={selectedShipmentId}
                  onSelectShipment={(id) => setSelectedShipmentId(id)}
                  onSelectCity={handleCitySelectFromMap}
                  invalidBlockIndex={integrityStatus.invalidBlockIndex}
                />
              </div>

              {/* Summary Status Below Map */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-4 text-[11px]">
                  <span>Total Hubs: <strong className="text-white">{new Set([...chain.map((b) => b.data.fromCity), ...chain.map((b) => b.data.toCity)]).size} Cities</strong></span>
                  <span>Chain Height: <strong className="text-white">#{chain.length} {chain.length === 1 ? 'Block' : 'Blocks'}</strong></span>
                  <span>Cryptography: <strong className="text-white">SHA-256</strong></span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Click city markers on map to select Origin or Destination
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: ALL CONTROL CARDS */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Right Panel Tab Switcher (Vercel Style Segmented Control) */}
            <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 grid grid-cols-2 gap-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setRightPanelTab('routes')}
                className={`py-2 rounded-lg text-center font-medium transition cursor-pointer ${
                  rightPanelTab === 'routes'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Input & Routes ({chain.length})
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('ledger')}
                className={`py-2 rounded-lg text-center font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  rightPanelTab === 'ledger'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Audit & Ledger</span>
                {!integrityStatus.valid && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                )}
              </button>
            </div>

            {/* TAB PANEL 1: INPUT & ROUTE LIST */}
            {rightPanelTab === 'routes' && (
              <>
                {/* CARD 1: QUICK SHIPMENT INPUT FORM */}
                <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                      Add New Shipment
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Block #{chain.length}
                    </span>
                  </div>

                  <form onSubmit={handleAddShipment} className="space-y-3">
                    {/* Origin & Destination */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                          From (Origin City)
                        </label>
                        <select
                          value={fromCity}
                          onChange={(e) => setFromCity(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono transition"
                        >
                          {Object.keys(INDONESIA_CITIES).map((city) => (
                            <option key={`from-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                          To (Destination City)
                        </label>
                        <select
                          value={toCity}
                          onChange={(e) => setToCity(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono transition"
                        >
                          {Object.keys(INDONESIA_CITIES).map((city) => (
                            <option key={`to-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Item Name */}
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Item Name / Cargo
                      </label>
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. Network Equipment / Garment Package"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    {/* Toggle Advanced Options */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="text-[11px] text-zinc-400 hover:text-white font-mono flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{showAdvancedOptions ? '[-] Hide Advanced Options' : '[+] Additional Options (Tracking ID, Status, Color)'}</span>
                      </button>
                    </div>

                    {/* Advanced Options Open */}
                    {showAdvancedOptions && (
                      <div className="pt-2 space-y-2.5 text-xs bg-black/50 p-3 rounded-xl border border-zinc-800/60">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                            Tracking ID
                          </label>
                          <input
                            type="text"
                            value={shipmentId}
                            onChange={(e) => setShipmentId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                            Route Label (e.g. A -&gt; B)
                          </label>
                          <input
                            type="text"
                            value={routeLabel}
                            onChange={(e) => setRouteLabel(e.target.value)}
                            placeholder="e.g. A -> B or Hub 1"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                              Status
                            </label>
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                            >
                              <option value="In Transit">In Transit</option>
                              <option value="Transit">Transit</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Processing">Processing</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                              Color Accent
                            </label>
                            <div className="flex items-center gap-1.5 pt-1">
                              {ROUTE_COLORS.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => setSelectedColor(c.hex)}
                                  className={`w-4 h-4 rounded-full border transition cursor-pointer ${
                                    selectedColor === c.hex ? 'border-white scale-125' : 'border-transparent opacity-60 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                  title={c.name}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-white hover:bg-zinc-200 active:scale-[0.98] text-black font-semibold text-xs rounded-xl transition shadow-[0_0_20px_rgba(255,255,255,0.12)] flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                    >
                      <span>+ Add to Ledger & Map</span>
                    </button>
                  </form>
                </div>

                {/* CARD 2: ACTIVE SHIPMENT ROUTE LIST */}
                <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                      Active Routes ({chain.length})
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Click to highlight
                    </span>
                  </div>

                  {chain.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                      No shipment routes yet. Use the form above to create the first route.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {chain.map((block) => {
                        const isSelected = selectedShipmentId === 'ALL' || selectedShipmentId === block.data.shipmentId;

                        return (
                          <div
                            key={`route-card-${block.index}-${block.hash}`}
                            onClick={() => setSelectedShipmentId(block.data.shipmentId)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-900/90 border-zinc-700 shadow-md ring-1 ring-zinc-500/40'
                                : 'bg-zinc-950/60 border-zinc-900 opacity-65 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: block.data.color }}
                                />
                                <span className="font-mono text-xs font-bold text-white">
                                  {block.data.fromCity} -&gt; {block.data.toCity}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  block.data.status === 'Delivered' || block.data.status === 'Terkirim'
                                    ? 'bg-emerald-950/40 text-[#00e599] border-emerald-500/30'
                                    : block.data.status === 'In Transit' || block.data.status === 'Dalam Pengiriman'
                                    ? 'bg-blue-950/40 text-[#0070f3] border-blue-500/30'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}
                              >
                                {block.data.status === 'Terkirim'
                                  ? 'Delivered'
                                  : block.data.status === 'Dalam Pengiriman'
                                  ? 'In Transit'
                                  : block.data.status === 'Diproses'
                                  ? 'Processing'
                                  : block.data.status}
                              </span>
                            </div>

                            <div className="text-xs text-zinc-400 truncate mb-2">
                              Tracking: <strong className="text-zinc-200 font-mono">{block.data.shipmentId}</strong> · {block.data.item}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-500">Block #{block.index}</span>
                              <div className="flex items-center gap-1.5">
                                {block.data.status !== 'Delivered' && block.data.status !== 'Terkirim' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(block.index, 'Delivered');
                                    }}
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition text-[10px] cursor-pointer"
                                  >
                                    Mark as Delivered
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFromCity(block.data.toCity);
                                    const next = Object.keys(INDONESIA_CITIES).filter((c) => c !== block.data.toCity)[0];
                                    if (next) setToCity(next);
                                    setItemName(`Continuation: ${block.data.item}`);
                                    showToast(`Origin set to ${block.data.toCity}.`, 'info');
                                  }}
                                  className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition text-[10px] cursor-pointer"
                                >
                                  Continue
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB PANEL 2: BLOCKCHAIN AUDIT & LEDGER */}
            {rightPanelTab === 'ledger' && (
              <>
                {/* CARD 3: SHA-256 SECURITY SIMULATION */}
                <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                      Cryptographic Integrity Simulation
                    </span>
                    <button
                      type="button"
                      onClick={handleRestoreChain}
                      className="text-[11px] font-mono px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition cursor-pointer"
                    >
                      Restore Chain
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400">
                    Tampering with data in a single block will invalidate its hash and break the integrity chain of all subsequent blocks.
                  </p>

                  {chain.length === 0 ? (
                    <div className="p-4 bg-zinc-900/50 rounded-xl text-xs font-mono text-zinc-400">
                      No blocks to test yet. Please add shipment routes first.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase block">
                        Select Target Block:
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={blockToTamper}
                          onChange={(e) => setBlockToTamper(Number(e.target.value))}
                          className="flex-1 bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-2.5 py-2 font-mono focus:outline-none"
                        >
                          {chain.map((b) => (
                            <option key={`tamper-opt-${b.index}`} value={b.index}>
                              Block #{b.index} ({b.data.fromCity} -&gt; {b.data.toCity})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleTamperSelectedBlock}
                          className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/40 rounded-lg text-xs font-mono transition cursor-pointer whitespace-nowrap"
                        >
                          Tamper Data
                        </button>
                      </div>
                    </div>
                  )}

                  {!integrityStatus.valid && (
                    <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-xs font-mono text-red-300">
                      <strong>Hash Violation:</strong> Mismatch detected at Block #{integrityStatus.invalidBlockIndex}.
                    </div>
                  )}
                </div>

                {/* CARD 4: BLOCKCHAIN EXPLORER LEDGER */}
                <div className="bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                      Blockchain Explorer Ledger
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {chain.length} {chain.length === 1 ? 'Block' : 'Blocks'}
                    </span>
                  </div>

                  {chain.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                      Ledger is empty. The first block created will be Genesis Block #0.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {chain.map((block) => {
                        const isInvalid = !integrityStatus.valid && block.index === integrityStatus.invalidBlockIndex;

                        return (
                          <div
                            key={`ledger-card-${block.index}-${block.hash}`}
                            className={`p-3 rounded-xl border text-xs font-mono transition ${
                              isInvalid
                                ? 'bg-red-950/40 border-red-500/60 shadow-lg'
                                : 'bg-black border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-zinc-900">
                              <span className="font-bold text-white">
                                {block.index === 0 ? 'Genesis #0' : `Block #${block.index}`}: {block.data.fromCity} -&gt; {block.data.toCity}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(block.timestamp).toLocaleTimeString('en-US')}
                              </span>
                            </div>

                            <div className="text-zinc-400 text-[11px] mb-2 truncate">
                              Tracking: <span className="text-white">{block.data.shipmentId}</span> · {block.data.item}
                            </div>

                            <div className="space-y-1 pt-1.5 border-t border-zinc-900 text-[10px] text-zinc-500">
                              <div className="flex items-center justify-between">
                                <span>Hash:</span>
                                <span
                                  onClick={() => copyHash(block.hash)}
                                  className="cursor-pointer hover:text-white truncate max-w-[200px] text-zinc-400"
                                  title="Copy hash"
                                >
                                  {block.hash.substring(0, 16)}... {copiedHash === block.hash ? '[Copied]' : ''}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Prev:</span>
                                <span className="truncate max-w-[200px] text-zinc-600">
                                  {block.previousHash.substring(0, 16)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}