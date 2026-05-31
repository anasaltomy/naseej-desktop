import React from "react";

const POSLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full h-full flex flex-col">{children}</div>;
};

export default POSLayout;
