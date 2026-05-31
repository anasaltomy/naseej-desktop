import React from "react";

const HRLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full h-full flex flex-col">{children}</div>;
};

export default HRLayout;
