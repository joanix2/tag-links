import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVUploadProps {
  onUpload: (data: CSVLinkData[]) => Promise<void>;
}

export interface CSVLinkData {
  title: string;
  url: string;
  tags: string[];
  description?: string;
  created_at?: string;
}

interface UploadResult {
  success: number;
  errors: { line: number; error: string }[];
}

export const CSVUpload = ({ onUpload }: CSVUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): CSVLinkData[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const data: CSVLinkData[] = [];

    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes("title") || lines[0].toLowerCase().includes("url") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by comma but respect quoted values
      const values: string[] = [];
      let currentValue = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      // Push the last value
      values.push(currentValue.trim());

      if (values.length < 2) continue;

      const title = values[0].replace(/^"|"$/g, "");
      const url = values[1].replace(/^"|"$/g, "");
      const tagsStr = values[2] ? values[2].replace(/^"|"$/g, "") : "";
      const description = values[3] ? values[3].replace(/^"|"$/g, "").trim() : undefined;
      const created_at = values[4] ? values[4].replace(/^"|"$/g, "").trim() : undefined;

      // Parse tags - can be separated by ; or |
      const tags = tagsStr
        .split(/[;|]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (title && url) {
        data.push({
          title,
          url,
          tags,
          description: description && description.length > 0 ? description : undefined,
          created_at: created_at && created_at.length > 0 ? created_at : undefined,
        });
      }
    }

    return data;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        setResult({ success: 0, errors: [{ line: 0, error: "No valid data found in CSV" }] });
        setIsUploading(false);
        return;
      }

      await onUpload(data);
      setResult({ success: data.length, errors: [] });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setResult({ success: 0, errors: [{ line: 0, error: error instanceof Error ? error.message : "Upload failed" }] });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `title,url,tags,description,created_at
My Website,https://example.com,web;dev,A great website for learning,2024-01-01
YouTube Video,https://youtube.com/watch?v=xyz,video;learning,Tutorial about React hooks,
GitHub Repo,https://github.com/user/repo,code|opensource,Open source project,2024-12-15`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "links_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shadow-sm hover:shadow transition-all">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Links from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file with your links. The file should have columns: title, url, tags, description (optional), created_at (optional).</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="text-sm">
              <div className="font-medium">Need a template?</div>
              <div className="text-muted-foreground">Download a CSV template with example data</div>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label htmlFor="csv-file" className="text-sm font-medium">
              Select CSV File
            </label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {file.name}
              </div>
            )}
          </div>

          {/* CSV Format Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>CSV Format:</strong>
              <br />
              • Tags can be separated by semicolon (;) or pipe (|)
              <br />
              • Date format: YYYY-MM-DD (optional)
              <br />• First row can be headers or data
            </AlertDescription>
          </Alert>

          {/* Result Messages */}
          {result && (
            <div className="space-y-2">
              {result.success > 0 && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">Successfully imported {result.success} links!</AlertDescription>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <X className="h-4 w-4" />
                  <AlertDescription>
                    {result.errors.map((err, idx) => (
                      <div key={idx}>
                        Line {err.line}: {err.error}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
