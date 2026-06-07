import { useVariants } from "../hooks/useVariants";

const VariantsScreen = () => {
  const {
    sizes,
    colors,
    newSize,
    newColor,
    setNewSize,
    setNewColor,
    addSize,
    removeSize,
    addColor,
    removeColor,
  } = useVariants();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Catalog Settings</h2>
      <div className="space-y-8">
        <div>
          <h3 className="font-semibold mb-2">Default Sizes</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {sizes.map((size) => (
              <span
                key={size.id}
                className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1"
              >
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
            onSubmit={(e) => {
              e.preventDefault();
              addSize();
            }}
          >
            <input
              className="pos-input"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              placeholder="Add size (e.g. XXL, 45)"
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Default Colors</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {colors.map((color) => (
              <span
                key={color.id}
                className="px-2 py-1 rounded text-sm flex items-center gap-2"
                style={{ background: color.hex_code, color: "#fff" }}
              >
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
            onSubmit={(e) => {
              e.preventDefault();
              addColor();
            }}
          >
            <input
              className="pos-input"
              value={newColor.name}
              onChange={(e) =>
                setNewColor({ ...newColor, name: e.target.value })
              }
              placeholder="Color name"
            />
            <input
              type="color"
              value={newColor.hex}
              onChange={(e) =>
                setNewColor({ ...newColor, hex: e.target.value })
              }
              title="Pick color"
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VariantsScreen;
