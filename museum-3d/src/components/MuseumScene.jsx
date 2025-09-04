import React, { useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Plane, useGLTF, Environment  } from "@react-three/drei";
import { gsap } from "gsap";
import Room from "./Room";
import Navigation from "./Navigation";

// Component chính
const MuseumScene = () => {
  const doorRef = useRef(); // Tham chiếu đến cánh cửa
  const [entered, setEntered] = useState(false); // Kiểm tra đã vào bảo tàng chưa
  const [currentRoom, setCurrentRoom] = useState(0); // Phòng hiện tại
  const [selectedObject, setSelectedObject] = useState(null); // Lưu hiện vật được chọn
  return (
    <div style={{ width: "100vw", height: "100vh", background: "radial-gradient(circle, #2C003E, #000000)"}}>
        {/* Nếu đã vào bảo tàng thì hiển thị nút chuyển phòng */}
      {entered && <Navigation currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />}
      <Canvas camera={{ position: [0, 2, 10] }}>
        {/* Dùng HDR để thay đổi môi trường ánh sáng */}
        {/* <Environment files="/hdr/night_sky.hdr" background /> */}

        <CameraController doorRef={doorRef} setEntered={setEntered}  setCurrentRoom={(room) => setCurrentRoom(room)} />
        {/* Nếu chưa vào bảo tàng thì hiển thị cửa */}
        {!entered && <DoorModel doorRef={doorRef} />}
        {/* Nếu đã vào bảo tàng thì hiển thị phòng */}
        {entered && <Room roomId={currentRoom} setSelectedObject={setSelectedObject}/>}
        {/* Cho phép xoay camera bằng chuột */}
        {!selectedObject && <OrbitControls minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.5} />}
        <Scene doorRef={doorRef} entered={entered} />
      </Canvas>
      
    </div>
  );
};

// 📌 Điều khiển Camera
const CameraController = ({ doorRef, setEntered, setCurrentRoom }) => {
  const { camera } = useThree();

  useEffect(() => {
    const handleScroll = (event) => {
      if (!setEntered) return;

      gsap.to(camera.position, {
        z: camera.position.z - event.deltaY * 0.01, // Tiến vào bảo tàng
        duration: 0.5,
        onUpdate: () => {
          // Khi camera đã tiến qua cửa, làm mờ hoặc ẩn cửa
          if (camera.position.z < 2) {
            if (doorRef.current) { // 🔥 Kiểm tra nếu doorRef tồn tại
              gsap.to(doorRef.current.scale, { x: 0, y: 0, z: 0, duration: 1 }); // Làm mờ cửa
            }
            setEntered(true);
            setCurrentRoom(1); // Chuyển vào phòng 1
          }
        },
      });
    };

    window.addEventListener("wheel", handleScroll);
    return () => window.removeEventListener("wheel", handleScroll);
  }, [camera, setEntered, setCurrentRoom]);

  return null;
};

// 📌 Scene chính
const Scene = ({ doorRef, entered }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Sàn bảo tàng */}
      <Plane rotation={[-Math.PI / 2, 0, 0]} args={[50, 50]}>
        <meshStandardMaterial color="lightgray" />
      </Plane>

      {/* Mô hình bảo tàng */}
      {/* <MuseumModel /> */}

      {/* Cánh cửa bảo tàng */}
      {!entered && <DoorModel doorRef={doorRef} />}

      {/* Giới hạn xoay camera */}
      <OrbitControls minPolarAngle={Math.PI / 2} maxPolarAngle={Math.PI / 2} />
    </>
  );
};

// 📌 Tải mô hình bảo tàng
// const MuseumModel = () => {
//   const { scene } = useGLTF("/models/museum.glb"); // Đường dẫn đến mô hình bảo tàng
//   return <primitive object={scene} scale={1.5} position={[0, 0, 0]} />;
// };

// 📌 Tải mô hình cánh cửa
const DoorModel = ({ doorRef }) => {
  const { scene } = useGLTF("/models/old_brown_wooden_historical_door.glb"); // Đường dẫn đến mô hình cánh cửa
  return <primitive ref={doorRef} object={scene} scale={1} position={[0.5, -1.5, 5]} />;
};

export default MuseumScene;
