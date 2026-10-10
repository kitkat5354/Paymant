// ======================================
// RAZORPAY PAYMENT LINK GENERATOR
// BOTS.BUSINESS /set_amount
// ======================================

try {
  // YOUR NODE.JS BACKEND URL
  var SERVER_URL = "https://YOUR-SERVER.onrender.com";

  // SAME TOKEN AS YOUR NODE.JS BACKEND
  var API_TOKEN = "YOUR_BOT_API_TOKEN";

  // GET AMOUNT
  var amount = Number(String(message || "").trim());

  // VALIDATE AMOUNT
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 100000
  ) {
    Api.sendMessage({
      chat_id: chat.chatid,
      text:
        "⚠️ <b>INVALID AMOUNT</b>\n\n" +
        "Minimum Deposit: ₹1\n" +
        "Maximum Deposit: ₹100000\n\n" +
        "Please enter a valid whole number.",
      parse_mode: "HTML"
    });
    return;
  }

  // SAVE AMOUNT
  User.setProperty("pay_amount", amount, "integer");

  // USER ID
  var uid = String(user.telegramid);

  // SEND REQUEST TO NODE.JS BACKEND
  HTTP.post({
    url: SERVER_URL + "/create-payment-link",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": API_TOKEN
    },
    body: {
      amount: amount,
      user_id: uid
    },
    success: "/razorpay_link_success",
    error: "/razorpay_link_error"
  });

  Api.sendMessage({
    chat_id: chat.chatid,
    text:
      "⏳ <b>CREATING PAYMENT LINK</b>\n\n" +
      "💰 Amount: ₹" + amount + "\n\n" +
      "Please wait...",
    parse_mode: "HTML"
  });

} catch (error) {
  Api.sendMessage({
    chat_id: chat.chatid,
    text:
      "❌ <b>PAYMENT LINK ERROR</b>\n\n" +
      "Please try again later.",
    parse_mode: "HTML"
  });
}
