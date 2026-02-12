const Parser = require('rss-parser');
const Headline = require('../models/Headline');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent']
    ]
  }
});

const RSS_FEED_URL = 'https://newsable.asianetnews.com/rss/special';

/**
 * Fetch RSS feed and parse items
 */
async function fetchRSSFeed() {
  try {
    console.log('🔄 Fetching RSS feed from:', RSS_FEED_URL);
    const feed = await parser.parseURL(RSS_FEED_URL);
    console.log(`✅ Fetched ${feed.items.length} items from RSS feed`);
    return feed;
  } catch (error) {
    console.error('❌ Error fetching RSS feed:', error);
    throw error;
  }
}

/**
 * Extract image URL from media content or content encoded
 */
function extractImageUrl(item) {
  // Try media:content first
  if (item.mediaContent && item.mediaContent.$) {
    return item.mediaContent.$.url;
  }

  // Try to extract from content:encoded
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) {
      return imgMatch[1];
    }
  }

  // Try from description
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) {
      return imgMatch[1];
    }
  }

  return null;
}

/**
 * Save RSS items to MongoDB
 */
async function saveHeadlinesToDB(feed) {
  const savedCount = {
    new: 0,
    existing: 0,
    errors: 0
  };

  for (const item of feed.items) {
    try {
      // Check if headline already exists
      const existing = await Headline.findOne({ guid: item.guid });

      if (existing) {
        savedCount.existing++;
        continue;
      }

      // Create new headline document
      const headline = new Headline({
        title: item.title,
        link: item.link,
        description: item.contentSnippet || item.description || '',
        content: item.contentEncoded || item.content || '',
        category: item.categories && item.categories.length > 0 ? item.categories[0] : 'General',
        creator: item.creator || 'Unknown',
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        guid: item.guid,
        imageUrl: extractImageUrl(item),
        isoDate: item.isoDate ? new Date(item.isoDate) : new Date()
      });

      await headline.save();
      savedCount.new++;
    } catch (error) {
      console.error(`Error saving headline: ${item.title}`, error.message);
      savedCount.errors++;
    }
  }

  return savedCount;
}

/**
 * Fetch RSS and update database
 */
async function fetchAndStoreHeadlines() {
  try {
    const feed = await fetchRSSFeed();
    const result = await saveHeadlinesToDB(feed);

    console.log('📊 RSS Import Summary:');
    console.log(`   - New headlines: ${result.new}`);
    console.log(`   - Already existing: ${result.existing}`);
    console.log(`   - Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error('❌ Error in fetchAndStoreHeadlines:', error);
    throw error;
  }
}

module.exports = {
  fetchRSSFeed,
  saveHeadlinesToDB,
  fetchAndStoreHeadlines,
  RSS_FEED_URL
};
