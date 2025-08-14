// server/routes/timelineRoutes.js
const express = require('express');
const timelineController = require('../controllers/timelineController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Áp dụng bảo vệ route và phân quyền
router.use(protect);

router
  .route('/')
  .post(
    restrictTo('admin', 'editor'),
    timelineController.createTimelineEvent
  )
  .get(timelineController.getAllTimelineEvents);

router
  .route('/:id')
  .patch(
    restrictTo('admin', 'editor'),
    timelineController.updateTimelineEvent
  )
  .delete(
    restrictTo('admin'),
    timelineController.deleteTimelineEvent
  );

router.get('/period/:period', timelineController.getEventsByPeriod);

router
  .route('/:id/events')
  .post(
    protect,
    restrictTo('admin', 'editor'),
    timelineController.addEventToTimeline
  )
  .delete(
    protect,
    restrictTo('admin', 'editor'),
    timelineController.removeEventFromTimeline
  );
module.exports = router;