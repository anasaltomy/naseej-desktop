import { useState, useEffect, useCallback } from "react";

import VariantsController from "../controllers/variantsCtrls";
import type {
  DbSize,
  DbColor,
  UseVariantsReturn,
} from "../types/Variants.types";

export const useVariants = (): UseVariantsReturn => {
  const [sizes, setSizes] = useState<DbSize[]>([]);
  const [colors, setColors] = useState<DbColor[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState({ name: "", hex: "#000000" });

  const reload = useCallback(async () => {
    setLoading(true);
    const [fetchedSizes, fetchedColors] = await Promise.all([
      VariantsController.getSizes(),
      VariantsController.getColors(),
    ]);
    setSizes(fetchedSizes);
    setColors(fetchedColors);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSize = async () => {
    const trimmed = newSize.trim();
    if (!trimmed || sizes.some((s) => s.name === trimmed)) return;
    await VariantsController.createSize(trimmed);
    setNewSize("");
    reload();
  };

  const removeSize = async (id: string) => {
    await VariantsController.deleteSize(id);
    reload();
  };

  const addColor = async () => {
    const trimmed = newColor.name.trim();
    if (
      !trimmed ||
      colors.some((c) => c.name === trimmed || c.hex_code === newColor.hex)
    )
      return;
    await VariantsController.createColor(trimmed, newColor.hex);
    setNewColor({ name: "", hex: "#000000" });
    reload();
  };

  const removeColor = async (id: string) => {
    await VariantsController.deleteColor(id);
    reload();
  };

  return {
    sizes,
    colors,
    loading,
    newSize,
    newColor,
    setNewSize,
    setNewColor,
    addSize,
    removeSize,
    addColor,
    removeColor,
  };
};
