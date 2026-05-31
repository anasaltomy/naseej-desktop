# Business Requirements Document (BRD)

## Naseej POS — Desktop Point-of-Sale System for Retail Stores

**Version:** 2.0  
**Last Updated:** 2026-05-30  
**Status:** Local-First Architecture (SQLite)

---

## 1. Executive Vision

Naseej POS is a fast, reliable, standalone point-of-sale terminal application for retail stores. Built as a desktop application with local SQLite storage, it provides immediate transaction processing without dependency on cloud servers, making it ideal for retail environments with unreliable connectivity.

**Mission:** Deliver an efficient, offline-capable POS system that enables retailers to process sales, manage inventory, and operate independently with a simple, modern interface.

---

## 2. Problem Statement

| Challenge | Impact | Naseej POS Solution |
|-----------|--------|-----|
| Slow internet dependency | Downtime = lost sales | Fully offline with local SQLite storage |
| Complex POS systems | High learning curve for staff | Intuitive keyboard/barcode-driven interface |
| Limited inventory visibility | Manual stock counts, overselling | Real-time local inventory tracking |
| No transaction history | Hard to process returns | Complete offline transaction history |
| Expensive enterprise POS | Prohibitive cost for small stores | Modern, affordable desktop app |

---

## 3. Core Value Propositions

### 3.1 Works Offline, Always

Real-time SQLite database means transactions process instantly without cloud dependency. Never lose a sale due to connectivity issues.

### 3.2 Simple & Fast

Barcode scanning + keyboard shortcuts enable cashiers to complete transactions in seconds. No complex navigation required.

### 3.3 Complete Local Control

All data stays on the device. Inventory, transactions, and customer information are stored locally in SQLite. No vendor lock-in.

### 3.4 Modern Interface

Built with Electron + React for a contemporary experience that staff expect from modern software.

---

## 4. Target Market

### 4.1 Primary Segment

- **Small to medium retail stores** (clothing, accessories, general retail)
- Single or multiple physical locations with independent POS terminals
- Currently using outdated POS systems or manual checkout
- Need reliability without internet dependency

### 4.2 Secondary Segment

- **Emerging retailers** looking for affordable, modern POS
- Pop-up shops and temporary retail spaces
- Stores in regions with unreliable internet

### 4.3 Geographic Focus (Initial)

- MENA region (Saudi Arabia, UAE, Egypt, Jordan)
- Localization: RTL support, local currency, offline operation

---

## 5. Revenue Architecture

### 5.1 Pricing Model

| License | Annual Price | Features |
|---------|----------|----------|
| **Single Terminal** | $299 | 1 POS terminal, local SQLite, basic reports |
| **Multi-Terminal (3)** | $699 | 3 POS terminals, shared inventory database, staff management |
| **Multi-Terminal (5+)** | $999 | Unlimited terminals, advanced reporting, priority support |

### 5.2 Implementation Services (Optional)

| Service | Price |
|---------|-------|
| Hardware setup & printer configuration | $150 |
| Staff training (2 hours) | $100 |
| Data migration from old system | $200 |

---

## 6. Key Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Barcode scanning | P0 | Scan product barcodes to add items |
| Manual entry | P0 | Keyboard/numpad for manual SKU entry |
| Multiple payment types | P0 | Cash, card, mobile payment support |
| Receipt printing | P0 | ESC/POS thermal printer support |
| Inventory tracking | P0 | Real-time stock levels per location |
| Transaction history | P0 | Search and view past transactions |
| Staff login | P0 | PIN or password authentication |
| Offline operation | P0 | Full functionality without internet |
| Multi-location | P1 | Support multiple store locations |
| Refunds & returns | P1 | Process returns and refunds |
| Daily reports | P1 | Z-report and sales summary |
| Product search | P1 | Find products by name/SKU |

---

## 7. Competitive Landscape

| Competitor | Weakness Naseej Exploits |
|------------|--------------------------|
| Square POS | Requires internet, expensive hardware |
| Lightspeed | High cost, complex setup, cloud-dependent |
| Legacy POS | Outdated interface, vendor lock-in |
| Manual checkout | No inventory tracking, manual errors |

**Naseej POS Differentiators:**
- Works completely offline with SQLite
- Modern, intuitive interface
- Affordable per-terminal licensing
- Self-contained — no server dependency

---

## 8. Key Business Metrics (KPIs)

| Metric | Year 1 Target | Year 2 Target |
|--------|---------------|---------------|
| Licenses sold | 100 | 500 |
| Annual Revenue | $30K | $150K |
| Customer satisfaction | > 4.5/5 | > 4.7/5 |
| System uptime (per terminal) | 99.9% | 99.95% |
| Average transaction time | < 30 seconds | < 20 seconds |
| Zero data loss incidents | 100% | 100% |

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SQLite database corruption | Low | High | Regular automated backups, export functionality |
| Hardware incompatibility | Medium | Medium | Support matrix for printers; test before release |
| User data privacy | Low | Critical | Local encryption, no cloud transmission |
| Performance degradation | Low | Medium | Database indexing, query optimization |
| Feature requests scope creep | High | Medium | Strict roadmap, phased releases |

---

## 10. Success Criteria (MVP Launch)

1. A cashier can complete a full transaction (scan → pay → receipt) in under 15 seconds
2. No transaction data loss during power loss (atomic SQLite transactions)
3. Receipt prints correctly on standard ESC/POS thermal printers
4. Barcode scanner input works reliably (no missed scans)
5. Works fully offline for 8-hour shifts
6. Staff can be trained in under 30 minutes
7. All data persists locally with no external server dependency
