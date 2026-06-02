import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "UserChannels";

export const handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event;

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          email: body.email,
          telegramChatId: body.telegramChatId,
          telegramConnected: true,
          telegramUsername: body.telegramUsername || ""
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Telegram connection saved"
      })
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};