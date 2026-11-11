import { isFollowing, toggleFollow as toggleFollowModel, getFollowersCount, getUserFollows } from '../models/follow.js';

export const toggleFollow = async (req, res) => {
  try {
    const { target_type, target_id } = req.body;
    if (!target_type || !target_id) {
      return res.status(400).json({ error: 'target_type and target_id are required' });
    }

    if (!['novel', 'author'].includes(target_type)) {
      return res.status(400).json({ error: "target_type must be 'novel' or 'author'" });
    }

    const result = await toggleFollowModel(req.user.id, target_type, target_id);
    const count = await getFollowersCount(target_type, target_id);

    res.json({
      message: result.followed ? 'Followed successfully' : 'Unfollowed successfully',
      followed: result.followed,
      followers_count: count,
    });
  } catch (err) {
    console.error('Toggle follow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkFollowStatus = async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    if (!target_type || !target_id) {
      return res.status(400).json({ error: 'target_type and target_id are required' });
    }

    const userId = req.user ? req.user.id : null;
    const followed = userId ? await isFollowing(userId, target_type, target_id) : false;
    const count = await getFollowersCount(target_type, target_id);

    res.json({ followed, followers_count: count });
  } catch (err) {
    console.error('Check follow status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyFollows = async (req, res) => {
  try {
    const targetType = req.query.target_type || null;
    const follows = await getUserFollows(req.user.id, targetType);
    res.json({ follows });
  } catch (err) {
    console.error('Get my follows error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { toggleFollow, checkFollowStatus, getMyFollows };
