import React from "react";

const Navigation = ({ currentRoom, setCurrentRoom }) => {
  return (
    <div style={{
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "10px"
    }}>
      <button
        onClick={() => setCurrentRoom((prev) => Math.max(1, prev - 1))}
        style={{
          padding: "10px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#333",
          color: "white",
          border: "none",
          borderRadius: "5px"
        }}
      >
        🔙 Phòng Trước
      </button>

      <span style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}>
        Phòng {currentRoom}
      </span>

      <button
        onClick={() => setCurrentRoom((prev) => Math.min(10, prev + 1))}
        style={{
          padding: "10px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#333",
          color: "white",
          border: "none",
          borderRadius: "5px"
        }}
      >
        Phòng Tiếp 🔜
      </button>
    </div>
  );
};

export default Navigation;
