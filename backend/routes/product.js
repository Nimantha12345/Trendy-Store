const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// 1. සියලුම නිෂ්පාදන ලබා ගැනීම (Get All Products)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }); // අලුත්ම ඒවා උඩට එන්න sort කළා
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. අලුත් නිෂ්පාදනයක් එකතු කිරීම (Add Product)
router.post("/add", async (req, res) => {
  const { name, price, image, category, inventory } = req.body;
  try {
    const newProduct = new Product({
      name,
      price,
      image,
      category: category || "General",
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

// 3. නිෂ්පාදනයක් යාවත්කාලීන කිරීම (Update Product - Admin Edit)
router.put("/:id", async (req, res) => {
  try {
    const { name, price, image, category, inventory } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: { name, price, image, category, inventory },
      },
      {
        new: true, // අලුත් දත්ත ටික ආපසු ලබා ගන්න
        runValidators: true,
      }
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

// 4. නිෂ්පාදනයක් ඉවත් කිරීම (Delete Product)
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }
    res.json({ message: "Product deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Couldn't delete.", error: err.message });
  }
});

// 5. ස්ටොක් එක වඩාත් ආරක්ෂිතව වෙනස් කිරීම (Atomic Stock Adjustment)
router.patch("/:id/adjust-stock", async (req, res) => {
  try {
    const { size, adjustment } = req.body; // adjustment කියන්නේ +5 හෝ -2 වගේ අගයක්

    // $inc පාවිච්චි කිරීමෙන් එකම වෙලාවේ කීප දෙනෙක් ඕඩර් කළත් ස්ටොක් එක හරියටම අඩු/වැඩි වෙනවා
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, "inventory.size": size },
      { $inc: { "inventory.$.quantity": adjustment } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product or size not found!" });
    }

    res.json({ message: "Stock adjusted successfully", updatedProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;