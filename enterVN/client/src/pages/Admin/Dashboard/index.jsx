// client/src/pages/Admin/Dashboard/index.jsx
import { Card, Row, Col, Statistic } from 'antd';
import { useEffect, useState } from 'react';
import api from '../../../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    posts: 0,
    users: 0,
    categories: 0,
    timelineEvents: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Lỗi tải thống kê:', err);
    } finally {
      setLoading(false);
    }
  };
  console.log("1: " + stats);
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <h1>Trang Quản Trị</h1>
      
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Bài viết" 
              value={stats.posts} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Người dùng" 
              value={stats.users} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Danh mục" 
              value={stats.categories} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Sự kiện" 
              value={stats.timelineEvents} 
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Hoạt động gần đây" style={{ marginTop: 24 }}>
        {/* Thêm bảng/timeline hoạt động sau */}
        <p>Đang phát triển...</p>
      </Card>
    </div>
  );
}