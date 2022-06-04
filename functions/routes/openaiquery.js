const express = require("express");
const router = express.Router();
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
  console.log("OpenAI Response output in full");
  console.log(response);

  return {
    statusCode: 200,
    body: JSON.stringify(response.data.choices[0].text),
  };
}

const openai = new OpenAIApi(configuration);
//openai query
router.post("/", async (req, res) => {
  let ParsedBody = req.body.query;
  //sends prompt to GPT-3 API and returns the response
  let OpenAiResponse = await OpenAiQuery(ParsedBody);
  //using openai to determine if prompt has heretical content, if so refuses request
  let isNotHeretical = await contentFilter(ParsedBody);

  //Should hopefully speed up program since this is a lengthy call, despite the fact this
  //doesnt look like something that should be laid out this way as idealy calling the proper
  //API should come after calling the content filter I am going to do it this way anyway as performance
  //is terrible right now
  Promise.all([OpenAiResponse, isNotHeretical]).then(function (values) {
    OpenAiResponse = values[0];
    isNotHeretical = values[1];
  });

  console.log(
    "boolean values of the checks below, Authorization and isNotHeretical in that order"
  );

  console.log(isNotHeretical);

  res.send(OpenAiResponse);
});

module.exports = router;
