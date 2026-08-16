// Lists push subscriptions grouped by user so you can spot stale duplicates
// left over from repeated "clear Safari site data + re-add to home screen"
// during push-notification debugging.
//
// Read-only by default: node scripts/cleanupDuplicateSubscriptions.js
// To delete a specific stale row after reviewing the list:
//   node scripts/cleanupDuplicateSubscriptions.js --delete <subscriptionId>
require('dotenv').config();
const mongoose = require('mongoose');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const deleteIndex = process.argv.indexOf('--delete');
  if (deleteIndex !== -1) {
    const id = process.argv[deleteIndex + 1];
    if (!id) {
      console.error('Usage: --delete <subscriptionId>');
      process.exit(1);
    }
    const result = await PushSubscription.findByIdAndDelete(id);
    console.log(result ? `Deleted subscription ${id}` : `No subscription found with id ${id}`);
    await mongoose.disconnect();
    return;
  }

  const subs = await PushSubscription.find().sort({ userId: 1, updatedAt: -1 });
  const byUser = new Map();
  for (const sub of subs) {
    const key = String(sub.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(sub);
  }

  console.log(`Total subscriptions: ${subs.length} across ${byUser.size} users.\n`);

  for (const [userId, userSubs] of byUser) {
    if (userSubs.length <= 1) continue;
    const user = await User.findById(userId).select('name email phone');
    console.log(`User ${userId} (${user ? (user.name || user.email || user.phone) : 'unknown'}) — ${userSubs.length} subscriptions:`);
    for (const sub of userSubs) {
      console.log(`  id=${sub._id}  endpoint=${sub.subscription.endpoint.slice(0, 60)}...  updatedAt=${sub.updatedAt.toISOString()}`);
    }
    console.log('');
  }

  console.log('Review the list above. If several rows for the same user share the same endpoint prefix (e.g. web.push.apple.com) and were updated within minutes of each other during debugging, those are the stale duplicates — delete the older ones with --delete <id>.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
