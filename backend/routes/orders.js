const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// --- Email යවන්න ඕනේ විස්තර (Transporter) සකස් කිරීම ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 👈 Gmail App Password එක මෙතනට දාන්න
  },
});

// --- Email එක යවන Function එක ---
const sendOrderEmail = (order, userEmail) => {
  // 🛡️ ආරක්ෂිතව .env එකෙන් විස්තර ලබා ගැනීම
  const senderEmail = process.env.EMAIL_USER;
  const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";

  const mailOptions = {
    // String template එකක් ඇතුළේ ආරක්ෂිතව sender විස්තර සකසමු
    from: `"${storeName}" <${senderEmail}>`,
    to: userEmail,
    subject: `Order Confirmation - ${storeName} #${order._id?.toString().slice(-6)}`, // Subject එකට Order ID එකත් දැම්මා
    html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 1px solid #e5e7eb; padding: 30px; border-radius: 20px; max-width: 600px; margin: auto; color: #374151;">
            <h2 style="color: #2563eb; text-align: center; font-size: 24px;">Thank you for your order!</h2>
            <p style="text-align: center; color: #6b7280;">Hi ${order.customerName}, your order has been successfully placed and is being processed.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 15px; margin-top: 20px;">
                <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Order Summary</h3>
                <ul style="list-style: none; padding: 0;">
                    ${order.items
                      .map(
                        (item) => `
                        <li style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: #111827;">${item.name}</strong> <br/>
                                <span style="font-size: 12px; color: #6b7280;">Size: ${item.size} | Qty: ${item.quantity}</span>
                            </div>
                            <span style="color: #2563eb; font-weight: bold; margin-left: auto;">Rs. ${(item.price * item.quantity).toLocaleString()}.00</span>
                        </li>
                    `,
                      )
                      .join("")}
                </ul>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900;">
                    <span>Total Amount:</span>
                    <span style="color: #111827;">Rs. ${order.totalAmount.toLocaleString()}.00</span>
                </div>
            </div>

            <div style="margin-top: 25px; font-size: 13px; line-height: 1.6;">
                <p><strong>📍 Delivery Address:</strong> ${order.address}</p>
                <p><strong>📞 Contact Number:</strong> ${order.phone}</p>
            </div>

            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #f3f4f6; pt-10;">
                This is an automated email from ${storeName}. Please do not reply to this message.
            </p>
        </div>
    `,
  };

  // Email එක යැවීම
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email Error:", error.message);
    } else {
      console.log("📧 Email Sent Successfully to:", userEmail);
    }
  });
};

// ඕඩර් එකක් සේව් කිරීම (නිවැරදි කරන ලදී - Inventory වලට ගැලපෙන සේ)
router.post("/add", async (req, res) => {
  try {
    const { userId, customerName, items, totalAmount, phone, address } =
      req.body;

    // 1. වලංගුතාවය පරීක්ෂා කිරීම (Validation)
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty!" });
    }

    // --- Stock පරීක්ෂා කිරීම ---
    // Order එක Save කිරීමට පෙර හැම item එකකම අදාළ size එකේ stock තියෙනවද බලනවා
    for (const item of items) {
      const product = await Product.findById(item._id);
      if (!product) {
        return res.status(404).json({ message: `${item.name} not found!` });
      }

      const sizeEntry = product.inventory.find((inv) => inv.size === item.size);

      // සයිස් එක නැතිනම් හෝ අවශ්‍ය ප්‍රමාණයට වඩා තොග අඩු නම්
      if (!sizeEntry || sizeEntry.quantity < item.quantity) {
        return res.status(400).json({
          message: `Sorry, ${product.name} in size ${item.size} is not available in the requested quantity! (Available: ${sizeEntry ? sizeEntry.quantity : 0})`,
        });
      }
    }

    // --- ඕඩර් එක සේව් කිරීම ---
    // userId එක පරීක්ෂා කර Guest User කෙනෙක් නම් null ලෙස සකසනවා
    const orderUserId = userId && userId.length === 24 ? userId : null;

    const newOrder = new Order({
      user: orderUserId,
      customerName: customerName || "Guest User", // customerName නැතිනම් "Guest User" ලෙස default කරන්න
      items: items,
      totalAmount: totalAmount,
      phone: phone,
      address: address,
      status: "Pending",
    });

    const savedOrder = await newOrder.save();

    // --- දැන් විතරක් Stock එකෙන් අඩු කිරීම (Atomically) ---
    // Order එක සාර්ථකව Save වුණොත් පමණක් stock අඩු කරනවා
    for (const item of items) {
      await Product.updateOne(
        { _id: item._id, "inventory.size": item.size },
        { $inc: { "inventory.$.quantity": -item.quantity } }, // item.quantity ප්‍රමාණයම අඩු කරයි
      );
    }

    // --- Email යැවීම (මෙහිදී කෙලින්ම req.body එකෙන් email එක ගනී) ---
    try {
      // 1. මුලින්ම req.body එකෙන් email එක තියෙනවද බලනවා (Destructuring පාවිච්චි කර ඇත)
      let recipientEmail = req.body.email || req.body.customerEmail;

      // 2. යම් හෙයකින් req.body එකේ email එක නැතිනම්, userId එක හරහා DB එකේ පරීක්ෂා කරනවා
      if (!recipientEmail && orderUserId) {
        const customer = await User.findById(orderUserId);
        if (customer && customer.email) {
          recipientEmail = customer.email;
        }
      }

      // 3. දැන් recipientEmail එකක් හමු වුණා නම් පමණක් Email එක යවනවා
      if (recipientEmail) {
        console.log(`📧 Sending email to: ${recipientEmail}`);
        sendOrderEmail(savedOrder, recipientEmail);
      } else {
        // ලොග් වෙලා නැතිනම් සහ req.body එකේ email එකත් නැතිනම් මේ පණිවිඩය පෙන්වයි
        console.warn(
          "⚠️ No recipient email found in request or Database. Skipping email step.",
        );
      }
    } catch (emailErr) {
      console.error("❌ Email Sending Logic Error:", emailErr.message);
    }

    // සාර්ථක පණිවිඩය යැවීම
    res
      .status(201)
      .json({ message: "The order is successful!", order: savedOrder });
  } catch (err) {
    console.error("Order Route Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// 🟢 Update Product Route
router.put("/:id", async (req, res) => {
  const { name, price, image, category, inventory } = req.body;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, image, category, inventory },
      { new: true },
    );
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: "Update Error" });
  }
});

// සියලුම ඕඩර් ලබාගැනීම
router.get("/all", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// ලොග් වෙලා ඉන්න පාරිභෝගිකයාට අදාළ ඕඩර් විතරක් ලබා ගැනීම
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user orders" });
  }
});

// ඕඩර් එකක් ඩිලීට් කිරීම
router.delete("/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete error" });
  }
});

// ඕඩර් ස්ටේටස් වෙනස් කිරීම
router.patch("/:id/status", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true },
    );
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Status update error" });
  }
});

module.exports = router;

