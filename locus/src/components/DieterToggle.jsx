import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";


export default function RamsNeumorphicToggle({ isOn, onToggle }) {
  const wasClicked = useRef(false);

  // Reset wasClicked after each render
  useEffect(() => {
    if (wasClicked.current) {
      // Reset after animation frame
      const id = requestAnimationFrame(() => {
        wasClicked.current = false;
      });
      return () => cancelAnimationFrame(id);
    }
  });

  const handleClick = () => {
    wasClicked.current = true;
    onToggle();
  };

  return (
    <motion.div
      onClick={handleClick}
      style={{
        width: 40,
        height: 20,
        borderRadius: 20,
        background: isOn ? "#736B1C" : "#f0f0f0",
        display: "flex",
        alignItems: "center",
        padding: 3,
        cursor: "pointer",
        boxShadow: isOn
          ? "8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff"
          : "8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff",
        transition: "background 0.3s ease",
      }}
      animate={{ opacity: isOn ? 0.8 : 1 }}
      whileHover={isOn ? { opacity: 1 } : {}}
      transition={{ opacity: { duration: 0.2 }, background: { duration: 0.3 } }}
    >
      <motion.div
        layout
        transition={
          wasClicked.current
            ? {
                type: "spring",
                stiffness: 500,
                damping: 30,
              }
            : { duration: 0 }
        }
        style={{
          width: 14,
          height: 14,
          borderRadius: 14,
          background: "#f0f0f0",
          boxShadow: isOn
            ? "inset 1px 1px 2.5px #d1d1d1, inset -1px -1px 2.5px #ffffff"
            : "2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff",
          marginLeft: isOn ? "20px" : "0px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
        }}
      >
        <i
          className="ri-pushpin-line"
          style={{
            fontSize: 10,
            color: isOn ? "#736B1C" : "#040402",
            transition: "color 0.3s",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

