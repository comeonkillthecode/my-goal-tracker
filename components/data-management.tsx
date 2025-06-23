"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, Database, FileText, AlertTriangle, CheckCircle2 } from "lucide-react"

interface DataManagementProps {
  onDataUpdated: () => void
}

export default function DataManagement({ onDataUpdated }: DataManagementProps) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  const handleExport = async () => {
    setExporting(true)
    setMessage("")

    try {
      const response = await fetch("/api/data/export")

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `mygoaltracker-backup-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setMessage("Data exported successfully!")
        setMessageType("success")
      } else {
        const data = await response.json()
        setMessage(data.error || "Export failed")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Network error during export")
      setMessageType("error")
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setImportFile(file)
        setMessage("")
      } else {
        setMessage("Please select a valid JSON file")
        setMessageType("error")
        setImportFile(null)
      }
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setMessage("Please select a file to import")
      setMessageType("error")
      return
    }

    setImporting(true)
    setMessage("")

    try {
      const fileContent = await importFile.text()
      const importData = JSON.parse(fileContent)

      // Validate basic structure
      if (!importData.goals || !importData.tasks) {
        throw new Error("Invalid backup file format")
      }

      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Import successful! Added ${data.imported.goals} goals and ${data.imported.tasks} tasks.`)
        setMessageType("success")
        setImportFile(null)
        onDataUpdated()

        // Reset file input
        const fileInput = document.getElementById("import-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setMessage(data.error || "Import failed")
        setMessageType("error")
      }
    } catch (error) {
      setMessage("Invalid file format or import error: " + (error as Error).message)
      setMessageType("error")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Management</h2>
        <p className="text-gray-600">Backup and restore your goals and tasks data</p>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-600" />
            <span>Export Data</span>
          </CardTitle>
          <CardDescription>
            Download a backup of all your goals, tasks, and progress data as a JSON file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">What gets exported:</h4>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>• All your goals and their details</li>
                  <li>• All tasks (completed and pending)</li>
                  <li>• Progress statistics and points</li>
                  <li>• Account settings (excluding password)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button onClick={handleExport} disabled={exporting} className="w-full bg-blue-600 hover:bg-blue-700">
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-green-600" />
            <span>Import Data</span>
          </CardTitle>
          <CardDescription>Restore your data from a previously exported backup file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Importing will add data to your existing goals and tasks. It won't replace or
              delete your current data. Make sure to export your current data first as a backup.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Select Backup File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">Only JSON files exported from MyGoalTracker are supported</p>
            </div>

            {importFile && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Selected: {importFile.name}</span>
                  <span className="text-xs text-green-600">({(importFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {message && (
        <Alert className={messageType === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {messageType === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={messageType === "success" ? "text-green-800" : "text-red-800"}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Tips */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">💡 Backup Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            • <strong>Regular backups:</strong> Export your data weekly or after major changes
          </p>
          <p>
            • <strong>Safe storage:</strong> Keep backup files in cloud storage or external drives
          </p>
          <p>
            • <strong>File naming:</strong> Backup files include the date for easy identification
          </p>
          <p>
            • <strong>Cross-device:</strong> Use import/export to move data between devices
          </p>
          <p>
            • <strong>Data recovery:</strong> Import can restore data if JSON files get corrupted
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
