const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: "General" },
  image: { type: String, required: true },
  inventory: [
    {
      size: { type: String, required: true },
      quantity: { type: Number, default: 0 },
    },
  ],
});

module.exports = mongoose.model("Product", productSchema);
