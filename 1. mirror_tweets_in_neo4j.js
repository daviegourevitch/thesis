import * as neo4j from 'neo4j-driver'
import needle from 'needle';
import credentials from './credentials/Twitter.js';

// Globals
const TOKEN = credentials.auth_tokens.BEARER_TOKEN;
const GET_ENDPOINT = "https://api.twitter.com/2/tweets";
const SEARCH_RECENT_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

// https://twitter.com/briantylercohen/status/1369403905956847618 <- use this!!!!
// ^ try this one

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////  MAIN  //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Startup database
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', "password"))
const session = driver.session()


const rootTweetId = "1372316893739163652";
const rootTweet = await addTweetThreadToDb(rootTweetId);

// Close database
await driver.close()

////////////////////////////////////////////////////////////////////////////////
//////////////////////////// ENDPOINT FUNCTIONS  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////

async function get(endpointURL, params) {
    const res = await needle('get', endpointURL, params, { headers: {
        "authorization": `Bearer ${TOKEN}`
    }})

    if (res.body) {
        const ret = {
          body: res.body,
          headers: res.headers
        }
        return ret;
    } else {
        throw new Error('Unsuccessful request')
    }
}

async function getTweet(id) {
  if (id == null) throw new Error ("ID not specified in getTweets");
  const params = {
    "ids": id,
    "tweet.fields": "author_id,conversation_id,created_at,entities,lang,referenced_tweets,text",
  }
  return await get(GET_ENDPOINT, params);
}

async function recentSearch(conversation_id, next_token) {
  if (conversation_id == null) throw new Error ("ID not specified in recentSearch");
  const params = {
    "query":`conversation_id:${conversation_id}`,
    "max_results": 100,
    "tweet.fields": "author_id,conversation_id,created_at,entities,lang,referenced_tweets,text",
  }
  if(next_token) {params.next_token = next_token}

  return await get(SEARCH_RECENT_ENDPOINT, params);
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////// RETRIEVAL FUNCTIONS  //////////////////////////////
////////////////////////////////////////////////////////////////////////////////

async function addTweetThreadToDb(id) {
  // Get first page
  const conversation_id = (await getTweet(id)).body.data[0].conversation_id;
  var page = await recentSearch(conversation_id);

  for(const tweet in page.body.data) {
    await addTweetToDatabase(page.body.data[tweet]);
  }

  // If more pages...
  while(page.body.meta.next_token) {
    var page = await recentSearch(id, page.body.meta.next_token);

    for(const tweet in page.body.data) {
      await addTweetToDatabase(page.body.data[tweet]);
    }

    if(page.headers["x-rate-limit-remaining"] <= 0) {
      console.log("I'm rate limited... Pausing execution for " + page.headers["x-rate-limit-reset"] + " seconds.")
      await sleep(page.headers["x-rate-limit-remaining"]*1000)
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////// DATABASE FUNCTIONS  ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////
async function addTweetToDatabase(tweet) {
  var query = "MERGE (author:Person {author_id:$author_id}) MERGE (tweet:Tweet {id:$id, text:$text, lang:$lang, created_at:$created_at}) MERGE (conversation:Conversation {id:$conv_id}) MERGE (author) - [:Authored] -> (tweet) MERGE (tweet) - [:In_Conversation] -> (conversation)";

  try {
    const result = await session
      .run(query, {
        author_id: neo4j.int(tweet.author_id),
        id: neo4j.int(tweet.id),
        text: tweet.text,
        conv_id: neo4j.int(tweet.conversation_id),
        lang: tweet.lang,
        created_at: tweet.created_at,
        text: tweet.text,
      });
  } catch (err) {
    console.log("There was an error in addTweetToDatabase")
    console.log("I was trying to add the following tweet:")
    console.log(tweet)
    console.log(err)
  }

  for(const referenced in tweet.referenced_tweets) {
    try {
      const result = await session.run("MERGE (tweet:Tweet {id:$id}) MERGE (ref:Tweet {id:$rid}) MERGE (tweet) - [:References {type:$refType}] -> (ref)", {
        id: neo4j.int(tweet.id),
        rid: neo4j.int(tweet.referenced_tweets[referenced].id),
        refType: tweet.referenced_tweets[referenced].type
      }
    )
    } catch(err) {
      console.log("There was an error while adding a referenced tweet")
      console.log(err)
    }
  }
}
