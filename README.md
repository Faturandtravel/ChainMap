# ChainMap — Geospatial Supply Chain Blockchain Ledger

ChainMap is a real-time, geospatial supply chain tracking and logistics audit platform powered by a client-side cryptographic blockchain ledger. Built with Next.js, React, Leaflet, and TypeScript, it visually maps multi-hub freight movements across Indonesian cities while mathematically guaranteeing cargo provenance, data integrity, and tamper detection through SHA-256 cryptographic hashing.

---

## Key Highlights

- **Geospatial Route Mapping**: Interactive high-contrast dark basemap (CartoDB Dark Matter via Leaflet) rendering active logistics corridors, animated polyline vectors, and real-time transit status badges.
- **SHA-256 Cryptographic Ledger**: Every shipment or route leg is sealed as an immutable block linked sequentially (`previousHash` &rarr; `currentHash`) from Genesis Block #0.
- **Interactive Tamper & Fault Simulation**: Test blockchain resilience by injecting malicious payload alterations into any block. Watch the integrity chain break and flag compromised corridors in real time.
- **Multi-Hub Hub & Spoke Logistics**: Track interconnected transit routes across major hubs (Jakarta, Bandung, Surabaya, Medan, Denpasar, Makassar, Balikpapan, and more).
- **Zero-Backend Client Architecture**: Implemented with native browser Web Crypto API (`crypto.subtle.digest`) and persistent `localStorage` synchronization for zero-latency execution.

---

## Features

### 1. Geospatial Network Visualization
- **Dark Mode Cartography**: Sleek dark basemap tailored for command-center dashboards.
- **Dynamic Polyline Corridors**: Color-coded shipment vectors featuring animated dashed flow lines indicating movement direction.
- **Interactive Hub Markers**: Pulsing circular waypoint nodes aggregating inbound and outbound shipments with clickable popups.
- **Quick Selection from Map**: Click directly on any city marker to assign it as the shipment's origin or destination.
- **Route Filtering**: Filter the map to inspect a specific consignment or view the entire nationwide logistics network.

### 2. Cryptographic Blockchain Engine
- **Sequential Block Linking**: Each block contains an index, ISO timestamp, shipment payload, `previousHash`, and cryptographic `hash`.
- **SHA-256 Hashing**: Calculated in-memory using browser-native Web Crypto API.
- **Continuous Integrity Auditing**: Scans the chain to verify that:
  1. The hash of every block matches its computed SHA-256 digest.
  2. Each block's `previousHash` precisely matches the hash of its predecessor.
- **Persistence**: Automatically preserves the ledger state in browser storage (`localStorage`), surviving page reloads.

### 3. Security & Tamper Attack Simulation
- **Cryptographic Fault Injection**: Select any block in the ledger and alter its destination or cargo description.
- **Visual Alerting**:
  - Compromised blocks are highlighted with neon red borders in the ledger.
  - Affected map routes shift to critical red alert styling.
  - System badge immediately pulses `Integrity Compromised: Mismatch detected at Block #X`.
- **State Recovery**: One-click **Restore Chain** capability to roll back the ledger to its verified authentic state.

### 4. Shipment Management & Chain Extension
- **Auto-Generated Tracking Identifiers**: Generates standard tracking codes (e.g., `TRK-JAK-BAN-742`) automatically based on origin and destination hubs.
- **Route Continuation**: Quickly chain continuous transit legs (e.g., origin automatically populated from the previous delivery destination).
- **Lifecycle Tracking**: Update statuses on the fly (`Processing`, `In Transit`, `Transit`, `Delivered`).
- **Custom Accent Styling**: Assign distinct brand or priority colors to different delivery routes.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                 ChainMap Frontend                                 |
|                                                                                   |
|  +---------------------------+        +----------------------------------------+  |
|  |     Leaflet Map Canvas    |        |        Control & Ledger Panels         |  |
|  | - Dark Matter Tiles       | <----> | - Shipment Dispatch Form               |  |
|  | - Animated Polylines      |        | - Route Management & Status Updates    |  |
|  | - Interactive City Hubs   |        | - Cryptographic Fault Simulation       |  |
|  | - Route Highlighting      |        | - Raw Block Explorer & Hash Inspector  |  |
|  +---------------------------+        +----------------------------------------+  |
|                ^                                           ^                      |
|                |                                           |                      |
|                +--------------------+----------------------+                      |
|                                     |                                             |
|                                     v                                             |
|                 +---------------------------------------+                         |
|                 |     LogisticsBlockchain (Engine)      |                         |
|                 | - Block Hashing (SHA-256 Web Crypto)  |                         |
|                 | - Chain Linkage (previousHash)        |                         |
|                 | - Integrity Audit (checkIntegrity)    |                         |
|                 | - LocalStorage Persistence            |                         |
|                 +---------------------------------------+                         |
+-----------------------------------------------------------------------------------+
```

### Cryptographic Block Structure

```json
{
  "index": 1,
  "timestamp": "2026-09-25T08:14:20.102Z",
  "data": {
    "id": "1727252060102",
    "shipmentId": "TRK-JAK-BDG-481",
    "item": "Priority Semiconductor Cargo",
    "fromCity": "Jakarta",
    "fromCoords": [-6.2088, 106.8456],
    "toCity": "Bandung",
    "toCoords": [-6.9175, 107.6191],
    "status": "In Transit",
    "color": "#0070f3",
    "label": "Jakarta -> Bandung",
    "sender": "Jakarta Central Hub",
    "recipient": "Bandung Regional Warehouse"
  },
  "previousHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "hash": "259be1971f8c23a056db3480a1f747cee3cf810f6e7c3cb672d114c8867d1823"
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (Vercel-inspired dark theme) |
| **Geospatial Mapping** | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) |
| **Basemap Provider** | CartoDB Dark Matter |
| **Cryptography** | Web Crypto API (`crypto.subtle`) — SHA-256 |
| **Icons & Symbols** | Native Inline SVG |

---

## Project Structure

```text
chain-map/
├── public/                  # Static assets and icons
├── src/
│   ├── app/
│   │   ├── globals.css      # Core styles, animations, and Tailwind directives
│   │   ├── layout.tsx       # Root HTML document and font definitions
│   │   └── page.tsx         # Main interactive dashboard, state management, and forms
│   ├── components/
│   │   ├── Map.tsx          # Leaflet map instance, tile layers, polylines, and popups
│   │   └── MapWrapper.tsx   # SSR dynamic import wrapper with loading skeleton
│   └── lib/
│       ├── blockchain.ts    # Block, LogisticsBlockchain classes, and SHA-256 validation
│       └── constants.ts     # City coordinates (Indonesia) and route accent palette
├── package.json             # Project dependencies and npm scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18.18 or higher recommended) and `npm` installed.

### Installation

1. Clone or navigate into the repository:
   ```bash
   cd chain-map
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

Start the local Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

### Production Build

To compile and validate the production bundle:

```bash
npm run build
npm run start
```

---

## User Guide & Demonstration

### 1. Creating a New Shipment
1. Under the **Input & Routes** tab in the right panel, select an **Origin** and **Destination** city.
2. Enter the **Item Name / Cargo** (e.g., `Solar Panel Inverters`).
3. (Optional) Expand **Additional Options** to customize the Tracking ID, Status, or Line Accent Color.
4. Click **+ Add to Ledger & Map**. The shipment will be sealed into a new block and rendered on the map.

### 2. Chaining Route Legs
- Click the **Continue** button on any route card in the active routes list. ChainMap automatically sets the next departure hub to that shipment's destination, allowing seamless creation of multi-hop supply lines.

### 3. Simulating a Tamper Attack
1. Switch to the **Audit & Ledger** tab.
2. Under **Cryptographic Integrity Simulation**, choose a target block from the dropdown.
3. Click **Tamper Data**.
4. Observe the results:
   - The status badge changes to **Integrity Compromised**.
   - The target route turns neon red on the geospatial map.
   - The cryptographic verification identifies the exact block index where data was modified.
5. Click **Restore Chain** to roll back and re-validate ledger authenticity.

---

## License

This project is licensed under the MIT License.
