
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const API_TOKEN = process.env.BOT_API_TOKEN;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!KEY_ID || !KEY_SECRET || !API_TOKEN || !WEBHOOK_SECRET) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET
});

app.get("/", (req, res) => {
  res.send("Razorpay server is running!");
});

app.post("/create-payment-link", async (req, res) => {
  try {
    if (req.headers["x-api-token"] !== API_TOKEN) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const amount = Number(req.body.amount);
    const userId = String(req.body.user_id || "");

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 100000 ||
      !/^\d+$/.test(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount or user ID"
      });
    }

    const referenceId =
      "tg_" + userId + "_" + crypto.randomUUID();

    const link = await razorpay.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      accept_partial: false,
      description: "Telegram bot wallet deposit",
      reference_id: referenceId,
      notes: {
        telegram_user_id: userId
      },
      expire_by: Math.floor(Date.now() / 1000) + 1800
    });

    res.json({
      success: true,
      reference_id: referenceId,
      payment_link_id: link.id,
      payment_link: link.short_url,
      amount: amount,
      currency: "INR"
    });
  } catch (error) {
    console.error("Payment link error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not create payment link"
    });
  }
});

app.post(
  "/razorpay-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).send("Invalid webhook");
    }

    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    const received = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (
      received.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(received, expectedBuffer)
    ) {
      return res.status(400).send("Invalid signature");
    }

    let event;

    try {
      event = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).send("Invalid JSON");
    }

    if (event.event === "payment_link.paid") {
      const paymentLink = event.payload?.payment_link?.entity;
      const payment = event.payload?.payment?.entity;

      if (
        paymentLink &&
        payment &&
        paymentLink.status === "paid" &&
        payment.status === "captured" &&
        payment.currency === "INR" &&
        paymentLink.amount === payment.amount
      ) {
        console.log("Verified payment received:", {
          payment_id: payment.id,
          reference_id: paymentLink.reference_id,
          user_id: paymentLink.notes?.telegram_user_id,
          amount_paise: payment.amount
        });

        // IMPORTANT:
        // Wallet crediting is not implemented yet.
        // Add secure database storage and duplicate-payment
        // protection before crediting a user's balance.
      }
    }

    return res.status(200).send("OK");
  }
);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
    
