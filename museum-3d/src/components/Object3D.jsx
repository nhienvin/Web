import React, { useState, useEffect } from "react";
import { Plane, useTexture, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { gsap } from "gsap";

const Object3D = ({ position, data, onClick }) => {
  const { camera } = useThree();

  // Xác định loại hiện vật
  const isImage = data.type === "image";
  const isModel = data.type === "model";

  // Đường dẫn fallback (mặc định)
  const defaultTextureUrl = "/textures/default.jpg";
  const defaultModelUrl = "/models/default.glb";

  // State lưu URL cuối cùng sử dụng cho texture hoặc mô hình
  const [finalImageUrl, setFinalImageUrl] = useState(isImage ? data.url : defaultTextureUrl);
  const [finalModelUrl, setFinalModelUrl] = useState(isModel ? data.url : defaultModelUrl);

  // Kiểm tra sự tồn tại của URL hình ảnh
  useEffect(() => {
    if (isImage) {
      const img = new Image();
      img.src = data.url;
      img.onload = () => {
        // Ảnh tồn tại: giữ nguyên URL ban đầu
      };
      img.onerror = () => {
        console.warn(`Ảnh ${data.url} không tồn tại, sử dụng ảnh mặc định.`);
        setFinalImageUrl(defaultTextureUrl);
      };
    }
  }, [data.url, isImage, defaultTextureUrl]);

  // Kiểm tra sự tồn tại của URL mô hình 3D
  useEffect(() => {
    if (isModel) {
      fetch(data.url)
        .then((res) => {
          if (!res.ok) {
            console.warn(`Mô hình ${data.url} không tồn tại, sử dụng mô hình mặc định.`);
            setFinalModelUrl(defaultModelUrl);
          }
        })
        .catch(() => {
          console.warn(`Không thể fetch mô hình ${data.url}, sử dụng mô hình mặc định.`);
          setFinalModelUrl(defaultModelUrl);
        });
    }
  }, [data.url, isModel, defaultModelUrl]);

  // Sử dụng final URL trong các hook – chúng luôn được gọi theo cùng thứ tự
  const texture = useTexture(finalImageUrl);
  const gltf = useGLTF(finalModelUrl);

  const handleClick = () => {
    onClick(data);
    gsap.to(camera.position, {
      x: position[0],
      y: position[1] + 1,
      z: position[2] + 2,
      duration: 1.5,
      ease: "power2.inOut",
    });
  };

  return (
    <group position={position} onClick={handleClick}>
      {isImage && (
        <Plane args={[1.5, 1.5]}>
          <meshBasicMaterial map={texture} transparent />
        </Plane>
      )}
      {isModel && <primitive object={gltf.scene} scale={0.01} />}
    </group>
  );
};

export default Object3D;
