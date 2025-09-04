import React from "react";
import Object3D from "./Object3D";
import { Box, Cylinder } from "@react-three/drei";

const Room = ({ roomId, setSelectedObject }) => {
  const objects = [
    { id: 1, type: "image", url: "/textures/room1/item1.jpg", position: [0, 0.75, 3] },
    { id: 2, type: "image", url: "/textures/room1/item2.jpg", position: [-2, 0.75, -3] },
    { id: 3, type: "model", url: "/models/default.glb", position: [2, 0.75, -3] },
  ];

  return (
    <>
      {/* Sàn trắng */}
      <Box position={[0, -0.25, 0]} args={[15, 0.5, 15]}>
        <meshStandardMaterial color="white" />
      </Box>

      {/* Tường trắng */}
      <Box position={[0, 2, -7.5]} args={[15, 4, 0.2]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box position={[0, 2, 7.5]} args={[15, 4, 0.2]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box position={[-7.5, 2, 0]} args={[0.2, 4, 15]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box position={[7.5, 2, 0]} args={[0.2, 4, 15]}>
        <meshStandardMaterial color="white" />
      </Box>

      {/* Hiện vật đặt trên bục */}
      {objects.map((obj) => (
        <group key={obj.id} position={obj.position}>
          {/* Bục trưng bày */}
          <Cylinder args={[0.5, 0.5, 0.5, 32]}>
            <meshStandardMaterial color="#cccccc" />
          </Cylinder>

          {/* Hiện vật 2D hoặc 3D */}
          <Object3D data={obj} position={[0, 0.75, 0]} onClick={() => setSelectedObject(obj)} />
        </group>
      ))}
    </>
  );
};

export default Room;
