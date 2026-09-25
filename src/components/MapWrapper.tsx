'use client';

import dynamic from 'next/dynamic';
import { Block } from '@/lib/blockchain';

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[640px] lg:h-[780px] w-full bg-zinc-950/70 border border-zinc-800 animate-pulse rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
      <span className="w-2 h-2 rounded-full bg-[#0070f3] animate-ping"></span>
      <span>Loading Logistics Network Map...</span>
    </div>
  ),
});

interface MapWrapperProps {
  chain: Block[];
  isValid: boolean;
  selectedShipmentId?: string;
  onSelectShipment?: (shipmentId: string) => void;
  onSelectCity?: (cityName: string, role: 'from' | 'to') => void;
  invalidBlockIndex?: number;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <MapComponent {...props} />;
}