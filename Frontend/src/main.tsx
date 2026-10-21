import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import "./styles/erp.css" // Sistema de diseño del ERP (rediseño morado)
import "./utils/focusEffects.css" // Importar estilos de efectos de foco
import { migrateLocalStorageKeys } from "./lib/migrateLocalStorageKeys"

// Migrar preferencias de localStorage del branding anterior antes de montar la app
migrateLocalStorageKeys()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

