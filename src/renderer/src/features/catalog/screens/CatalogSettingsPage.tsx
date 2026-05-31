import React from "react";
import DefaultSizesColorsSettings from "../../Settings/components/DefaultSizesColorsSettings";

const CatalogSettingsPage = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Catalog Settings</h2>
      <DefaultSizesColorsSettings />
    </div>
  );
};

export default CatalogSettingsPage;
