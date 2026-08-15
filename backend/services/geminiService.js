const { OpponentExtractSchema } = require('../validators/schemas');

// Helper: Check for Vietnamese shorthand expressions of 'Hôm nay' (hnay, tnay, cnay, snay, hn...)
function isTodayShorthand(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return /(tối\s*nay|\btnay\b|\bt\.nay\b|\btn\b|hôm\s*nay|\bhnay\b|\bh\.nay\b|\bhn\b|chiều\s*nay|\bcnay\b|\bc\.nay\b|sáng\s*nay|\bsnay\b|\bs\.nay\b|hom\s*nay|toi\s*nay|chieu\s*nay|sang\s*nay)/i.test(lower);
}

// Helper: Check for Vietnamese shorthand expressions of 'Ngày mai' (tmai, nmai, cmai...)
function isTomorrowShorthand(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return /(tối\s*mai|\btmai\b|\bt\.mai\b|\btm\b|ngày\s*mai|\bnmai\b|\bn\.mai\b|chiều\s*mai|\bcmai\b|\bc\.mai\b|sáng\s*mai|\bsmai\b|\bs\.mai\b|ngay\s*mai|toi\s*mai|chieu\s*mai|sang\s*mai)/i.test(lower);
}

function fallbackExtractRegex(rawText, postedAt) {
  if (!rawText) {
    return {
      teamName: 'FC Cáp Kèo Giao Hữu',
      stadiumName: 'Chưa chốt sân',
      matchTime: null,
      matchDay: null,
      homeArea: 'Hà Nội',
      level: 'Trung bình',
      contactPhone: null
    };
  }

  const phoneMatch = rawText.match(/(0\d{9,10})/);
  const timeMatch = rawText.match(/(\d{1,2})[hH:](\d{2})?/);
  
  let level = 'Trung bình';
  if (rawText.toLowerCase().includes('mềm') || rawText.toLowerCase().includes('vừa đá')) level = 'Mềm';
  if (rawText.toLowerCase().includes('cứng') || rawText.toLowerCase().includes('cực tốt')) level = 'Cứng';

  let matchTime = null;
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
    matchTime = `${hh}:${mm}`;
  }

  // ⚽ SMART TEAM NAME PARSER
  let teamName = null;
  const fcMatch = rawText.match(/(?:GÓC TÌM ĐỐI\s+)?FC[:\s]*([A-Za-z0-9\+\-\s]+?)(?=\s+mời|\s+tìm|\s+cần|\s+đá|\.|\,|$)/i);
  if (fcMatch && fcMatch[1].trim().length > 1) {
    teamName = `FC ${fcMatch[1].trim().replace(/^FC\s+/i, '')}`;
  } else {
    const doiMatch = rawText.match(/Đội\s+([A-Za-z0-9\+\-\s]+?)(?=\s+cần|\s+tìm|\s+mềm|\.|\,|$)/i);
    if (doiMatch && doiMatch[1].trim().length > 1) {
      teamName = `Đội ${doiMatch[1].trim()}`;
    }
  }

  // 🏟️ SMART STADIUM PARSER
  let stadiumName = null;
  const stadiumRegex = /(sân\s+[a-z0-9\sàáảãạăắằẳẵặâấầnẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\d\/\.\-]+?)(?=\s+\d+k|\s+trình|\s+sđt|\s+lh|\s+zalo|\s+giá|\s+tiền|\.|\,|\n|\r|$)/i;
  const stdMatch = rawText.match(stadiumRegex);

  if (stdMatch) {
    let name = stdMatch[1].trim();
    name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    name = name.replace(/\s+(Lúc|Ngày|Thứ|Sđt|Lh|Trình|Vào|Tại|Giá|Slot)$/i, '').trim();
    name = name.replace(/[\.\,]+$/, '').trim();
    if (name.length >= 4) stadiumName = name;
  }

  // 📍 SMART AREA PARSER
  let homeArea = null;
  const areaMatch = rawText.match(/(Cầu Giấy|Nam Từ Liêm|Bắc Từ Liêm|Thanh Xuân|Đống Đa|Hoàn Kiếm|Hà Đông|Hai Bà Trưng|Ba Đình|Tây Hồ|Long Biên|Hoàng Mai|Xuân Thủy|Hà Nội)/i);
  if (areaMatch) {
    homeArea = areaMatch[1];
    if (homeArea.toLowerCase() === 'xuân thủy') homeArea = 'Cầu Giấy';
  }

  // 📅 SMART DAY PARSER WITH STRICT PRIORITY:
  // 1. FIRST PRIORITY: EXPLICIT DAY OF WEEK (Thứ 2 -> Thứ 7, Chủ Nhật, t2 -> t7) OVERRIDES RELATIVE TERMS!
  let matchDay = null;
  const explicitDayMatch = rawText.match(/(thứ\s*[2-7]|\bt[2-7]\b|\bth[2-7]\b|thứ\s*ba|chủ\s*nhật)/i);

  if (explicitDayMatch) {
    const dStr = explicitDayMatch[1].toLowerCase();
    if (dStr.includes('3') || dStr.includes('ba')) {
      matchDay = 'Thứ 3';
    } else if (dStr.includes('6')) {
      matchDay = 'Thứ 6';
    } else if (dStr.includes('7')) {
      matchDay = 'Thứ 7';
    } else if (dStr.includes('2')) {
      matchDay = 'Thứ 2';
    } else if (dStr.includes('4')) {
      matchDay = 'Thứ 4';
    } else if (dStr.includes('5')) {
      matchDay = 'Thứ 5';
    } else if (dStr.includes('chủ nhật')) {
      matchDay = 'Chủ nhật';
    }
  }

  // 2. SECONDARY PRIORITY: RELATIVE DAY TERMS (tối mai, hnay, tnay...) ONLY IF NO EXPLICIT DAY IS MENTIONED!
  if (!matchDay) {
    const relativeDayMatch = rawText.match(/(\bhnay\b|\bh\.nay\b|\bhn\b|\btnay\b|\bt\.nay\b|\btn\b|tối\s+nay|hôm\s+nay|sáng\s+nay|chiều\s+nay|\bcnay\b|\bsnay\b|\btmai\b|\bnmai\b|tối\s+mai|hôm\s+mai)/i);
    if (relativeDayMatch) {
      const dStr = relativeDayMatch[1].toLowerCase();
      if (isTodayShorthand(dStr)) {
        const postDate = postedAt ? new Date(postedAt) : new Date();
        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        matchDay = dayNames[postDate.getDay()];
      } else if (isTomorrowShorthand(dStr)) {
        const postDate = postedAt ? new Date(postedAt) : new Date();
        postDate.setDate(postDate.getDate() + 1);
        const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        matchDay = dayNames[postDate.getDay()];
      }
    }
  }

  return {
    teamName: teamName || 'FC Cáp Kèo Giao Hữu',
    stadiumName: stadiumName || 'Chưa chốt sân',
    matchTime,
    matchDay,
    homeArea: homeArea || 'Hà Nội',
    level,
    contactPhone: phoneMatch ? phoneMatch[1] : null
  };
}

// 🚀 BATCH GEMINI REQUEST: Sends 1 SINGLE HTTP REQUEST for ALL scraped posts!
async function extractOpponentsBatch(postsArray) {
  if (!postsArray || postsArray.length === 0) return [];

  const geminiApiKey = process.env.GEMINI_API_KEY;

  const runFallbackBatch = () => {
    return postsArray.map((post, idx) => ({
      postIndex: idx + 1,
      ...fallbackExtractRegex(post.rawText || '', post.postedAt)
    }));
  };

  if (!geminiApiKey || geminiApiKey.includes('mock')) {
    console.log('🤖 Parsing all scraped posts using Single Fallback Regex Batch...');
    return runFallbackBatch();
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Combine all scraped raw posts with creation timestamp into 1 BATCH PROMPT!
    const combinedPostsText = postsArray
      .map((post, idx) => `[POST ${idx + 1}] (Ngày đăng bài: ${post.postedAt || 'Hôm nay'})\n${post.rawText || ''}`)
      .join('\n\n--------------------\n\n');

    const BATCH_SYSTEM_PROMPT = `
Bạn là bộ trích xuất dữ liệu bóng đá chuyên nghiệp. Dưới đây là danh sách ${postsArray.length} bài đăng tìm đối bóng đá khu vực Hà Nội.
Hãy đọc toàn bộ danh sách và trả về DUY NHẤT một JSON Array chứa đúng ${postsArray.length} JSON Object (theo thứ tự từ POST 1 đến POST ${postsArray.length}), không thêm bất kỳ text giải thích nào, không dùng markdown code block:

[
  {
    "postIndex": number,         // Chỉ số bài (1, 2, 3...)
    "teamName": string | null,    // Tên đội bóng tìm đối (VD: "FC H+7", "FC Thăng Long")
    "stadiumName": string | null, // Tên sân bóng đá chính xác (VD: "Sân Bóng Minh Đức", "Sân ĐH Sư Phạm"). TUYỆT ĐỐI KHÔNG lấy các cụm từ kiểu "Sân Lh...", "Sân zalo", "Sân IB".
    "matchTime": string | null,   // Định dạng "HH:mm" (VD: "22:15", "19:00", "17:30"), null nếu không rõ
    "matchDay": string | null,    // LƯU Ý UY TIÊN TỐI CAO: Nếu bài viết ghi rõ thứ như "tối mai thứ 6" hay "thứ 6", "t6", "thứ 3", hãy lấy CHÍNH XÁC thứ được ghi đó ("Thứ 6", "Thứ 3"). Chỉ dùng (Ngày đăng bài) nếu bài KHÔNG có ghi rõ thứ!
    "homeArea": string | null,    // Tên quận/huyện (VD: "Cầu Giấy", "Thanh Xuân", "Hà Nội", "Đống Đa")
    "level": string | null,       // Chỉ nhận một trong: "Mềm" | "Trung bình" | "Cứng" | null
    "contactPhone": string | null // Số ĐT Việt Nam hợp lệ (dạng 0xxxxxxxxx), null nếu không có
  }
]
`;

    console.log(`⚡ Sending 1 SINGLE BATCH REQUEST to Gemini AI for all ${postsArray.length} scraped posts...`);
    const response = await model.generateContent([BATCH_SYSTEM_PROMPT, combinedPostsText]);
    let rawStr = response.response.text().trim();

    if (rawStr.startsWith('```json')) {
      rawStr = rawStr.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawStr.startsWith('```')) {
      rawStr = rawStr.replace(/```/g, '').trim();
    }

    const parsedArray = JSON.parse(rawStr);

    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
      console.log(`✅ Single Gemini Batch Request processed ${parsedArray.length} posts successfully!`);
      const isUnknown = (s) => !s || s === 'Chưa chốt sân' || s === 'Đội chưa rõ tên' || s === 'Chưa rõ' || s === 'null' || s.trim() === '';

      return parsedArray.map((item, idx) => {
        const fb = fallbackExtractRegex(postsArray[idx]?.rawText || '', postsArray[idx]?.postedAt);
        return {
          teamName: !isUnknown(item.teamName) ? item.teamName : fb.teamName,
          stadiumName: !isUnknown(item.stadiumName) ? item.stadiumName : fb.stadiumName,
          matchTime: item.matchTime || fb.matchTime,
          matchDay: item.matchDay || fb.matchDay,
          homeArea: item.homeArea || fb.homeArea,
          level: item.level || fb.level,
          contactPhone: item.contactPhone || fb.contactPhone
        };
      });
    }

    console.warn('⚠️ Gemini Batch JSON array response invalid. Falling back to Regex batch.');
    return runFallbackBatch();
  } catch (err) {
    console.warn('⚠️ Single Gemini Batch Request failed:', err.message, 'Using Regex Batch Fallback.');
    return runFallbackBatch();
  }
}

async function extractOpponentInfo(rawText, postedAt) {
  const batchResult = await extractOpponentsBatch([{ rawText, postedAt }]);
  return {
    valid: true,
    data: batchResult[0] || fallbackExtractRegex(rawText, postedAt)
  };
}

module.exports = {
  extractOpponentInfo,
  extractOpponentsBatch,
  fallbackExtractRegex,
  isTodayShorthand,
  isTomorrowShorthand
};
