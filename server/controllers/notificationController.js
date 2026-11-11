import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../models/notification.js';

export async function getNotifications(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await getUserNotifications(req.user.id, { page, limit, unreadOnly });
    res.json(result);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
}

export async function getNotificationUnreadCount(req, res) {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Gagal mengambil jumlah notifikasi belum dibaca' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    await markAsRead(id, req.user.id);
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await markAllAsRead(req.user.id);
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Gagal memperbarui status notifikasi' });
  }
}
