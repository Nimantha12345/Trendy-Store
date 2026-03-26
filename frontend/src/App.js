import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";

function App() {
  // --- 1. States ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [allOrders, setAllOrders] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const navigate = useNavigate();
  const [selectedSizes, setSelectedSizes] = useState({});

  // --- OTP States ---
  const [regStep, setRegStep] = useState(1);
  const [otp, setOtp] = useState("");

  // 🔍 Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Customer Shipping States
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Admin Input States
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  // --- Size Logic ---
  const [inventoryData, setInventoryData] = useState({});
  const availableSizes = ["S", "M", "L", "XL", "XXL"];

  // Side Menu එක විවෘත කිරීමට සහ වසා දැමීමට
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [userOrders, setUserOrders] = useState([]);
  // පාරිභෝගිකයාගේ ඇණවුම් ලැයිස්තුව තබා ගැනීමට
  /*const [userOrders, setUserOrders] = useState(() => {
    // LocalStorage එකේ 'my_orders' නමින් දත්ත තියෙනවාද බලනවා
    const savedOrders = localStorage.getItem("my_orders");
    // තියෙනවා නම් ඒවා පෙන්වනවා, නැත්නම් හිස් list එකක් දෙනවා
    return savedOrders ? JSON.parse(savedOrders) : [];
  });*/

  // --- 2. Effects ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProducts();
      if (user.isAdmin) {
        fetchOrders();
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchMyOrders = async () => {
      // පරිශීලකයා ලොග් වෙලා ඉන්නවා නම් සහ ඇඩ්මින් කෙනෙක් නෙමෙයි නම් විතරක් ඕඩර් ගේනවා
      if (user && user._id && !user.isAdmin) {
        try {
          const res = await axios.get(
            `https://trendy-store.onrender.com/api/orders/user/${user._id}`,
          );
          setUserOrders(res.data);
        } catch (err) {
          console.error("Orders load error:", err);
        }
      } else {
        setUserOrders([]); // ලොග් අවුට් වුණාම ලිස්ට් එක හිස් කරනවා
      }
    };
    fetchMyOrders();
  }, [user]);

  // --- 3. Helper Functions ---
  const fetchProducts = () => {
    axios
      .get("https://trendy-store.onrender.com/api/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.log("Error fetching products:", err));
  };

  const fetchOrders = () => {
    axios
      .get("https://trendy-store.onrender.com/api/orders/all")
      .then((res) => setAllOrders(res.data))
      .catch((err) => console.log("Error fetching orders:", err));
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`https://trendy-store.onrender.com/api/orders/${id}/status`, {
        status: newStatus,
      });
      fetchOrders();
    } catch (err) {
      alert("Unable to update status.");
    }
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await axios.delete(`https://trendy-store.onrender.com/api/orders/${id}`);
        fetchOrders();
      } catch (err) {
        alert("Unable to delete order.");
      }
    }
  };

  // --- 4. Event Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint =
      authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await axios.post(
        `https://trendy-store.onrender.com${endpoint}`,
        formData,
      );
      if (authMode === "login") {
        setUser(res.data.user);
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        alert(`Welcome ${res.data.user.name}!`);
        navigate("/");
      } else {
        alert(
          res.data.message || "An OTP has been sent to your email address!",
        );
        setRegStep(2);
      }
    } catch (err) {
      if (err.response?.data?.notVerified) {
        alert("Please verify your email address first!");
        setRegStep(2);
      } else {
        alert(
          err.response?.data?.message ||
            "The details are incorrect, please try again.",
        );
      }
    }
  };

  // OTP තහවුරු කිරීමේ Function එක
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("https://trendy-store.onrender.com/api/auth/verify", {
        email: formData.email,
        otp,
      });
      alert(res.data.message);
      setAuthMode("login");
      setRegStep(1);
      navigate("/");
    } catch (err) {
      alert(err.response?.data || "Incorrect OTP code!");
    }
  };

  const handleResendOTP = async () => {
    try {
      const res = await axios.post(
        "https://trendy-store.onrender.com/api/auth/resend-otp",
        {
          email: formData.email,
        },
      );
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || "Could not resend OTP.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCart([]);
    setAllOrders([]);
    alert("Successfully logged out!");
    navigate("/");
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setImage("");
    setInventoryData({});
  };

  const addProduct = (e) => {
    e.preventDefault();

    // inventoryData ({S: 10, M: 5}) එක backend එකට අවශ්‍ය Array format එකට හරවනවා
    const finalInventory = Object.keys(inventoryData).map((size) => ({
      size: size,
      quantity: Number(inventoryData[size] || 0),
    }));

    // අඩුම තරමේ එක සයිස් එකකටවත් stock දීලා තියෙනවද කියලා බලන පොඩි check එකක්
    const totalStock = finalInventory.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    if (totalStock <= 0) {
      return alert("Please include stock for at least one size!");
    }

    // යවන Object එක (මෙහි stock/sizes වෙනුවට inventory පාවිච්චි වේ)
    const newProduct = {
      name,
      price: Number(price),
      image,
      inventory: finalInventory,
    };

    console.log("Adding Product with inventory:", newProduct);

    axios
      .post("https://trendy-store.onrender.com/api/products/add", newProduct)
      .then(() => {
        alert("Product Added Successfully!");

        // 4. Form එක Reset කිරීම
        setName("");
        setPrice("");
        setImage("");
        setInventoryData({});
        fetchProducts();
      })
      .catch((err) => {
        console.error("Full Error:", err.response?.data);
        alert(
          "Error adding product: " +
            (err.response?.data?.message || "Check Backend"),
        );
      });
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price);
    setImage(product.image);

    // Product එකේ තියෙන inventory array එක object එකක් කරලා state එකට දානවා
    const oldInventory = {};
    if (product.inventory) {
      product.inventory.forEach((item) => {
        oldInventory[item.size] = item.quantity;
      });
    }
    setInventoryData(oldInventory);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateProduct = (e) => {
    e.preventDefault();

    // 1. inventoryData ({S: 10, M: 5}) එක backend එකට අවශ්‍ය Array format එකට හරවනවා
    const finalInventory = Object.keys(inventoryData).map((size) => ({
      size: size,
      quantity: Number(inventoryData[size] || 0),
    }));

    // 2. යවන දත්ත Object එක (මෙහි stock/sizes වෙනුවට inventory භාවිතා කළ යුතුයි)
    const updatedData = {
      name,
      price: Number(price),
      image,
      inventory: finalInventory, // Backend එකේ Schema එකට ගැලපෙන නම 'inventory'
    };

    axios
      .put(
        `https://trendy-store.onrender.com/api/products/${editingProduct._id}`,
        updatedData,
      )
      .then(() => {
        alert("Product Updated Successfully!");

        // 3. Form එක සහ States Reset කිරීම
        setEditingProduct(null);
        setName("");
        setPrice("");
        setImage("");
        setInventoryData({}); // Inventory state එක හිස් කරනවා
        fetchProducts(); // අලුත් දත්ත ටික නැවත load කරනවා
      })
      .catch((err) => {
        console.log("Full Error Object:", err);
        alert("Error: " + (err.response?.data?.message || "Update failed."));
      });
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`https://trendy-store.onrender.com/api/products/${id}`);
        alert("Product deleted successfully!");
        fetchProducts();
      } catch (err) {
        alert("Failed to delete product.");
      }
    }
  };

  // --- Add to Cart (දැන් ඉතා සරලයි) ---
  const addToCart = (product, selectedSize) => {
    if (!selectedSize) return alert("Please select a Size!");

    const cartItem = {
      cartId: Date.now() + Math.random(),
      _id: product._id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      quantity: 1, // දැනට එක බැගින් ඇඩ් වෙන්න
      image: product.image,
    };

    setCart([...cart, cartItem]);
    alert(`${product.name} Added to cart!`);
  };

  // --- Remove from Cart (දැන් ඉතා සරලයි) ---
  const removeFromCart = (item) => {
    setCart(cart.filter((cartItem) => cartItem.cartId !== item.cartId));
  };

  const getGroupedItems = (items) => {
    if (!items) return [];
    const grouped = {};
    items.forEach((item) => {
      const key = `${item._id}-${item.size}`;
      if (grouped[key]) {
        grouped[key].quantity += 1;
      } else {
        grouped[key] = { ...item, quantity: 1 };
      }
    });
    return Object.values(grouped);
  };

  const handleCheckout = async () => {
    // ✅ 'async' අනිවාර්යයි
    if (cart.length === 0) return alert("Your cart is empty!");
    if (!phone || !address)
      return alert("Please enter your phone number and address!");

    const finalTotal = cart.reduce(
      (total, item) => total + Number(item.price) * (item.quantity || 1),
      0,
    );

    const orderData = {
      userId: user?._id || null,
      customerName: user?.name || "Guest User",
      customerEmail: user?.email || null,
      items: cart,
      totalAmount: finalTotal,
      phone: phone,
      address: address,
    };

    try {
      console.log("යවන දත්ත (Order Data):", orderData);
      // Backend එකට ඕඩර් එක යැවීම
      const res = await axios.post(
        "https://trendy-store.onrender.com/api/orders/add",
        orderData,
      );

      // සාර්ථක නම් දත්ත ලබා ගැනීම:
      const newOrder = res.data.order || res.data;
      setUserOrders([newOrder, ...userOrders]);

      // 1. දැනට තියෙන පරණ ඕඩර් ලැයිස්තුවට අලුත් එක එකතු කරමු
      const updatedOrders = [newOrder, ...userOrders];

      // 2. State එක update කරමු (පේජ් එකේ පෙන්වන්න)
      setLastOrder(newOrder);
      setUserOrders(updatedOrders);

      // 3. 🛡️ LocalStorage එකේ 'my_orders' නමින් සේව් කරමු (Refresh කළත් නොමැකෙන්න)
      localStorage.setItem("my_orders", JSON.stringify(updatedOrders));

      setShowInvoice(true);
      setCart([]);
      setPhone("");
      setAddress("");
      setIsMenuOpen(true);
      alert("Order Placed Successfully! ✅");
    } catch (err) {
      console.error("Order Error:", err);
      alert("ඕඩර් එක දාන්න බැරි වුණා. නැවත උත්සාහ කරන්න.");
    }
  };

  const handleBuy = (product) => {
    // 1. තෝරාගත් සයිස් එක ලබාගැනීම
    const currentSize = selectedSizes[product._id];

    if (!currentSize) {
      return alert("Please select the size and then click Buy Now!");
    }

    // 2. තොග පරීක්ෂාව
    const sizeStock = product.inventory?.find(
      (inv) => inv.size === currentSize,
    );
    if (!sizeStock || sizeStock.quantity <= 0) {
      return alert(
        `Sorry, ${product.name} in size ${currentSize} is out of stock!`,
      );
    }

    // 3. Cart එකට ඇඩ් කිරීම
    const buyNowItem = {
      cartId: Date.now() + Math.random(),
      _id: product._id,
      name: product.name,
      price: product.price,
      size: currentSize,
      quantity: 1,
      image: product.image,
    };

    setCart([...cart, buyNowItem]);

    // 4. Scroll to Cart
    setTimeout(() => {
      const cartSection = document.getElementById("cart-section");
      if (cartSection) {
        cartSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const totalPrice = cart.reduce(
    (total, item) => total + Number(item.price),
    0,
  );

  const downloadPDF = () => {
    if (!lastOrder) return alert("Order data not found!");
    const doc = new jsPDF();

    // 1. අයිතම Group කිරීම (එකම ID සහ එකම Size ඇති දේවල් එකතු කරයි)
    const groupedItems = Object.values(
      lastOrder.items.reduce((acc, item) => {
        const key = `${item._id}-${item.size}`; // ID එක සහ Size එක අනුව key එකක් සාදයි
        if (!acc[key]) {
          acc[key] = { ...item, quantity: 0 };
        }
        acc[key].quantity += item.quantity || 1;
        return acc;
      }, {}),
    );

    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text("TRENDYSTORE", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("ORDER INVOICE", 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 37);
    doc.text(`Order ID: ${lastOrder._id || "N/A"}`, 14, 44);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Bill To:", 14, 55);

    doc.setFontSize(11);
    doc.setTextColor(50);
    // lastOrder.customerName හෝ lastOrder.name ලෙස පාවිච්චි කරන්න
    doc.text(
      `Customer Name: ${lastOrder.customerName || lastOrder.name || "Customer"}`,
      14,
      62,
    );
    doc.text(`Phone: ${lastOrder.phone || "N/A"}`, 14, 69);
    doc.text(`Address: ${lastOrder.address || "N/A"}`, 14, 76);

    // 2. Table එකේ Headers වලට "Size" Column එක එකතු කළා
    autoTable(doc, {
      startY: 85,
      head: [["Item Name", "Size", "Unit Price", "Qty", "Total"]],
      body: groupedItems.map((item) => [
        item.name,
        item.size || "N/A", // Size එක මෙතැනට වැටේ
        `Rs. ${item.price}`,
        item.quantity, // Group කළ පසු ලැබෙන මුළු ගණන
        `Rs. ${Number(item.price) * item.quantity}`, // මුළු මිල (Price * Qty)
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Total Amount: Rs. ${lastOrder.totalAmount}.00`, 14, finalY + 15);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Contact: +94 11 123 4567", 14, finalY + 30);
    doc.text("Thank you for shopping with TrendyStore!", 14, finalY + 35);

    doc.save(`Invoice_${lastOrder._id || "Order"}.pdf`);
  };

  // 🔍 Filter Logic
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredOrders = allOrders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const customerName = order.customerName
      ? order.customerName.toLowerCase()
      : "";
    const phone = order.phone ? order.phone : "";
    const address = order.address ? order.address.toLowerCase() : "";
    const orderId = order._id ? order._id.toString().toLowerCase() : "";

    return (
      customerName.includes(searchLower) ||
      phone.includes(searchTerm) ||
      address.includes(searchLower) ||
      orderId.includes(searchTerm)
    );
  });

  // --- 5. Rendering ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
          <h2 className="text-4xl font-black text-center text-gray-800 mb-8 italic">
            TRENDY<span className="text-blue-600">STORE</span>
          </h2>

          {regStep === 1 /* --- පියවර 1: Register/Login Form --- */ ? (
            <form onSubmit={handleAuth} className="space-y-5">
              {authMode === "register" && (
                <input
                  className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none"
                  placeholder="Full Name"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              )}
              <input
                className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none"
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
              <input
                className="w-full border-2 border-gray-100 p-4 rounded-xl outline-none"
                type="password"
                placeholder="Password"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
              <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">
                {authMode === "login" ? "Login" : "Register"}
              </button>
              <p
                className="mt-8 text-center text-gray-500 underline cursor-pointer"
                onClick={() =>
                  setAuthMode(authMode === "login" ? "register" : "login")
                }
              >
                {authMode === "login" ? "Register" : "Login"}
              </p>
            </form>
          ) : (
            /* --- පියවර 2: OTP Verification Form --- */
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center">
                <p className="text-gray-600 mb-4 font-medium">
                  We have sent a code to <b>{formData.email}</b>. Please enter
                  it here.
                </p>
              </div>
              <input
                className="w-full border-2 border-blue-100 p-4 rounded-xl outline-none text-center text-2xl font-black tracking-widest focus:border-blue-500"
                type="text"
                maxLength="6"
                placeholder="000000"
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button className="w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700">
                Verify
              </button>
              {/* OTP එක ඇතුළත් කරන තැන */}
              <button onClick={handleVerifyOTP} className="btn-verify">
                Verify OTP
              </button>
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "14px" }}>Didn't get the code?</p>
                <button
                  type="button"
                  onClick={handleResendOTP} // 👈 මෙතැනදී තමයි handleResendOTP පාවිච්චි වෙන්නේ
                  style={{
                    color: "blue",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    textDecoration: "underline",
                  }}
                >
                  Resend OTP
                </button>
              </div>
              <p
                className="text-center text-blue-600 underline cursor-pointer text-sm"
                onClick={() => setRegStep(1)}
              >
                Re-register
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-black text-gray-900 italic">
              TRENDY<span className="text-blue-600">STORE</span>
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Welcome, {user.name}!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-3 bg-gray-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2"
            >
              <span className="text-sm font-bold tracking-widest">MENU</span>
              <span className="text-xl">☰</span>
            </button>
          </div>

          {/* --- SIDE MENU DRAWER --- */}
          <div
            className={`fixed inset-0 z-[100] ${isMenuOpen ? "visible" : "invisible"}`}
          >
            <div
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
              onClick={() => setIsMenuOpen(false)}
            ></div>
            <div
              className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl transition-transform duration-300 transform ${isMenuOpen ? "translate-x-0" : "translate-x-full"} p-6 flex flex-col`}
            >
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-xl font-black text-gray-800 italic uppercase">
                  Account
                </h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-2xl text-gray-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>

              <nav className="mt-8 pt-8 border-t space-y-2">
                {/* 🛒 පරිශීලකයා ඇඩ්මින් කෙනෙක් නෙමෙයි නම් විතරක් මේ බටන් එක පෙන්වන්න */}
                {!user.isAdmin && (
                  <button
                    onClick={() => {
                      navigate("/orders");
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-3"
                  >
                    <span>🛍️</span> My Orders
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left p-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-3"
                >
                  <span>🚪</span> Logout
                </button>
              </nav>
            </div>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <>
                {/* --- ADMIN SECTIONS --- */}
                {user.isAdmin && (
                  <div className="space-y-8 mb-16">
                    {/* 1. Recent Customer Orders Section */}
                    <section className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-green-500">
                      <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                        📦 Recent Customer Orders
                      </h2>

                      {/* Order Search Bar */}
                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="(Search orders...)"
                            className="w-full p-4 pl-12 rounded-2xl border-2 border-gray-100 shadow-sm focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <span className="absolute left-4 top-4 text-gray-400 text-xl">
                            🔍
                          </span>
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm("")}
                              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2 ml-2">
                          Total Orders:{" "}
                          <span className="font-bold">
                            {filteredOrders.length}
                          </span>
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 uppercase text-xs font-bold text-gray-400">
                              <th className="p-4 rounded-tl-xl">Order ID</th>
                              <th className="p-4">
                                Customer Details & Address
                              </th>
                              <th className="p-4">Items & Size (Qty)</th>
                              <th className="p-4">Date & Time</th>
                              <th className="p-4">Total & Status</th>
                              <th className="p-4 rounded-tr-xl text-center">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredOrders.map((order) => (
                              <tr
                                key={order._id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-4">
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold font-mono">
                                    #
                                    {order._id
                                      ? order._id.slice(-6).toUpperCase()
                                      : "N/A"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-gray-700 text-[14px]">
                                    {order.customerName || "Unknown"}
                                  </p>
                                  <p className="text-blue-600 text-xs font-bold">
                                    📞 {order.phone}
                                  </p>
                                  <p className="text-xs text-gray-500 italic mt-1">
                                    📍 {order.address}
                                  </p>
                                </td>
                                <td className="p-4">
                                  {getGroupedItems(order.items).map(
                                    (item, index) => (
                                      <div
                                        key={index}
                                        className="mb-2 p-2 bg-blue-50 rounded border border-blue-100"
                                      >
                                        <span className="font-bold text-gray-700 text-xs">
                                          {item.name}
                                        </span>
                                        <div className="flex gap-2 mt-1">
                                          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                            SIZE: {item.size}
                                          </span>
                                          <span className="text-gray-600 text-[10px] font-bold">
                                            Qty: {item.quantity}
                                          </span>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </td>
                                <td className="p-4 text-xs font-bold text-gray-700">
                                  {new Date(
                                    order.createdAt,
                                  ).toLocaleDateString()}
                                  <br />
                                  <span className="text-gray-400 font-normal">
                                    {new Date(
                                      order.createdAt,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <p className="font-black text-blue-600 text-sm">
                                    Rs. {order.totalAmount}
                                  </p>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === "Delivered" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}
                                  >
                                    {order.status || "Pending"}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex justify-center gap-2">
                                    {order.status !== "Delivered" && (
                                      <button
                                        onClick={() =>
                                          updateStatus(order._id, "Delivered")
                                        }
                                        className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-600 hover:text-white text-xs font-bold"
                                      >
                                        Mark Delivered
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteOrder(order._id)}
                                      className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white text-xs font-bold"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* 2. Admin: Add New Item Section */}
                    <section className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-blue-600">
                      <h2 className="text-xl font-black text-gray-800 mb-6 italic uppercase">
                        {editingProduct
                          ? "🛠️ Admin: Edit Item"
                          : "🛠️ Admin: Add New Item"}
                      </h2>
                      <form
                        onSubmit={editingProduct ? updateProduct : addProduct}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4"
                      >
                        <input
                          className="border-2 p-3 rounded-xl outline-none focus:border-blue-500"
                          placeholder="Product Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                        <input
                          className="border-2 p-3 rounded-xl outline-none focus:border-blue-500"
                          type="number"
                          placeholder="Price"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                        />
                        <input
                          className="border-2 p-3 rounded-xl outline-none focus:border-blue-500"
                          placeholder="Image URL"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          required
                        />
                        <div className="flex gap-2">
                          <button className="flex-1 bg-gray-900 text-white p-3 rounded-xl font-bold hover:bg-black transition-all">
                            {editingProduct ? "Update Item" : "Add Item"}
                          </button>
                          {editingProduct && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(null);
                                resetForm();
                              }}
                              className="bg-red-500 text-white p-3 rounded-xl font-bold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>

                      {/* Stock per Size UI */}
                      <div className="mt-6 p-5 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">
                          📦 Set Stock per Size:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          {availableSizes.map((size) => (
                            <div
                              key={size}
                              className="bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                            >
                              <span className="block text-center font-bold text-blue-600 mb-2">
                                {size}
                              </span>
                              <input
                                type="number"
                                min="0"
                                className="w-full text-center border-b-2 border-gray-200 outline-none focus:border-blue-500 font-bold"
                                value={inventoryData[size] || ""}
                                onChange={(e) =>
                                  setInventoryData({
                                    ...inventoryData,
                                    [size]: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* --- 🔍 PRODUCT SEARCH BAR (Exclusive Collection එකට කෙළින්ම උඩින්) --- */}
                <div className="mb-10 max-w-2xl mx-auto">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="(Search products...)"
                      className="w-full p-5 pl-14 rounded-2xl border-none shadow-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-medium transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-5 top-5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-7 w-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* --- PRODUCT GRID SECTION --- */}
                <h2 className="text-3xl font-black text-gray-900 mb-8 italic uppercase tracking-tighter">
                  🔥 Exclusive Collection
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                  {filteredProducts.map((product) => {
                    const displaySizes =
                      product.inventory && product.inventory.length > 0
                        ? product.inventory
                        : (product.sizes || []).map((s) => ({
                            size: s,
                            quantity: 1,
                          }));

                    return (
                      <div
                        key={product._id}
                        className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all border p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="overflow-hidden rounded-2xl mb-4 h-64">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                            />
                          </div>
                          <h4 className="text-lg font-bold text-gray-800">
                            {product.name}
                          </h4>
                          <p className="text-blue-600 font-black text-2xl mb-3">
                            Rs. {product.price}.00
                          </p>

                          <select
                            id={`size-select-${product._id}`}
                            className="w-full p-3 mb-3 border-2 border-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            value={selectedSizes[product._id] || ""}
                            onChange={(e) =>
                              setSelectedSizes({
                                ...selectedSizes,
                                [product._id]: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Size</option>
                            {displaySizes.map((item, idx) => (
                              <option
                                key={idx}
                                value={item.size}
                                disabled={item.quantity <= 0}
                              >
                                {item.size}{" "}
                                {item.quantity > 0
                                  ? `(${item.quantity} available)`
                                  : "- Out of Stock"}
                              </option>
                            ))}
                          </select>

                          <button
                            className="w-full py-3 rounded-xl font-bold mb-2 bg-gray-100 text-gray-900 hover:bg-black hover:text-white transition-all"
                            onClick={() => {
                              const sVal = selectedSizes[product._id];
                              if (!sVal) return alert("Please select a size!");
                              addToCart(product, sVal);
                            }}
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={() => {
                              const sElement = document.getElementById(
                                `size-select-${product._id}`,
                              );
                              const selectedSize = sElement
                                ? sElement.value
                                : null;
                              if (!selectedSize)
                                return alert("Please select a size!");

                              if (typeof handleBuy === "function") {
                                handleBuy(product, selectedSize);
                              } else {
                                addToCart(product, selectedSize);
                                document
                                  .getElementById("cart-section")
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            className="w-full mt-2 py-2 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                          >
                            Buy Now ⚡
                          </button>
                        </div>

                        {user.isAdmin && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-dashed">
                            <button
                              onClick={() => startEdit(product)}
                              className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold uppercase"
                            >
                              Edit ✏️
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase"
                            >
                              Delete 🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cart.length > 0 && (
                  <div
                    id="cart-section"
                    className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-t-8 border-green-500 mb-10"
                  >
                    <h2 className="text-2xl font-black mb-6 text-gray-800">
                      🛒 Your Shopping Cart ({cart.length})
                    </h2>
                    <ul className="divide-y divide-gray-100 mb-8 max-h-60 overflow-y-auto">
                      {cart.map((item, index) => (
                        <li
                          key={index}
                          className="py-4 flex justify-between items-center"
                        >
                          <div key={index}>
                            <p>
                              {item.name} - <strong>Size: {item.size}</strong>
                            </p>
                            <p>Rs. {item.price}</p>
                          </div>
                          <div>
                            <span className="font-bold text-gray-600">
                              {item.name}
                            </span>
                            <p className="text-xs text-blue-500 font-black">
                              Rs. {item.price}.00
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item)}
                            className="bg-red-50 text-red-500 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="bg-gray-50 p-6 rounded-2xl mb-8 space-y-4">
                      <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest flex items-center gap-2">
                        🚚 Delivery Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone Number Input with +94 */}
                        <div className="relative flex items-center">
                          <div className="absolute left-4 flex items-center gap-1 text-gray-500 font-bold border-r pr-3 border-gray-300 h-6">
                            <span className="text-lg">🇱🇰</span>
                            <span className="text-sm">+94</span>
                          </div>
                          <input
                            type="text"
                            placeholder="7X XXX XXXX"
                            className="w-full p-4 pl-24 rounded-xl border-2 border-white focus:border-blue-500 outline-none shadow-sm font-medium transition-all"
                            value={phone}
                            maxLength="9"
                            onChange={(e) => {
                              // ඉලක්කම් පමණක් ඇතුළත් කර ගැනීමට (regex filter)
                              const onlyNums = e.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );
                              setPhone(onlyNums);
                            }}
                          />
                        </div>

                        {/* Address Input */}
                        <div className="relative">
                          <span className="absolute left-4 top-4 text-gray-400">
                            📍
                          </span>
                          <input
                            type="text"
                            placeholder="Delivery Address"
                            className="w-full p-4 pl-12 rounded-xl border-2 border-white focus:border-blue-500 outline-none shadow-sm font-medium transition-all"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                      </div>
                      {phone && phone.length < 9 && (
                        <p className="text-[10px] text-red-500 font-bold ml-1 animate-pulse">
                          * Please enter the remaining {9 - phone.length} digits
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center border-t pt-8 gap-6">
                      <div className="text-4xl font-black text-gray-900 tracking-tighter">
                        <span className="text-sm font-bold text-gray-400 uppercase block mb-1">
                          Total Payable:
                        </span>
                        Rs. {totalPrice}.00
                      </div>
                      <button
                        onClick={handleCheckout}
                        className="w-full md:w-auto bg-green-500 text-white px-16 py-5 rounded-[1.5rem] font-black text-xl hover:bg-green-600 shadow-xl transition-all active:scale-95"
                      >
                        CONFIRM ORDER 🚀
                      </button>
                    </div>
                  </div>
                )}

                {showInvoice && lastOrder && (
                  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl animate-bounce-in flex flex-col max-h-[95vh]">
                      {/* Header */}
                      <div className="bg-blue-600 p-8 text-white text-center shrink-0">
                        <div className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-black italic">
                          ORDER SUCCESSFUL!
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">
                          Thank you for shopping with TrendyStore
                        </p>
                      </div>

                      {/* Middle Content (Scrollable) */}
                      <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-6">
                          <span>Order ID: {lastOrder._id || "N/A"}</span>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>

                        <div className="space-y-4 mb-8">
                          <h3 className="font-bold text-gray-800 border-b pb-2 sticky top-0 bg-white">
                            Items Summary
                          </h3>

                          {/* 👇 මෙතනදී අපි එකම Item එක සහ Size එක Group කරලා පෙන්වනවා */}
                          {Object.values(
                            lastOrder.items.reduce((acc, item) => {
                              const key = `${item._id}-${item.size}`; // ID එක සහ Size එක අනුව Group කිරීම
                              if (!acc[key]) {
                                acc[key] = { ...item, quantity: 0 };
                              }
                              acc[key].quantity += item.quantity || 1;
                              return acc;
                            }, {}),
                          ).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm mb-2 border-b pb-1"
                            >
                              <span className="text-gray-600">
                                {item.name}
                                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  Size: {item.size || "N/A"}
                                </span>
                                <b className="text-black ml-2">
                                  (x{item.quantity})
                                </b>
                              </span>
                              <span className="font-bold">
                                Rs. {Number(item.price) * item.quantity}.00
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between border-t pt-4 text-xl font-black text-blue-600 italic mb-8">
                          <span>TOTAL PAID</span>
                          <span>Rs. {lastOrder.totalAmount}.00</span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-gray-900">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">
                            Shipping To:
                          </h4>
                          <p className="text-sm font-bold">
                            {lastOrder.customerName || lastOrder.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lastOrder.phone}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lastOrder.address}
                          </p>
                        </div>
                      </div>

                      {/* Footer Buttons */}
                      <div className="p-8 pt-0 shrink-0">
                        <button
                          onClick={downloadPDF}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg mb-3 flex items-center justify-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          DOWNLOAD PDF
                        </button>

                        <button
                          onClick={() => setShowInvoice(false)}
                          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg"
                        >
                          CLOSE & CONTINUE
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            }
          />

          <Route
            path="/orders"
            element={<OrderHistoryPage userOrders={userOrders} user={user} />}
          />
        </Routes>
      </div>
    </div>
  );
}

const OrderHistoryPage = ({ userOrders, user }) => {
  const navigate = useNavigate();

  // 🛡️ ආරක්ෂක පියවරක්: ඇඩ්මින් කෙනෙක් මේ පේජ් එකට ආවොත් එයාට මුල් පේජ් එකට යවනවා
  // (මෙය වැඩ කිරීමට 'Navigate' කියන එක react-router-dom එකෙන් import කර තිබිය යුතුය)
  if (user && user.isAdmin) {
    return <Navigate to="/" />;
  }

  const myOwnOrders = userOrders.filter((order) => {
    // ඕඩර් එකේ තියෙන User ID එකයි, දැන් ලොග් වෙලා ඉන්න කෙනාගේ ID එකයි
    // හරියටම සමාන නම් විතරක් true කරනවා
    return (
      String(order.user) === String(user?._id) ||
      String(order.userId) === String(user?._id)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-10 rounded-3xl shadow-sm font-sans">
      <button
        onClick={() => navigate("/")}
        className="mb-8 text-blue-600 font-bold flex items-center gap-2 hover:underline transition-all"
      >
        ← Back to Shop
      </button>

      <h1 className="text-4xl font-black italic mb-10 uppercase tracking-tighter">
        My <span className="text-blue-600">Orders</span>
      </h1>

      <div className="grid gap-6">
        {myOwnOrders.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 font-bold italic underline">
              You have no orders yet.
            </p>
          </div>
        ) : (
          myOwnOrders.map((order) => (
            <div
              key={order._id}
              className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-all"
            >
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">
                  Order #{order._id?.slice(-6)}
                </p>
                <h3 className="font-bold text-gray-800 text-lg">
                  {order.items.map((i) => i.name).join(", ")}
                </h3>
                <div className="flex gap-4 mt-1">
                  <p className="text-xs text-gray-400 font-medium">
                    📅 {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${order.status === "Delivered" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}
                  >
                    {order.status || "Pending"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-gray-900 tracking-tighter">
                  Rs. {order.totalAmount}.00
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase italic">
                  Trendy Store Exclusive
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
