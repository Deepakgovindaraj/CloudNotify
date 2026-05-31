import nodemailer from "nodemailer";

export const handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event;


    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
 
    const info = await transporter.sendMail({
      from: '"CloudNotify" <cloudnotify.apps@gmail.com>',
      to: body.email,
      subject: body.title,
      html: `
        <h2>${body.title}</h2>
        <p>${body.message}</p>
      `
    });
   
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email sent successfully",
        messageId: info.messageId
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