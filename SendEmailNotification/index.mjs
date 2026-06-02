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
  const result = await docClient.send(
    new GetCommand({
      TableName: USER_CHANNELS_TABLE,
      Key: {
        email: email
      }
    })
  );

  return result.Item?.telegramChatId;
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

  console.log("Telegram API Response:", response.data);

  return response.data;
}

export const handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event;

    const channel = body.channel?.toLowerCase();

    console.log("Channel:", channel);
    console.log("Email:", body.email);

    const chatId = await getTelegramChatId(body.email);

    console.log("Chat ID:", chatId);

    console.log(
      "Telegram Condition:",
      (channel === "telegram" || channel === "both") &&
        !!chatId
    );

    // TELEGRAM
    if (
      (channel === "telegram" ||
        channel === "both") &&
      chatId
    ) {
      console.log("Sending Telegram message...");

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
      console.log("Sending Gmail...");

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

      console.log("Gmail sent:", info.messageId);
    }

    if (body.notificationId) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            notificationId: body.notificationId
          },
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": "SENT"
          }
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Notification sent successfully",
        messageId: info?.messageId || null,
        status: "SENT"
      })
    };
  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};