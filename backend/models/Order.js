const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // user ID එක නැති වුණත් (Guest) ඕඩර් එක සේව් වෙන්න required: false දමා ඇත
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // පාරිභෝගිකයාගේ නම සේව් කිරීමට මෙම පේළිය අනිවාර්යයෙන්ම අවශ්‍යයි 👈
    customerName: { type: String, default: "Guest User" },

    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: String,
        size: { type: String, default: "N/A" },
        quantity: { type: Number, default: 1 },
      },
    ],
    totalAmount: { type: Number, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
