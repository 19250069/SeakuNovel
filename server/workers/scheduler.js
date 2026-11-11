import crypto from 'crypto';
import { query } from '../config/db.js';
import { updateChapter as updateChapterSvc } from '../models/chapter.js';
import { updateNovel as updateNovelSvc } from '../models/novel.js';

/**
 * Checks and publishes scheduled chapters and novels whose publish_at <= NOW().
 */
export async function checkAndPublishScheduled() {
  try {
    const scheduled = await query(`
      SELECT sp.* 
      FROM scheduled_publications sp 
      WHERE sp.status = 'scheduled' AND sp.publish_at <= NOW()
    `);

    if (!scheduled || scheduled.length === 0) return { processed: 0 };

    for (const item of scheduled) {
      if (item.chapter_id) {
        // Publish chapter
        await query('UPDATE chapters SET is_published = TRUE WHERE id = ?', [item.chapter_id]);
        console.log(`[Scheduler] Published scheduled chapter ${item.chapter_id} for novel ${item.novel_id}`);

        try {
          const { getChapterById } = await import('../models/chapter.js');
          const { getNovelById } = await import('../models/novel.js');
          const { notifyFollowersOfNewChapter } = await import('../models/notification.js');
          const ch = await getChapterById(item.chapter_id);
          const nov = await getNovelById(item.novel_id);
          if (ch && nov) {
            await notifyFollowersOfNewChapter({ chapter: ch, novel: nov });
          }
        } catch (notifErr) {
          console.error('[Scheduler] Error notifying followers:', notifErr);
        }
      } else if (item.novel_id) {
        // Publish novel
        await query("UPDATE novels SET status = 'published' WHERE id = ?", [item.novel_id]);
        console.log(`[Scheduler] Published scheduled novel ${item.novel_id}`);
      }

      await query("UPDATE scheduled_publications SET status = 'published' WHERE id = ?", [item.id]);
    }

    return { processed: scheduled.length };
  } catch (err) {
    console.error('[Scheduler] Error checking scheduled publications:', err);
    return { error: err.message };
  }
}

/**
 * Schedules a chapter or novel publication.
 */
export async function schedulePublication({ novel_id, chapter_id = null, publish_at }) {
  const id = crypto.randomUUID();
  const dateObj = new Date(publish_at);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid publish_at date format');
  }

  await query(
    `INSERT INTO scheduled_publications (id, novel_id, chapter_id, publish_at, status)
     VALUES (?, ?, ?, ?, 'scheduled')`,
    [id, novel_id, chapter_id, dateObj]
  );

  return { id, novel_id, chapter_id, publish_at: dateObj, status: 'scheduled' };
}

let schedulerTimer = null;

export function startScheduler(intervalMs = 60000) {
  if (schedulerTimer) return;
  // Run once immediately on start
  checkAndPublishScheduled().catch(() => {});
  // Then run periodically
  schedulerTimer = setInterval(() => {
    checkAndPublishScheduled().catch(() => {});
  }, intervalMs);
  console.log(`[Scheduler] Background publisher started (interval: ${intervalMs / 1000}s)`);
}

export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

export default { checkAndPublishScheduled, schedulePublication, startScheduler, stopScheduler };
