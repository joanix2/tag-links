import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CustomThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (primaryColor: string, primaryForeground: string) => void;
  initialPrimary?: string;
  initialPrimaryForeground?: string;
}

// Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Parse HSL string like "222.2 47.4% 11.2%" to hex
function hslStringToHex(hslString: string): string {
  const parts = hslString.split(" ");
  if (parts.length !== 3) return "#000000";

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", ""));
  const l = parseFloat(parts[2].replace("%", ""));

  return hslToHex(h, s, l);
}

// Convert hex to HSL string format like "222.2 47.4% 11.2%"
function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

export function CustomThemeDialog({ open, onOpenChange, onSave, initialPrimary = "#222222", initialPrimaryForeground = "#ffffff" }: CustomThemeDialogProps) {
  const [primaryColor, setPrimaryColor] = useState(initialPrimary.startsWith("#") ? initialPrimary : hslStringToHex(initialPrimary));
  const [primaryForegroundColor, setPrimaryForegroundColor] = useState(initialPrimaryForeground.startsWith("#") ? initialPrimaryForeground : hslStringToHex(initialPrimaryForeground));

  const handleSave = () => {
    const primaryHsl = hexToHslString(primaryColor);
    const foregroundHsl = hexToHslString(primaryForegroundColor);
    onSave(primaryHsl, foregroundHsl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Couleurs personnalisées</DialogTitle>
          <DialogDescription>Choisissez vos propres couleurs pour personnaliser votre thème</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Primary Color */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="primary-color">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <Input id="primary-color" type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-28 font-mono text-sm" />
                <div className="w-10 h-10 rounded border-2 border-border cursor-pointer" style={{ backgroundColor: primaryColor }} />
              </div>
            </div>
            <div className="flex justify-center">
              <HexColorPicker color={primaryColor} onChange={setPrimaryColor} style={{ width: "100%", maxWidth: "300px" }} />
            </div>
          </div>

          {/* Primary Foreground Color */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="foreground-color">Couleur du texte</Label>
              <div className="flex items-center gap-2">
                <Input id="foreground-color" type="text" value={primaryForegroundColor} onChange={(e) => setPrimaryForegroundColor(e.target.value)} className="w-28 font-mono text-sm" />
                <div className="w-10 h-10 rounded border-2 border-border cursor-pointer" style={{ backgroundColor: primaryForegroundColor }} />
              </div>
            </div>
            <div className="flex justify-center">
              <HexColorPicker color={primaryForegroundColor} onChange={setPrimaryForegroundColor} style={{ width: "100%", maxWidth: "300px" }} />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Aperçu</Label>
            <div className="flex gap-4">
              <div
                className="flex-1 p-4 rounded-lg border-2 flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: primaryColor,
                  color: primaryForegroundColor,
                }}
              >
                Texte sur fond principal
              </div>
              <div
                className="flex-1 p-4 rounded-lg border-2 flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: primaryForegroundColor,
                  color: primaryColor,
                }}
              >
                Texte sur fond clair
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
