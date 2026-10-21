"use client"

import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { Button } from "../components/ui/button"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error en el componente PDF</AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>Ocurrió un error al generar el PDF. Esto puede deberse a:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Incompatibilidad de versiones de @react-pdf/renderer</li>
                <li>Problemas con los datos de productos</li>
                <li>Configuración incorrecta del PDF</li>
              </ul>

              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>

              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">Detalles del error</summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {this.state.error?.message || "Error desconocido"}
                    {this.state.error?.stack && (
                      <>
                        {"\n\nStack trace:\n"}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
