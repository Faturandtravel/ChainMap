export interface CityCoords {
  [key: string]: [number, number];
}

export const INDONESIA_CITIES: CityCoords = {
  Jakarta: [-6.2088, 106.8456],
  Bandung: [-6.9175, 107.6191],
  Semarang: [-6.9667, 110.4167],
  Yogyakarta: [-7.7956, 110.3695],
  Surabaya: [-7.2575, 112.7521],
  Denpasar: [-8.6705, 115.2126],
  Medan: [3.5952, 98.6722],
  Batam: [1.1301, 104.0529],
  Palembang: [-2.9761, 104.7754],
  Padang: [-0.9471, 100.4172],
  Makassar: [-5.1477, 119.4327],
  Balikpapan: [-1.2379, 116.8529],
  Pontianak: [-0.0263, 109.3425],
  Banjarmasin: [-3.3194, 114.5908],
  Manado: [1.4748, 124.8428],
  Jayapura: [-2.5489, 140.7181],
};

export const ROUTE_COLORS = [
  { name: 'Vercel Blue', hex: '#0070f3', bg: 'bg-[#0070f3]' },
  { name: 'Vercel Cyan', hex: '#50e3c2', bg: 'bg-[#50e3c2]' },
  { name: 'Vercel Purple', hex: '#7928ca', bg: 'bg-[#7928ca]' },
  { name: 'Vercel Pink', hex: '#ff0080', bg: 'bg-[#ff0080]' },
  { name: 'Vercel Amber', hex: '#f5a623', bg: 'bg-[#f5a623]' },
  { name: 'Vercel Emerald', hex: '#00e599', bg: 'bg-[#00e599]' },
  { name: 'Pure White', hex: '#ffffff', bg: 'bg-white' },
];