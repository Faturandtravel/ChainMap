'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Block } from '@/lib/blockchain';
import { INDONESIA_CITIES } from '@/lib/constants';

interface MapProps {
  chain: Block[];
  isValid: boolean;
  selectedShipmentId?: string;
  onSelectShipment?: (shipmentId: string) => void;
  onSelectCity?: (cityName: string, role: 'from' | 'to') => void;
  invalidBlockIndex?: number;
}

export default function Map({
  chain,
  isValid,
  selectedShipmentId = 'ALL',
  onSelectShipment,
  onSelectCity,
  invalidBlockIndex,
}: MapProps) {
  // Calculate unique cities and aggregate routes per city (inbound & outbound)
  const cityHubs = useMemo(() => {
    const hubs: Record<
      string,
      {
        coords: [number, number];
        outbound: { shipmentId: string; to: string; item: string; color: string }[];
        inbound: { shipmentId: string; from: string; item: string; color: string }[];
      }
    > = {};

    chain.forEach((block) => {
      const data = block.data;
      if (!data.fromCity || !data.toCity || !data.fromCoords || !data.toCoords) return;

      if (!hubs[data.fromCity]) {
        hubs[data.fromCity] = { coords: data.fromCoords, outbound: [], inbound: [] };
      }
      hubs[data.fromCity].outbound.push({
        shipmentId: data.shipmentId,
        to: data.toCity,
        item: data.item,
        color: data.color || '#0070f3',
      });

      if (!hubs[data.toCity]) {
        hubs[data.toCity] = { coords: data.toCoords, outbound: [], inbound: [] };
      }
      hubs[data.toCity].inbound.push({
        shipmentId: data.shipmentId,
        from: data.fromCity,
        item: data.item,
        color: data.color || '#0070f3',
      });
    });

    return hubs;
  }, [chain]);


  return (
    <div className="relative w-full h-[640px] lg:h-[780px] rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
      <MapContainer
        center={[-2.5489, 118.0149]}
        zoom={5}
        className="h-full w-full z-0 bg-black"
        scrollWheelZoom={true}
      >
        {/* Vercel Dark Mode Basemap - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw polyline lines for each shipment / block */}
        {chain.map((block) => {
          const isInvalidBlock = !isValid && block.index === invalidBlockIndex;
          const isSelected =
            selectedShipmentId === 'ALL' || selectedShipmentId === block.data.shipmentId;
          const routeColor = !isValid
            ? isInvalidBlock
              ? '#ee0000'
              : '#52525b'
            : block.data.color || '#0070f3';

          const from = block.data.fromCoords;
          const to = block.data.toCoords;
          if (!from || !to) return null;

          const midpoint: [number, number] = [
            (from[0] + to[0]) / 2,
            (from[1] + to[1]) / 2,
          ];

          return (
            <div key={`route-group-${block.index}-${block.hash}`}>
              {/* Main Route Line */}
              <Polyline
                positions={[from, to]}
                pathOptions={{
                  color: routeColor,
                  weight: isSelected ? 4 : 2,
                  opacity: isSelected ? 0.95 : 0.2,
                  dashArray:
                    block.data.status === 'In Transit' || block.data.status === 'Dalam Pengiriman'
                      ? '6, 8'
                      : block.data.status === 'Transit'
                      ? '3, 6'
                      : undefined,
                }}
                eventHandlers={{
                  click: () => onSelectShipment && onSelectShipment(block.data.shipmentId),
                }}
              >
                <Tooltip sticky direction="top">
                  <div className="text-xs font-mono space-y-0.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span className="text-zinc-400">{block.data.label ? `${block.data.label}:` : ''}</span>
                      <span>{block.data.fromCity} -&gt; {block.data.toCity}</span>
                    </div>
                    <div className="text-zinc-300 text-[11px] font-sans">{block.data.item}</div>
                    <div className="text-zinc-500 text-[10px]">{block.data.shipmentId}</div>
                  </div>
                </Tooltip>
              </Polyline>

              {/* Midpoint waypoint with Route Status Indicator */}
              <CircleMarker
                center={midpoint}
                radius={isSelected ? 5 : 3.5}
                pathOptions={{
                  fillColor: routeColor,
                  color: '#ffffff',
                  weight: 1.5,
                  fillOpacity: isSelected ? 1 : 0.3,
                }}
              >
                <Popup>
                  <div className="text-zinc-200 text-xs font-sans min-w-[200px] p-1">
                    <div className="font-semibold text-xs text-white flex items-center justify-between pb-1 border-b border-zinc-800">
                      <span className="font-mono text-zinc-300">
                        {block.data.label || `Block #${block.index}`}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                        {block.data.status}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-white mt-1.5 flex items-center gap-1.5">
                      <span>{block.data.fromCity}</span>
                      <span className="text-zinc-500 font-bold">-&gt;</span>
                      <span>{block.data.toCity}</span>
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-1">
                      <span className="text-zinc-500">Item:</span> {block.data.item}
                    </div>
                    <div className="text-zinc-400 text-[11px]">
                      <span className="text-zinc-500">Tracking:</span>{' '}
                      <span className="font-mono text-zinc-300">{block.data.shipmentId}</span>
                    </div>
                    <div className="text-zinc-500 font-mono text-[10px] mt-1 pt-1 border-t border-zinc-800/80 truncate">
                      Hash: {block.hash}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}

        {/* Render all Indonesia Cities (Active Hubs and Nodes) */}
        {Object.entries(INDONESIA_CITIES).map(([cityName, coords]) => {
          const hub = cityHubs[cityName];
          const hasActivity = !!hub && (hub.inbound.length > 0 || hub.outbound.length > 0);
          const totalActivity = hasActivity ? hub.inbound.length + hub.outbound.length : 0;

          const isOriginOfSelected =
            selectedShipmentId !== 'ALL' &&
            hub?.outbound.some((s) => s.shipmentId === selectedShipmentId);
          const isDestOfSelected =
            selectedShipmentId !== 'ALL' &&
            hub?.inbound.some((s) => s.shipmentId === selectedShipmentId);
          const isHighlighted =
            selectedShipmentId === 'ALL' || isOriginOfSelected || isDestOfSelected;

          return (
            <CircleMarker
              key={`city-marker-${cityName}`}
              center={coords}
              radius={hasActivity ? (isHighlighted ? 8 : 5) : 4}
              pathOptions={{
                fillColor: isOriginOfSelected
                  ? '#0070f3'
                  : isDestOfSelected
                  ? '#00e599'
                  : totalActivity > 1
                  ? '#ffffff'
                  : hasActivity
                  ? '#38bdf8'
                  : '#3f3f46',
                color: hasActivity ? '#000000' : '#71717a',
                weight: hasActivity ? 2 : 1,
                fillOpacity: hasActivity ? (isHighlighted ? 1 : 0.4) : 0.6,
              }}
            >
              <Popup>
                <div className="text-zinc-200 text-xs font-sans min-w-[210px] p-1">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
                    <span className="font-bold text-sm text-white">{cityName}</span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full font-mono">
                      {totalActivity} {totalActivity === 1 ? 'Route' : 'Routes'}
                    </span>
                  </div>

                  {/* Quick Buttons: Set as Origin / Destination */}
                  {onSelectCity && (
                    <div className="grid grid-cols-2 gap-1.5 mb-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onSelectCity(cityName, 'from')}
                        className="py-1 px-2 text-[10px] font-mono bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 rounded transition text-center cursor-pointer"
                      >
                        Select Origin
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectCity(cityName, 'to')}
                        className="py-1 px-2 text-[10px] font-mono bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded transition text-center cursor-pointer"
                      >
                        Select Destination
                      </button>
                    </div>
                  )}

                  {hasActivity && hub.outbound.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[11px] font-mono text-[#0070f3] block mb-0.5">
                        Outbound ({hub.outbound.length}):
                      </span>
                      <ul className="space-y-0.5 pl-1 text-[11px] text-zinc-300">
                        {hub.outbound.map((o) => (
                          <li key={`out-${o.shipmentId}-${o.to}`} className="flex items-center gap-1 truncate">
                            <span className="text-zinc-500 font-mono text-[10px]">To</span>
                            <span className="font-semibold text-white">{o.to}</span>
                            <span className="text-zinc-500 text-[10px]">({o.item})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasActivity && hub.inbound.length > 0 && (
                    <div>
                      <span className="text-[11px] font-mono text-[#00e599] block mb-0.5">
                        Inbound ({hub.inbound.length}):
                      </span>
                      <ul className="space-y-0.5 pl-1 text-[11px] text-zinc-300">
                        {hub.inbound.map((i) => (
                          <li key={`in-${i.shipmentId}-${i.from}`} className="flex items-center gap-1 truncate">
                            <span className="text-zinc-500 font-mono text-[10px]">From</span>
                            <span className="font-semibold text-white">{i.from}</span>
                            <span className="text-zinc-500 text-[10px]">({i.item})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Popup>
              <Tooltip direction="bottom" offset={[0, 8]} opacity={0.9} permanent={false}>
                <span className="text-[11px] font-mono text-white">{cityName}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>


      {/* Floating Legend / Quick Status Map Overlay (Vercel Style) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 shadow-2xl pointer-events-auto max-w-xs">
        <div className="font-mono text-zinc-400 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${chain.length > 0 ? 'bg-[#0070f3]' : 'bg-zinc-600'}`}></span>
          <span>Multi-Route Network ({chain.length} {chain.length === 1 ? 'Route' : 'Routes'})</span>
        </div>
        {chain.length > 0 ? (
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0070f3] inline-block"></span>
              <span className="text-zinc-300">Origin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00e599] inline-block"></span>
              <span className="text-zinc-300">Destination</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
              <span className="text-zinc-300">Shared Hub</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-400 font-mono">
            No routes yet. Enter a new shipment to map routes here.
          </p>
        )}
      </div>
    </div>
  );
}