const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const sendEmail = require('../utils/sendEmail'); // 👈 අලුත් Utility එක

// --- 1. Order එකක් දාපු ගමන් Email එක යවන Function එක ---
const sendOrderEmail = async (order, userEmail) => {
  try {
    const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";

    // ඊමේල් එකේ අන්තර්ගතය (HTML)
    const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border: 1px solid #e5e7eb; padding: 30px; border-radius: 20px; max-width: 600px; margin: auto; color: #374151;">
            <h2 style="color: #2563eb; text-align: center; font-size: 24px;">Thank you for your order!</h2>
            <p style="text-align: center; color: #6b7280;">Hi ${order.customerName}, your order has been successfully placed.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 15px; margin-top: 20px;">
                <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Order Summary</h3>
                <ul style="list-style: none; padding: 0;">
                    ${order.items.map(item => `
                        <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                            <div>
                                <strong style="color: #111827;">${item.name}</strong> <br/>
                                <span style="font-size: 12px; color: #6b7280;">Size: ${item.size} | Qty: ${item.quantity}</span>
                            </div>
                            <span style="color: #2563eb; font-weight: bold; float: right;">Rs. ${(item.price * item.quantity).toLocaleString()}.00</span>
                            <div style="clear: both;"></div>
                        </li>
                    `).join("")}
                </ul>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;" />
                <div style="text-align: right; font-size: 18px; font-weight: 900;">
                    <span>Total: Rs. ${order.totalAmount.toLocaleString()}.00</span>
                </div>
            </div>

            <div style="margin-top: 25px; font-size: 13px; line-height: 1.6;">
                <p><strong>📍 Delivery Address:</strong> ${order.address}</p>
                <p><strong>📞 Contact:</strong> ${order.phone}</p>
            </div>

            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 30px;">
                This is an automated email from ${storeName}.
            </p>
        </div>
    `;

    // 📧 ඊමේල් එක යැවීම
    await sendEmail({
      email: userEmail,
      subject: `Order Confirmation - ${storeName} #${order._id.toString().slice(-6)}`,
      message: emailHtml
    });

    console.log("📧 Order confirmation email sent to:", userEmail);
  } catch (error) {
    console.error("❌ Order Email Error:", error.message);
  }
};

// --- 2. ඕඩර් එකක් සේව් කිරීම (Add Order) ---
router.post("/add", async (req, res) => {
  try {
    const { userId, customerName, items, totalAmount, phone, address, email } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty!" });
    }

    // Stock පරීක්ෂා කිරීම
    for (const item of items) {
      const product = await Product.findById(item._id);
      if (!product) return res.status(404).json({ message: `${item.name} not found!` });

      const sizeEntry = product.inventory.find((inv) => inv.size === item.size);
      if (!sizeEntry || sizeEntry.quantity < item.quantity) {
        return res.status(400).json({
          message: `Sorry, ${product.name} (${item.size}) is out of stock!`,
        });
      }
    }

    const orderUserId = userId && userId.length === 24 ? userId : null;

    const newOrder = new Order({
      user: orderUserId,
      customerName: customerName || "Guest User",
      items,
      totalAmount,
      phone,
      address,
      status: "Pending",
    });

    const savedOrder = await newOrder.save();

    // Stock එකෙන් අඩු කිරීම
    for (const item of items) {
      await Product.updateOne(
        { _id: item._id, "inventory.size": item.size },
        { $inc: { "inventory.$.quantity": -item.quantity } }
      );
    }

    // 📧 Email එක යැවීමේ කොටස
    let recipientEmail = email || req.body.customerEmail;
    
    if (!recipientEmail && orderUserId) {
      const customer = await User.findById(orderUserId);
      if (customer) recipientEmail = customer.email;
    }

    if (recipientEmail) {
      sendOrderEmail(savedOrder, recipientEmail); // මේක background එකේ වෙන්න දෙන්න (no await for faster response)
    }

    res.status(201).json({ message: "The order is successful!", order: savedOrder });
  } catch (err) {
    console.error("Order Route Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// --- 3. අනෙකුත් Routes (Get, Update, Delete) ---

// සියලුම ඕඩර් ලබාගැනීම
router.get("/all", async (req, res) => {
  try {
    const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// පාරිභෝගිකයාට අදාළ ඕඩර් ලබා ගැනීම
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId }).sort({ createdAt: -1 });
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
      { new: true }
    );
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Status update error" });
  }
});

module.exports = router;