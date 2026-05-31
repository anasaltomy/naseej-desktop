import React from "react";

const UsersLayout = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full h-full flex flex-col">{children}</div>;
};

export default UsersLayout;
