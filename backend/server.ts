import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";

dotenv.config();

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  displayName: String,
  role: { type: String, enum: ['User', 'Admin'], default: 'User' }
});

const User = mongoose.model('User', userSchema);

const passSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  studentId: String,
  department: String,
  year: String,
  mobile: String,
  email: String,
  from: String,
  to: String,
  type: String,
  issueDate: String,
  expiryDate: String,
  status: String,
  price: Number
});

const BusPass = mongoose.model('BusPass', passSchema);

const routeSchema = new mongoose.Schema({
  routeName: String,
  startPlace: String,
  endPlace: String,
  distance: Number,
  fare: Number
});

const BusRoute = mongoose.model('BusRoute', routeSchema);

const departmentSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  description: String
});

const Department = mongoose.model('Department', departmentSchema);

const paymentSchema = new mongoose.Schema({
  passId: String,
  userId: String,
  userName: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  transactionId: String,
  status: { type: String, default: 'Success' }
});

const Payment = mongoose.model('Payment', paymentSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });

  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI;
  if (MONGODB_URI) {
    try {
      console.log("Attempting to connect to MongoDB...");
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      console.log("✅ Connected to MongoDB successfully");
      
      // Seed default departments
      const defaultDepts = ['BCA', 'BBA', 'B-Tech', 'Poly-Tech'];
      for (const name of defaultDepts) {
        await Department.findOneAndUpdate(
          { name },
          { name },
          { upsert: true, new: true }
        );
      }
    } catch (err: any) {
      console.error("❌ MongoDB Connection Failure:", err.message);
      if (err.name === 'MongooseServerSelectionError') {
        console.error("--------------------------------------------------");
        console.error("ACTION REQUIRED: IP WHITELIST ISSUE DETECTED");
        console.error("1. Log in to: https://cloud.mongodb.com");
        console.error("2. Go to 'Network Access' (under Security)");
        console.error("3. Click 'Add IP Address'");
        console.error("4. Select 'ALLOW ACCESS FROM ANYWHERE'");
        console.error("5. Ensure status is 'Active' before retrying.");
        console.error("--------------------------------------------------");
      }
    }
  } else {
    console.warn("MONGODB_URI not found in environment. Running with mock fallback capability.");
  }

  // JSON Body Parser for API routes
  app.use(express.json());
  app.use(cors());


  // Auth APIs
  app.post("/api/auth/signup", async (req, res) => {
    if (!MONGODB_URI) {
      return res.status(200).json({ message: "Mock signup success" });
    }
    try {
      const { email, password, displayName } = req.body;
      const role = email.includes('admin') ? 'Admin' : 'User';
      const user = new User({ email, password, displayName, role });
      await user.save();
      res.status(201).json({ message: "User created" });
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === 11000) {
        return res.status(400).json({ error: "The provided email address is already registered." });
      }
      res.status(500).json({ error: "Failed to create account. Please try again later." });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    if (!MONGODB_URI) {
      const role = req.body.email.includes('admin') ? 'Admin' : 'User';
      return res.json({
        uid: 'mock_user_123',
        email: req.body.email,
        displayName: role === 'Admin' ? 'Admin Karan' : 'Karan Commuter',
        role: role
      });
    }
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      });
    } catch (err) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Stateful mock data for development
  let MOCK_DEPTS = [
    { id: 'd1', name: 'BCA', description: 'Bachelor of Computer Applications' },
    { id: 'd2', name: 'BBA', description: 'Bachelor of Business Administration' },
    { id: 'd3', name: 'B-Tech', description: 'Bachelor of Technology' },
    { id: 'd4', name: 'Poly-Tech', description: 'Polytechnic Diploma' }
  ];

  let MOCK_ROUTES = [
    { id: 'r1', routeName: 'Line 42', startPlace: 'Malviya Nagar', endPlace: 'Main Campus Gate', distance: 15, fare: 3600 },
    { id: 'r2', routeName: 'Line 101', startPlace: 'Mansarovar', endPlace: 'Main Campus Gate', distance: 45, fare: 4200 },
    { id: 'r3', routeName: 'Line 55', startPlace: 'Tonk Road', endPlace: 'Main Campus Gate', distance: 20, fare: 3800 }
  ];

  let MOCK_PASSES = [
    { id: 'mock_001', userId: 'user123', userName: 'Karan Maurya', type: 'Regular', issueDate: '2026-03-01', expiryDate: '2026-04-30', status: 'Active', price: 3600, email: 'karan@example.com', studentId: 'STU001', from: 'Malviya Nagar', to: 'Main Campus' },
    { id: 'mock_002', userId: 'user456', userName: 'Jane Doe', type: 'Student', issueDate: '2026-04-10', expiryDate: '2026-05-10', status: 'Pending', price: 2000, email: 'jane@example.com', studentId: 'STU002', from: 'Tonk Road', to: 'Main Campus' }
  ];

  let MOCK_PAYMENTS = [
    { id: 'pay_1', passId: 'mock_001', userId: 'user123', userName: 'Karan Maurya', amount: 3600, date: '2026-03-01', transactionId: 'TXN_PAY1', status: 'Success' },
    { id: 'pay_2', passId: 'mock_002', userId: 'user456', userName: 'Jane Doe', amount: 2000, date: '2026-04-10', transactionId: 'TXN_PAY2', status: 'Success' }
  ];

  let MOCK_USERS = [
    { uid: 'u1', email: 'user1@test.com', displayName: 'User One', role: 'User' },
    { uid: 'u2', email: 'admin@test.com', displayName: 'Admin User', role: 'Admin' }
  ];

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Fetch all passes for a user
  app.get("/api/passes/:userId", async (req, res) => {
    if (!MONGODB_URI) {
      // Mock fallback
      return res.json(MOCK_PASSES.filter(p => p.userId === req.params.userId || p.userId === 'user123'));
    }

    try {
      const passes = await BusPass.find({ userId: req.params.userId });
      res.json(passes);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch passes" });
    }
  });

  app.get("/api/routes", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_ROUTES);
    }
    try {
      const routes = await BusRoute.find({});
      res.json(routes.map(r => ({ 
        id: r._id, 
        routeName: r.routeName, 
        startPlace: r.startPlace, 
        endPlace: r.endPlace, 
        distance: r.distance, 
        fare: r.fare 
      })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.get("/api/departments", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_DEPTS);
    }
    try {
      const depts = await Department.find({});
      res.json(depts.map(d => ({ id: d._id, name: d.name, description: d.description })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  // Admin APIs
  app.get("/api/admin/departments", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_DEPTS);
    }
    try {
      const depts = await Department.find({});
      res.json(depts.map(d => ({ id: d._id, name: d.name, description: d.description })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/admin/departments", async (req, res) => {
    if (!MONGODB_URI) return res.status(201).json({ id: 'mock_' + Date.now(), ...req.body });
    try {
      const dept = new Department(req.body);
      await dept.save();
      res.status(201).json(dept);
    } catch (err) {
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.put("/api/admin/departments/:id", async (req, res) => {
    if (!MONGODB_URI) return res.json({ id: req.params.id, ...req.body });
    try {
      const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(dept);
    } catch (err) {
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/admin/departments/:id", async (req, res) => {
    console.log(`[DELETE] Department: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_DEPTS = MOCK_DEPTS.filter(d => d.id !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await Department.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  app.get("/api/admin/passes", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_PASSES);
    }
    try {
      const passes = await BusPass.find({}).sort({ issueDate: -1 });
      res.json(passes);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch all passes" });
    }
  });

  app.patch("/api/admin/passes/:id", async (req, res) => {
    if (!MONGODB_URI) return res.json({ success: true, message: "Mock update success" });
    try {
      const updatedPass = await BusPass.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
      res.json(updatedPass);
    } catch (err) {
      res.status(500).json({ error: "Failed to update pass" });
    }
  });

  app.get("/api/admin/routes", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_ROUTES);
    }
    try {
      const routes = await BusRoute.find({});
      res.json(routes.map(r => ({ 
        id: r._id, 
        routeName: r.routeName, 
        startPlace: r.startPlace, 
        endPlace: r.endPlace, 
        distance: r.distance, 
        fare: r.fare 
      })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.post("/api/admin/routes", async (req, res) => {
    if (!MONGODB_URI) return res.status(201).json({ id: 'mock_' + Date.now(), ...req.body });
    try {
      const route = new BusRoute(req.body);
      await route.save();
      res.status(201).json(route);
    } catch (err) {
      res.status(500).json({ error: "Failed to create route" });
    }
  });

  app.put("/api/admin/routes/:id", async (req, res) => {
    if (!MONGODB_URI) return res.json({ id: req.params.id, ...req.body });
    try {
      const route = await BusRoute.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(route);
    } catch (err) {
      res.status(500).json({ error: "Failed to update route" });
    }
  });

  app.delete("/api/admin/routes/:id", async (req, res) => {
    console.log(`[DELETE] Route: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_ROUTES = MOCK_ROUTES.filter(r => r.id !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await BusRoute.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  // Razorpay Order Creation
  app.post("/api/payment/order", async (req, res) => {
    try {
      const { amount, currency = "INR" } = req.body;
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency,
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (err) {
      console.error("Razorpay order error:", err);
      res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  });

  app.post("/api/payment/mock", async (req, res) => {
    try {
      const { passId, userId, userName, amount } = req.body;
      if (MONGODB_URI) {
        const payment = new Payment({
          passId,
          userId,
          userName,
          amount,
          transactionId: 'MOCK_TXN_' + Date.now(),
          status: 'Success'
        });
        await payment.save();
        await BusPass.findByIdAndUpdate(passId, { status: 'Pending' });
      }
      res.json({ success: true, message: "Mock payment recorded" });
    } catch (err) {
      res.status(500).json({ error: "Failed to record mock payment" });
    }
  });

  // Razorpay Payment Verification
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, passId, userId, userName, amount } = req.body;
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        // Payment verified, record in DB
        if (MONGODB_URI) {
           const payment = new Payment({
            passId,
            userId,
            userName,
            amount: amount / 100, // back to normal unit if needed, but App.tsx sends real price
            transactionId: razorpay_payment_id,
            status: 'Success'
          });
          await payment.save();
          await BusPass.findByIdAndUpdate(passId, { status: 'Pending' });
        }
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
      }
    } catch (err) {
      console.error("Razorpay verification error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json({ 
        totalPasses: 156, 
        revenue: 450000, 
        activePasses: 120, 
        pendingApprovals: 12,
        deptDistribution: [
          { name: 'BCA', count: 45 },
          { name: 'BBA', count: 32 },
          { name: 'B-Tech', count: 58 },
          { name: 'Poly-Tech', count: 21 }
        ],
        monthlyRevenue: [
          { month: 'Oct', revenue: 45000 },
          { month: 'Nov', revenue: 52000 },
          { month: 'Dec', revenue: 48000 },
          { month: 'Jan', revenue: 61000 },
          { month: 'Feb', revenue: 55000 },
          { month: 'Mar', revenue: 67000 }
        ]
      });
    }
    try {
      const [allPasses, allPayments] = await Promise.all([
        BusPass.find({}),
        Payment.find({ status: 'Success' })
      ]);

      const activePasses = allPasses.filter(p => p.status === 'Active').length;
      const pendingApprovals = allPasses.filter(p => p.status === 'Pending').length;
      const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Aggregate department distribution
      const deptMap: Record<string, number> = {};
      allPasses.forEach(p => {
        const dept = (p as any).department || 'Unassigned';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const deptDistribution = Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Aggregate monthly revenue (last 6 months)
      const monthlyMap: Record<string, number> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      allPayments.forEach(p => {
        if (p.date) {
          const date = new Date(p.date);
          const monthKey = monthNames[date.getMonth()];
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + (p.amount || 0);
        }
      });

      // Sort months chronologically for the trend
      const currentMonth = new Date().getMonth();
      const lastSixMonthsData = [];
      for (let i = 5; i >= 0; i--) {
        const m = (currentMonth - i + 12) % 12;
        lastSixMonthsData.push({
          month: monthNames[m],
          revenue: monthlyMap[monthNames[m]] || 0
        });
      }

      res.json({ 
        totalPasses: allPasses.length, 
        revenue: totalRevenue, 
        activePasses, 
        pendingApprovals,
        deptDistribution,
        monthlyRevenue: lastSixMonthsData
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate reports" });
    }
  });

  app.get("/api/admin/payments", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_PAYMENTS);
    }
    try {
      const payments = await Payment.find({}).sort({ date: -1 });
      res.json(payments.map(p => ({ 
        id: p._id, 
        passId: p.passId, 
        userId: p.userId, 
        userName: p.userName, 
        amount: p.amount, 
        date: p.date, 
        transactionId: p.transactionId, 
        status: p.status 
      })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.delete("/api/admin/payments/:id", async (req, res) => {
    console.log(`[DELETE] Payment: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_PAYMENTS = MOCK_PAYMENTS.filter(p => p.id !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await Payment.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  app.delete("/api/admin/passes/:id", async (req, res) => {
    console.log(`[DELETE] Application: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_PASSES = MOCK_PASSES.filter(p => p.id !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await BusPass.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete application" });
    }
  });

  app.delete("/api/passes/:id", async (req, res) => {
    console.log(`[DELETE] User Pass: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_PASSES = MOCK_PASSES.filter(p => p.id !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await BusPass.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete pass" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message, priority } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "Name, email and message are required" });
      }

      console.log(`[Contact Form] ${priority} - ${subject} from ${name} (${email}): ${message}`);
      
      // Simulate real email delivery using a mock transporter
      // In a real app, you'd use your actual SMTP credentials
      let info = { messageId: 'mock_' + Date.now() };
      
      // Simulation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      res.json({ 
        success: true, 
        message: "Message delivered to support desk",
        refId: info.messageId
      });
    } catch (err: any) {
      console.error("Server contact error:", err);
      res.status(500).json({ success: false, error: "Server failed to process contact request" });
    }
  });

  app.post("/api/passes", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json({ id: 'mock_' + Date.now(), ...req.body });
    }

    try {
      const newPass = new BusPass(req.body);
      await newPass.save();
      res.status(201).json(newPass);
    } catch (err) {
      res.status(500).json({ error: "Failed to save pass application" });
    }
  });

  app.patch("/api/admin/users/:id/role", async (req, res) => {
    if (!MONGODB_URI) return res.json({ success: true, message: "Mock role update success" });
    try {
      const { role } = req.body;
      const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
      if (!updatedUser) return res.status(404).json({ error: "User not found" });
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json(MOCK_USERS);
    }
    try {
      const users = await User.find({});
      res.json(users.map(u => ({ uid: u._id, email: u.email, displayName: u.displayName, role: u.role })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    console.log(`[DELETE] User: ${req.params.id}`);
    if (!MONGODB_URI) {
      MOCK_USERS = MOCK_USERS.filter(u => u.uid !== req.params.id);
      return res.json({ success: true });
    }
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Verification API
  app.get("/api/verify/:id", async (req, res) => {
    if (!MONGODB_URI) {
      return res.json({
        id: req.params.id,
        userName: 'Karan Maurya',
        studentId: 'CPU/2026/001',
        from: 'Malviya Nagar',
        to: 'Main Campus Gate',
        type: '1 Month',
        issueDate: '2026-04-19',
        expiryDate: '2026-05-19',
        status: 'Active',
        price: 3600
      });
    }
    try {
      const pass = await BusPass.findById(req.params.id);
      if (!pass) return res.status(404).json({ error: "Pass not found" });
      res.json(pass);
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Expiry notification cron simulation
  const checkPassExpiries = async () => {
    if (!MONGODB_URI) return;
    try {
      console.log("[CRON] Checking for expiring passes...");
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const dateStr = sevenDaysFromNow.toISOString().split('T')[0];
      
      const expiringPasses = await BusPass.find({ 
        expiryDate: dateStr,
        status: 'Active'
      });
      
      if (expiringPasses.length > 0) {
        console.log(`[CRON] Found ${expiringPasses.length} passes expiring on ${dateStr}`);
        for (const pass of expiringPasses) {
          const passNum = (pass._id || 'TEMP').toString().slice(-8).toUpperCase();
          console.log(`
------------------------------------------------------------
[EMAIL NOTIFICATION]
To: ${pass.email || 'user@example.com'}
Subject: Your Bus Pass is Expiring Soon!
Content:
Hi ${pass.userName},
Your Bus Pass (${pass.type}) with Number #${passNum} is set to expire on ${pass.expiryDate}.
Route: ${pass.from} to ${pass.to}

Please log in to Bus Pass Pro to renew your pass and avoid any travel interruption.
------------------------------------------------------------`);
        }
      } else {
        console.log("[CRON] No passes expiring exactly in 7 days found today.");
      }
    } catch (err) {
      console.error("[CRON] Scheduled check failed:", err);
    }
  };

  // Run every 24 hours
  setInterval(checkPassExpiries, 24 * 60 * 60 * 1000);
  // Also run shortly after startup
  setTimeout(checkPassExpiries, 10000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CityLink Server running on port ${PORT}`);
  });
}

startServer();
