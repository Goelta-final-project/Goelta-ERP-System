# 🚀 Enterprise ERP System - Frontend Portal

Welcome to the ERP Frontend. Built using **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **React Icons**, and managed via **pnpm**.

## 🏗️ Git Branching Strategy & Workflow

To maintain a clean production history and prevent code regressions, we use a structured multi-branch workflow. **Never push code directly to `main` or `develop`.**

*   **`main` (Production Branch):** Reflects the production-ready state. Only fully tested, deployment-stable code is merged here via `develop`.
*   **`develop` (Integration/Working Branch):** The primary staging sandbox. All team features merge here first to verify system compatibility.
*   **`feature/*` (Task-Specific Branches):** Where all individual development occurs. Always cut your branch from the latest `develop` state.

### 🌿 Git Feature Workflow Blueprint
1. Switch to develop and update your local copy:
   ```bash
   git checkout develop
   git pull
   ```
2. Spin up an isolated feature branch named after the target implementation (not your name):
   ```bash
   # Good: feature/sales-trend-chart | Bad: feature/john-working
   git checkout -b feature/your-feature-name
   ```
3. Commit and push your local branch up to GitHub:
   ```bash
   git push -u origin feature/your-feature-name
   ```
4. Open a **Pull Request (PR)** targeting the `develop` branch. At least one teammate must review and approve it before merging.

---

## ⚠️ Architectural Rules & Folder Structure

We follow a strict **Feature-Driven Architecture**. Do not dump files into the root of `src/`. All assets must live in their precise functional directories:

```text
src/
├── components/           # 🌍 GLOBAL shared UI elements
│   └── ui/               # Reusable primitives (Buttons, Inputs, Modals, ui.tsx)
│
├── features/             # 💼 ERP BUSINESS DOMAINS (Work isolated here!)
│   ├── catalog/          # Product catalogs and import logic
│   ├── customers/        # Customer CRM interfaces
│   ├── invoices/         # Invoicing workflows
│   ├── sales/            # Sales tracking & Analytics (Your active workspace)
│   └── purchases/        # Procurement & Supplier tools
│
├── hooks/                # 🔗 Shared React hooks (e.g., use-persistent-state.ts)
├── services/             # ⚙️ Third-party engines (PDF generation, Excel parsing, storage)
├── store/                # 🧠 Global state management configurations
└── types/                # 📝 Shared TypeScript interfaces, schemas, and domain data
```

### How to work safely within the team:
If you are assigned to work on **Sales**, you must build your components, state selectors, and sub-routing setups within `src/features/sales/`. Do not edit assets inside other feature domains without direct coordination.

---

## 🎨 Icons Framework (React Icons)

We utilize `react-icons` to maintain a unified interface style across all ERP panels.

### Installation
To add the package to your machine environment, execute:
```bash
pnpm add react-icons
```

### Usage Standard
Import only the required visual glyphs dynamically from their respective icon ecosystem packs (e.g., FontAwesome `fa`, MaterialDesign `md`, Heroicons `hi2`):

```tsx
import { FaBeer } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';

export const SidebarItem = () => {
  return (
    <div className="flex items-center gap-2 p-2 text-gray-700">
      <MdDashboard className="h-5 w-5 text-blue-600" />
      <span>Dashboard</span>
    </div>
  );
};
```

---

## ⚡ Setup & Scripts (pnpm workflow)

Ensure you have **pnpm** installed globally (`npm i -g pnpm`).

```bash
# 1. Install workspace dependencies cleanly
pnpm install

# 2. Run the hot-reloading development server
pnpm dev

# 3. Compile asset production bundles and check for TypeScript structural compilation issues
pnpm build
```
