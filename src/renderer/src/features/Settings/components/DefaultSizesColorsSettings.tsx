
import React, { useEffect, useState } from "react";

// Types for DB rows
type DbSize = { id: string; name: string; sort_order?: number };
type DbColor = { id: string; name: string; hex_code: string };


export default function DefaultSizesColorsSettings() {
  const [sizes, setSizes] = useState<DbSize[]>([]);
  const [colors, setColors] = useState<DbColor[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState({ name: "", hex: "#000000" });
  const [loading, setLoading] = useState(false);

  // Load from DB
  const reload = async () => {
    setLoading(true);
    const dbSizes = await window.api?.sizes.getAll();
    const dbColors = await window.api?.colors.getAll();
    setSizes(dbSizes ?? []);
    setColors(dbColors ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Add size
  const addSize = async () => {
    if (!newSize.trim() || sizes.some(s => s.name === newSize.trim())) return;
    await window.api?.sizes.create({ name: newSize.trim() });
    setNewSize("");
    reload();
  };
  // Remove size
  const removeSize = async (id: string) => {
    await window.api?.sizes.delete(id);
    reload();
  };

  // Add color
  const addColor = async () => {
    if (!newColor.name.trim() || colors.some(c => c.name === newColor.name.trim() || c.hex_code === newColor.hex)) return;
    await window.api?.colors.create({ name: newColor.name.trim(), hexCode: newColor.hex });
    setNewColor({ name: "", hex: "#000000" });
    reload();
  };
  // Remove color
  const removeColor = async (id: string) => {
    await window.api?.colors.delete(id);
    reload();
  };

  // UI
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-2">Default Sizes</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {sizes.map((size) => (
            <span key={size.id} className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1">
              {size.name}
              <button
                className="ml-1 text-red-500 hover:text-red-700"
                onClick={() => removeSize(size.id)}
                title="Remove size"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            addSize();
          }}
        >
          <input
            className="pos-input"
            value={newSize}
            onChange={e => setNewSize(e.target.value)}
            placeholder="Add size (e.g. XXL, 45)"
          />
          <button type="submit" className="btn btn-primary">Add</button>
        </form>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Default Colors</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {colors.map((color) => (
            <span key={color.id} className="px-2 py-1 rounded text-sm flex items-center gap-2" style={{ background: color.hex_code, color: '#fff' }}>
              {color.name}
              <button
                className="ml-1 text-red-200 hover:text-red-700"
                onClick={() => removeColor(color.id)}
                title="Remove color"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2 items-center"
          onSubmit={e => {
            e.preventDefault();
            addColor();
          }}
        >
          <input
            className="pos-input"
            value={newColor.name}
            onChange={e => setNewColor({ ...newColor, name: e.target.value })}
            placeholder="Color name"
          />
          <input
            type="color"
            value={newColor.hex}
            onChange={e => setNewColor({ ...newColor, hex: e.target.value })}
            title="Pick color"
          />
          <button type="submit" className="btn btn-primary">Add</button>
        </form>
      </div>
    </div>
  );
}
