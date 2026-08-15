const { getCurrentApifyKey, rotateApifyKey, getKeyCount } = require('../config/apify');
const FacebookGroup = require('../models/FacebookGroup');

const MOCK_FACEBOOK_POSTS = [
  {
    rawText: "Cần tìm đối mềm đá 19h15 Thứ 3 tới tại Sân Thượng Đình, Q. Thanh Xuân, Hà Nội. Keo 5-5 nhẹ nhàng giao lưu. Đội FC Thăng Long. SĐT 0981234567 (Anh Tuấn)",
    sourceUrl: "https://facebook.com/groups/capkeobongdahanoi/posts/1001",
    postedAt: new Date().toISOString()
  },
  {
    rawText: "Tìm đối tác đá 19h00 T3 tuần tới Sân Cầu Giấy Hà Nội. Đội FC Hà Thành tìm đối mềm vui vẻ. Alo/Zalo 0904556677",
    sourceUrl: "https://facebook.com/groups/timdoibongdacaugiay/posts/1002",
    postedAt: new Date().toISOString()
  },
  {
    rawText: "Giao hữu 19:30 Thứ 3 này, Sân Viettel Q. Đống Đa, Hà Nội. Đội Trung Bình, tìm đối văn minh. Zalo / SĐT 0987654321",
    sourceUrl: "https://facebook.com/groups/giaohubongdahanoi/posts/1004",
    postedAt: new Date().toISOString()
  },
  {
    rawText: "Cần gấp 1 kèo 19:15 T3 tại Sân An Khánh Hà Đông, Hà Nội. Đội mềm vừa đá vừa thở. Alo 0933445566",
    sourceUrl: "https://facebook.com/groups/capkeobongdahanoi/posts/1005",
    postedAt: new Date().toISOString()
  }
];

// Helper: Check if post mentions Tuesday ("thứ 3", "t3", "T3", "thứ ba", "thu 3")
function isTuesdayPost(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return /(thứ\s*3|thứ\s*ba|\bt3\b|thu\s*3)/i.test(lower);
}

async function scrapeOpponents(limit = 15, retriesLeft = getKeyCount()) {
  const perGroupLimit = Number(limit) || 15;

  // Fetch active target Facebook Groups from Database
  let activeGroups = [];
  try {
    activeGroups = await FacebookGroup.find({ isActive: true }).select('url name').lean();
  } catch (dbErr) {
    console.warn('⚠️ Could not load active Facebook Groups from DB:', dbErr.message);
  }

  const currentKey = getCurrentApifyKey();

  if (!currentKey || currentKey.includes('mock')) {
    console.log('🤖 Using Apify Mock Data for Tuesday Opponents...');
    return MOCK_FACEBOOK_POSTS;
  }

  if (activeGroups.length === 0) {
    console.warn('⚠️ No active Facebook Groups found in DB');
    return MOCK_FACEBOOK_POSTS;
  }

  try {
    const { ApifyClient } = require('apify-client');
    const client = new ApifyClient({ token: currentKey });
    const actorId = process.env.APIFY_ACTOR_ID || '2chN8UQcH1CfxLRNE';

    const groupCount = activeGroups.length;
    console.log(`🚀 Scraping up to ${perGroupLimit} posts FOR EACH of the ${groupCount} active Facebook Groups...`);

    const allItems = [];

    // 🎯 SEQUENTIAL SCRAPING PER GROUP: Search Tuesday & Recent feeds
    for (let i = 0; i < activeGroups.length; i++) {
      const group = activeGroups[i];
      try {
        const baseUrl = group.url.replace(/\/$/, '');
        const searchUrlT3 = `${baseUrl}/search/?q=th%E1%BB%A9%203`; // Search "thứ 3"
        const searchUrlT3Short = `${baseUrl}/search/?q=t3`;         // Search "t3"

        console.log(`📡 [${i + 1}/${groupCount}] Scraping Group: "${group.name}"...`);

        const groupInput = {
          startUrls: [
            { url: searchUrlT3 },
            { url: searchUrlT3Short },
            { url: baseUrl }
          ],
          search: 'thứ 3|t3|thứ ba|cáp kèo|giao hữu|sân 7',
          searchKeywords: 'thứ 3, t3, thứ ba, cáp kèo, giao hữu, sân 7',
          searchIn: ['postText', 'message', 'text'],
          viewOption: 'CHRONOLOGICAL',
          resultsLimit: perGroupLimit,
          maxItems: perGroupLimit,
          maxPosts: perGroupLimit
        };

        const run = await client.actor(actorId).call(groupInput);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`✅ Scraped ${items.length} posts from Group ${i + 1}: "${group.name}"`);
        allItems.push(...items);
      } catch (gErr) {
        console.warn(`⚠️ Failed scraping Group ${i + 1} "${group.name}":`, gErr.message);
        if (gErr.statusCode === 429 || gErr.type === 'usage-hard-limit-exceeded' || gErr.message?.toLowerCase().includes('hard limit exceeded') || gErr.message?.toLowerCase().includes('quota')) {
          throw gErr; // Bắn lỗi ra ngoài để kích hoạt đổi Key hoặc báo lỗi UI
        }
      }
    }

    const allMapped = allItems.map(item => ({
      rawText: item.text || item.message || item.fullText || item.postText || item.content || '',
      sourceUrl: item.url || item.postUrl || item.link || `https://facebook.com/post/${item.id || Date.now()}`,
      postedAt: item.time || item.postedAt || item.createdAt || new Date().toISOString()
    })).filter(item => item.rawText && item.rawText.length >= 10);

    // 🎯 SMART SORTING: Place Tuesday ("Thứ 3", "T3") posts at the VERY TOP!
    const tuesdayPosts = allMapped.filter(item => isTuesdayPost(item.rawText));
    const nonTuesdayPosts = allMapped.filter(item => !isTuesdayPost(item.rawText));

    console.log(`🎯 Tuesday Smart Sorting: Found ${tuesdayPosts.length} Tuesday posts out of ${allMapped.length} total posts!`);

    return [...tuesdayPosts, ...nonTuesdayPosts];
  } catch (err) {
    if (err.statusCode === 429 || err.type === 'usage-hard-limit-exceeded' || err.message?.toLowerCase().includes('hard limit exceeded') || err.message?.toLowerCase().includes('quota')) {
      console.warn(`⚠️ Apify Key rate limited. Rotated key... Retries left: ${retriesLeft - 1}`);
      if (retriesLeft > 1) {
        rotateApifyKey();
        return scrapeOpponents(limit, retriesLeft - 1);
      } else {
        // Hết key hoặc retries = 1, báo lỗi thẳng ra UI để user biết nạp tiền/đổi key
        throw new Error('Đã hết hạn mức sử dụng (Monthly usage hard limit exceeded) của tất cả Apify Keys. Vui lòng cập nhật API Key mới!');
      }
    }
    console.warn('⚠️ Apify scraping failed:', err.message);
    throw err; // Bắn lỗi thực tế ra thay vì trả về Mock data
  }
}

module.exports = {
  scrapeOpponents
};
