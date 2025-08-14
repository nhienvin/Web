// client/src/components/LoadingScreen.jsx
import { Spin } from 'antd';

export default function LoadingScreen() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" tip="Đang tải..." />
    </div>
  );
}