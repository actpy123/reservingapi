import React, { useState } from "react";
import type { Tab } from "../types/controlSheet";
import "../styles/Tabs.style.css";

interface TabsProps {
  tabs: Tab[];
  defaultActiveIndex?: number;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultActiveIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

  return (
    <>
      <div className="tabs flex overflow-x-auto overflow-y-hidden whitespace-nowrap">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button inline-flex items-center h-10 px-4 -mb-px text-sm text-center text-gray-700 bg-transparent border-b-2 border-transparent sm:text-base dark:text-white whitespace-nowrap cursor-base focus:outline-none hover:border-gray-400 ${activeIndex === index ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeIndex] && tabs[activeIndex].content}
      </div>
    </>
  );
};

export default Tabs;
