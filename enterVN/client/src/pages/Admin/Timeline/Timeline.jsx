// client/src/components/Timeline.jsx
import { Timeline as AntTimeline, Card } from 'antd';

export default function Timeline({ events }) {
  return (
    <AntTimeline mode="alternate">
      {events.map((event, index) => (
        <AntTimeline.Item key={index} label={event.year}>
          <Card title={event.title}>
            <p>{event.description}</p>
            {event.images?.map(img => (
              <img key={img} src={img} alt={event.title} width="100%" />
            ))}
          </Card>
        </AntTimeline.Item>
      ))}
    </AntTimeline>
  );
}