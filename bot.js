const { ETwitterStreamEvent, TwitterApi } = require("twitter-api-v2");
const axios = require("axios");
const FormData = require("form-data");
const config = require("./config");

const client = new TwitterApi(config);

const summarizeArticle = async (url) => {
  const formdata = new FormData();
  formdata.append("key", "MEANING_CLOUD_API_KEY");
  formdata.append("url", url);
  formdata.append("sentences", "2");

  const res = await axios({
    method: "post",
    url: "https://api.meaningcloud.com/summarization-1.0",
    data: formdata,
  });
  return res.data.summary;
};

const streamTweets = async (tweetsFrom) => {
  try {
    // const stream = await client.v1.filterStream({
    //   track: tweetsFrom,
    // });

    const stream = await client.v2.searchStream({});
    stream.autoReconnect = true;

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      const senderName = tweet.user.screen_name;
      const senderTweetId = tweet.id_str;
      const senderMessage = tweet.full_text;
      console.log(
        `New mention from @${senderName} 🔔\nThey said: ${senderMessage}`
      );

      // get original tweet
      const ogTweetId = tweet.in_reply_to_status_id_str;
      const ogTweet = await client.v1.singleTweet(ogTweetId);
      //   console.log(ogTweet);
      // check if original tweet contains a url
      if (ogTweet.entities.urls && ogTweet.entities.urls.length > 0) {
        let articleLink = ogTweet.entities.urls[0].expanded_url;
        let articleSummary = await summarizeArticle(articleLink);
        if (articleSummary) {
          // reply user
          const response = await client.v1.reply(
            `$@${senderName}\n${articleSummary}`,
            senderTweetId
          );
        }
      }
    });
  } catch (error) {
    console.log(error);
    // console.log(`Error code: ${error.code}\nError: ${error.error}`);

    setTimeout(() => {
      streamTweets(tweetsFrom);
    }, 1000 * 60 * 15);
  }
};

streamTweets("@summarizebot_");
