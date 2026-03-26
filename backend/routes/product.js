const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// 1. ඔක්කොම ඇඳුම් ටික ගන්න (Get All)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. අලුත් ඇඳුමක් දාන්න (නිවැරදි කරන ලද Add Product Route එක)
router.post("/add", async (req, res) => {
  const { name, price, image, stock, category, inventory } = req.body;

  try {
    // අලුත් Product එකක් නිර්මාණය කිරීම
    const newProduct = new Product({
      name,
      price,
      image,
      category: category || "General", // Category එකක් නැත්නම් General ලෙස ගනී
      inventory: inventory || [],
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(400).json({
      message: "The product entry is incorrect!",
      error: err.message,
    });
  }
});

// 🟢 භාණ්ඩයක් Update කිරීම සඳහා වන Route එක
// 🟢 භාණ්ඩයක් Update කිරීම (Admin Edit)
router.put("/:id", async (req, res) => {
  try {
    const { name, price, image, category, inventory } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          price,
          image,
          category,
          inventory, // සයිස් වයිස් අලුත් ස්ටොක් ප්‍රමාණයන් මෙතනින් සේව් වෙනවා
        },
      },
      {
        returnDocument: "after", // අර Warning එක අයින් කරන්න මේක පාවිච්චි කරනවා
        runValidators: true,
      },
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

    res.json(updatedProduct);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({
      message: "Error updating product!",
      error: err.message,
    });
  }
});

// Product එකක් Delete කිරීම
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Couldn't delete.", error: err.message });
  }
});

// --- ස්ටොක් එක තාවකාලිකව අඩු/වැඩි කිරීමට (Cart Adjustment) ---
router.patch("/:id/adjust-stock", async (req, res) => {
  try {
    const { size, adjustment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const inventoryItem = product.inventory.find((inv) => inv.size === size);
    if (inventoryItem) {
      inventoryItem.quantity += adjustment; // තොගය වැඩි කරයි
      await product.save();
      return res.json({ message: "Stock adjusted successfully" });
    }

    res.status(400).json({ message: "Size not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
