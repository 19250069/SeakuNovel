export const recordView = async (req, res) => {
  try {
    const chapterId = req.params.id;
    const chapters = await query('SELECT id FROM chapters WHERE id = ?', [chapterId]);
    if (chapters.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    await query('INSERT INTO chapter_views (id, chapter_id, view_count, created_at, updated_at) VALUES (UUID(), ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE view_count = view_count + 1, updated_at = NOW()', [chapterId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to record view:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
