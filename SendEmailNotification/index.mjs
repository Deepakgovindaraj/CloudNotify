import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import axios from "axios";
import nodemailer from "nodemailer";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Notifications";
const USER_CHANNELS_TABLE = "UserChannels";

async function getTelegramChatId(email) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USER_CHANNELS_TABLE,
        Key: {
          email: email
        }
      })
    );

    console.log(
      "DynamoDB UserChannels Result:",
      JSON.stringify(result)
    );

    return result.Item?.telegramChatId || null;
  } catch (error) {
    console.error("Error fetching Telegram Chat ID:", error);
    return null;
  }
}

async function sendTelegramMessage(chatId, title, message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text: `🔔 CloudNotify

${title}

${message}`
    }
  );

  console.log(
    "Telegram API Response:",
    JSON.stringify(response.data)
  );

  return response.data;
}

export const handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event;

    const channel = body.channel?.toLowerCase();

    console.log("=================================");
    console.log("Notification ID:", body.notificationId);
    console.log("Notification Email:", body.email);
    console.log("Channel:", channel);
    console.log("=================================");

    const chatId = await getTelegramChatId(body.email);

    console.log("=================================");
    console.log("Retrieved Chat ID:", chatId);
    console.log(
      "Telegram Condition:",
      (channel === "telegram" || channel === "both") &&
        !!chatId
    );
    console.log("=================================");

    // TELEGRAM
    if (
      (channel === "telegram" ||
        channel === "both") &&
      chatId
    ) {
      console.log(
        `Sending Telegram message to Chat ID: ${chatId}`
      );

      await sendTelegramMessage(
        chatId,
        body.title,
        body.message
      );
    }

    // GMAIL
    let info = null;

    if (
      channel === "gmail" ||
      channel === "both"
    ) {
      console.log(
        `Sending Gmail to: ${body.email}`
      );

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      info = await transporter.sendMail({
        from: '"CloudNotify" <cloudnotify.apps@gmail.com>',
        to: body.email,
        subject: body.title,
        html: `
          <h2>${body.title}</h2>
          <p>${body.message}</p>
        `
      });

      console.log(
        "Gmail sent successfully:",
        info.messageId
      );
    }

    // UPDATE STATUS
    if (body.notificationId) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            notificationId: body.notificationId
          },
          UpdateExpression:
            "SET #status = :status",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": "SENT"
          }
        })
      );

      console.log(
        "Notification status updated to SENT"
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message:
          "Notification sent successfully",
        messageId:
          info?.messageId || null,
        status: "SENT"
      })
    };
  } catch (error) {
    console.error(
      "SEND EMAIL NOTIFICATION ERROR:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};