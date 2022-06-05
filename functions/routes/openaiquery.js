const express = require("express");
const { app } = require("firebase-admin");
const router = express.Router();
const admin = require("firebase-admin");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "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",
});

async function contentFilter(query) {
  //This needs to be improved to include the full probability calculation as seen in the documentation https://beta.openai.com/docs/engines/content-filter
  const response = await openai
    .createCompletion("content-filter-alpha", {
      prompt: "<|endoftext|>" + query + "\n--\nLabel:",
      temperature: 0,
      max_tokens: 1,
      top_p: 0,
      logprobs: 10,
    })
    .then(function (response) {
      return response;
    })
    .catch(function (error) {
      console.log(error);
    });
  const result = response.data.choices[0].text;
  console.log(
    "filter response below (0 = fine, 1 = borderline heretical or potentialy heretical topic, 2 = probable heretical language)"
  );
  console.log(result);
  const output = result == 2 ? false : true;
  console.log(
    "below true if result of analysis determines a lack of outright heretical content"
  );
  console.log(output);
  return output;
}

async function OpenAiQuery(ParsedBody) {
  const response = await openai.createCompletion("text-davinci-001", {
    prompt: JSON.stringify(ParsedBody),
    temperature: 0.7,
    max_tokens: 800,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  console.log("responded text from openAI below");
  console.log(response.data.choices[0].text);

  return {
    statusCode: 200,
    body: JSON.stringify(response.data.choices[0].text),
  };
}

const openai = new OpenAIApi(configuration);
//check if the user is subscribed to the service
router.use(async (req, res, next) => {
  (await admin
    .firestore()
    .collection("users")
    .doc(req.user.uid)
    .get()
    .then((doc) => {
      return doc.data().subscriptionActive;
    }))
    ? next()
    : res
        .status(403)
        .send(
          "No active subscription found, if you think this is an error please contact us"
        );
});
//openai query
router.post("/", async (req, res) => {
  let ParsedBody = req.body.query;
  let OpenAiResponse = await OpenAiQuery(ParsedBody);
  let isNotHeretical = await contentFilter(ParsedBody);

  Promise.all([OpenAiResponse, isNotHeretical]).then(function (values) {
    OpenAiResponse = values[0];
    isNotHeretical = values[1];
  });

  //increment tokens used
  admin
    .firestore()
    .collection("users")
    .doc(req.user.uid)
    .update({
      tokensUsed: admin.firestore.FieldValue.increment(1),
    });
  //sanitize response
  let sanitizedResponse = OpenAiResponse.body.replace(/\n/g, " ");
  res.send(sanitizedResponse);
});

module.exports = router;
