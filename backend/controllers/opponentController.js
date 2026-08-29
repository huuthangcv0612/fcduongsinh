const Opponent = require('../models/Opponent');
const { scrapeOpponents } = require('../services/apifyService');
const { extractOpponentsBatch } = require('../services/geminiService');
const { AppError } = require('../middlewares/authMiddleware');

// Trigger Scrape: Apify + 1 SINGLE BATCH REQUEST to Gemini AI, returns extracted list to frontend WITHOUT saving to DB
async function triggerScrape(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 15;
    const rawPosts = await scrapeOpponents(limit);
    
    // Filter valid posts
    const validPosts = rawPosts.filter(p => p.rawText && p.rawText.length >= 10);

    // ⚡ 1 SINGLE BATCH REQUEST TO GEMINI AI FOR ALL POSTS AT ONCE!
    const batchExtractions = await extractOpponentsBatch(validPosts);

    const extractedList = validPosts.map((post, i) => {
      const info = batchExtractions[i] || {};
      return {
        _tempId: `temp_${Date.now()}_${i}`,
        teamName: info.teamName || 'Đội chưa rõ tên',
        stadiumName: info.stadiumName || 'Chưa chốt sân',
        matchTime: info.matchTime || 'Đang thương lượng',
        matchDay: info.matchDay || 'Đang chọn ngày',
        homeArea: info.homeArea || 'Hà Nội',
        level: info.level || 'Trung bình',
        contactPhone: info.contactPhone || null,
        sourceUrl: post.sourceUrl || '',
        rawText: post.rawText,
        scrapedAt: post.postedAt || new Date().toISOString(),
        isSaved: false
      };
    });

    res.json({
      success: true,
      data: extractedList,
      meta: {
        scrapedCount: extractedList.length,
        geminiBatchRequest: true
      }
    });
  } catch (err) {
    console.error('❌ [TÌM ĐỐI TÁC] Lỗi Quá Trình Quét Kèo (Scrape/Gemini):', err.message);
    console.error(err.stack);
    next(new AppError('SCRAPE_ERROR', `Lỗi hệ thống khi tìm đối tác: ${err.message}`, 500));
  }
}

// Explicit Save Opponent: Saves selected opponent object into MongoDB Atlas
async function saveOpponent(req, res, next) {
  try {
    const { teamName, stadiumName, matchTime, matchDay, homeArea, level, contactPhone, sourceUrl, rawText } = req.body;

    if (!rawText) {
      throw new AppError('VALIDATION_ERROR', 'Dữ liệu bài đăng tìm đối không hợp lệ', 400);
    }

    const doc = await Opponent.findOneAndUpdate(
      { sourceUrl: sourceUrl || undefined },
      {
        teamName: teamName || 'Đội chưa rõ tên',
        stadiumName: stadiumName || 'Chưa chốt sân',
        matchTime: matchTime || null,
        matchDay: matchDay || null,
        homeArea: homeArea || 'Hà Nội',
        level: level || 'Trung bình',
        contactPhone: contactPhone || null,
        sourceUrl: sourceUrl || undefined,
        rawText,
        isSaved: true,
        scrapedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      data: doc
    });
  } catch (err) {
    next(err);
  }
}

// Get Saved Opponents from DB
async function getOpponents(req, res, next) {
  try {
    const opponents = await Opponent.find({ isSaved: true }).sort({ scrapedAt: -1 }).limit(50).lean();
    res.json({
      success: true,
      data: opponents
    });
  } catch (err) {
    next(err);
  }
}

// Delete / Unsave Opponent from DB
async function deleteOpponent(req, res, next) {
  try {
    const { id } = req.params;
    const opponent = await Opponent.findByIdAndDelete(id);
    if (!opponent) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy kèo đối thủ để xóa', 404);
    }
    res.json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerScrape,
  saveOpponent,
  getOpponents,
  deleteOpponent
};
