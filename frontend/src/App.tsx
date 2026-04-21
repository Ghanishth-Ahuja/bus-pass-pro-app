import { useState, useEffect, useRef, FormEvent } from 'react';

// API Configuration - uses environment variable or falls back to empty string (same origin)
import { API_BASE_URL } from './services/constant';
import { jsPDF } from "jspdf";
import QRCode from 'qrcode';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Bus, 
  CreditCard, 
  History, 
  LayoutDashboard, 
  LogOut, 
  PlusCircle, 
  Settings, 
  ShieldCheck, 
  User, 
  AlertCircle,
  Menu,
  X,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Mail,
  Lock,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Phone,
  Info,
  Heart,
  Globe,
  Wallet,
  FileText,
  ClipboardCheck,
  Upload,
  QrCode,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusPass, PassType, UserProfile, PassStatus, BusRoute, Department, AdminSubView, RouteModalState, DepartmentModalState, Payment, AdminReports } from './types';

// Mock Data
const MOCK_USER: UserProfile = {
  uid: 'user123',
  email: 'commuter@citylink.com',
  displayName: 'Karan Commuter',
  role: 'User'
};

const MOCK_PASSES: BusPass[] = [
  {
    id: 'pass_001',
    userId: 'user123',
    userName: 'Karan Commuter',
    from: 'Malviya Nagar',
    to: 'Main Campus Gate',
    type: '1 Month',
    issueDate: '2026-03-01',
    expiryDate: '2026-04-30',
    status: 'Active',
    price: 3600
  },
  {
    id: 'pass_000',
    userId: 'user123',
    userName: 'Karan Commuter',
    from: 'Mansarovar',
    to: 'Main Campus Gate',
    type: '1 Month',
    issueDate: '2026-01-01',
    expiryDate: '2026-02-28',
    status: 'Expired',
    price: 3600
  }
];

const CHART_COLORS = ['#4361EE', '#7209B7', '#4CC9F0', '#F72585', '#3A0CA3', '#B5179E', '#4895EF', '#560BAD'];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('buspass_user');
    return saved ? JSON.parse(saved) : null;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('buspass_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('buspass_user');
    }
  }, [user]);

  const [passes, setPasses] = useState<BusPass[]>([]);
  const [allPasses, setAllPasses] = useState<BusPass[]>([]);
  const [view, setView] = useState<'landing' | 'dashboard' | 'apply' | 'history' | 'auth' | 'admin' | 'about' | 'contact' | 'verify'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify')) return 'verify';
    
    const saved = localStorage.getItem('buspass_view');
    if (saved) return saved as any;
    const savedUser = localStorage.getItem('buspass_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u.role === 'Admin' ? 'admin' : 'dashboard';
    }
    return 'landing';
  });

  useEffect(() => {
    localStorage.setItem('buspass_view', view);
  }, [view]);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  
  // Application Form States
  const [applyForm, setApplyForm] = useState({
    fullName: '',
    studentId: '',
    department: 'Computer Science',
    year: '1st Year',
    mobile: '',
    email: '',
    from: '',
    to: 'Main Campus Gate',
    idProof: null as File | null,
    passType: '1 Month' as PassType
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [adminView, setAdminView] = useState<AdminSubView>(() => {
    const saved = localStorage.getItem('buspass_adminView');
    return (saved as AdminSubView) || 'applications';
  });

  const [verificationPass, setVerificationPass] = useState<BusPass | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      handleVerifyPass(verifyId);
    }
  }, []);

  const handleVerifyPass = async (id: string) => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/${id}`);
      if (response.ok) {
        setVerificationPass(await response.json());
      } else {
        setVerifyError("Pass not found or invalid.");
      }
    } catch (err) {
      console.error(err);
      setVerifyError("Connection error.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('buspass_adminView', adminView);
  }, [adminView]);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [routeModal, setRouteModal] = useState<RouteModalState>({ isOpen: false, route: null, isEditing: false });
  const [deptModal, setDeptModal] = useState<DepartmentModalState>({ isOpen: false, department: null, isEditing: false });
  const [selectedPassForPayment, setSelectedPassForPayment] = useState<BusPass | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [adminReports, setAdminReports] = useState<AdminReports | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactErrors, setContactErrors] = useState({ name: false, email: false, message: false });
  const [contactSubmitStatus, setContactSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [toastStatus, setToastStatus] = useState<'success' | 'error' | 'warning' | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [viewingPassDetails, setViewingPassDetails] = useState<BusPass | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [cardDetails, setCardDetails] = useState({ number: '4242 4242 4242 4242', expiry: '12/26', cvv: '123' });
  const [cardErrors, setCardErrors] = useState({ number: false, expiry: false, cvv: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const triggerToast = (msg: string, status: 'success' | 'error' | 'warning') => {
    setToastMessage(msg);
    setToastStatus(status);
    setShowToast(true);
    const duration = status === 'success' ? 2000 : 3000;
    setTimeout(() => setShowToast(false), duration);
  };

  useEffect(() => {
    if (user) {
      setContactForm(prev => ({ 
        ...prev, 
        name: '', 
        email: '' 
      }));
      setApplyForm(prev => ({ 
        ...prev, 
        fullName: '', 
        email: '' 
      }));
    }
  }, [user]);

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation logic
    const errors = {
      name: !contactForm.name.trim(),
      email: !contactForm.email.trim(),
      message: !contactForm.message.trim()
    };
    
    setContactErrors(errors);

    if (errors.name) {
      nameRef.current?.focus();
      triggerToast('Please fill your name', 'warning');
      return;
    }
    if (errors.email) {
      emailRef.current?.focus();
      triggerToast('Please fill your email', 'warning');
      return;
    }
    if (errors.message) {
      messageRef.current?.focus();
      triggerToast('Please fill your message', 'warning');
      return;
    }

    setIsSubmittingContact(true);
    setToastStatus(null);
    setContactSubmitStatus({ type: null, message: '' });

    try {
      const resp = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactForm, subject: 'Direct Support', priority: 'General' })
      });

      const data = await resp.json();

      if (resp.ok && data.success) {
        setContactSubmitStatus({ type: 'success', message: 'Message sent successfully! We\'ll get back to you soon.' });
        triggerToast('Sent successfully', 'success');
        setContactForm({ 
          name: '', 
          email: '', 
          message: '' 
        }); 
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setContactSubmitStatus({ type: 'error', message: 'Failed to send message. Please try again later.' });
      triggerToast('Failed to send message. Try again.', 'error');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPasses();
      fetchRoutes(); // Fetch routes for all users
      fetchDepartments(); // Fetch departments for all users
      if (user.role === 'Admin') {
        fetchAllPasses();
        fetchReports();
        fetchPayments();
        fetchUsers();
      }
    }
  }, [user]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/routes`);
      const data = await response.json();
      setRoutes(data);
    } catch (err) {
      console.error("Failed to fetch routes:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/departments`);
      const data = await response.json();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`);
      const data = await response.json();
      setAllUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'User' | 'Admin') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        fetchUsers();
        triggerToast(`User role updated to ${newRole}`, 'success');
      } else {
        triggerToast('Failed to update role', 'error');
      }
    } catch (err) {
      console.error("Failed to update user role:", err);
      triggerToast('Server error', 'error');
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments`);
      const data = await response.json();
      // Normalize _id to id
      const normalized = data.map((p: any) => ({ ...p, id: p._id || p.id }));
      setPayments(normalized);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reports`);
      const data = await response.json();
      setAdminReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  };

  const handleSaveRoute = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const routeData = {
      routeName: formData.get('routeName') as string,
      startPlace: formData.get('startPlace') as string,
      endPlace: formData.get('endPlace') as string,
      distance: parseFloat(formData.get('distance') as string),
      fare: parseFloat(formData.get('fare') as string)
    };

    try {
      const url = routeModal.isEditing ? `${API_BASE_URL}/api/admin/routes/${routeModal.route?.id}` : `${API_BASE_URL}/api/admin/routes`;
      const method = routeModal.isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });
      if (response.ok) {
        fetchRoutes();
        setRouteModal({ isOpen: false, route: null, isEditing: false });
        triggerToast(`Route ${routeModal.isEditing ? 'updated' : 'created'} successfully`, 'success');
      } else {
        triggerToast('Failed to save route', 'error');
      }
    } catch (err) {
      console.error("Failed to save route:", err);
    }
  };

  const handleDeleteUserPass = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this pass? This action cannot be undone.")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/passes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPasses(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
        setAllPasses(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
        triggerToast('Pass deleted successfully', 'success');
        if (adminReports) fetchReports();
      } else {
        triggerToast('Failed to delete pass', 'error');
      }
    } catch (err) {
      console.error("Failed to delete pass:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeletePass = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/passes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAllPasses(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
        setPasses(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
        if (adminReports) fetchReports();
        triggerToast('Application deleted successfully', 'success');
      } else {
        triggerToast('Failed to delete application', 'error');
      }
    } catch (err) {
      console.error("Failed to delete application:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/routes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setRoutes(prev => prev.filter(r => String(r.id) !== String(id) && String((r as any)._id) !== String(id)));
        triggerToast('Route deleted successfully', 'success');
      } else {
        triggerToast('Failed to delete route', 'error');
      }
    } catch (err) {
      console.error("Failed to delete route:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/departments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setDepartments(prev => prev.filter(d => String(d.id) !== String(id) && String((d as any)._id) !== String(id)));
        triggerToast('Department deleted successfully', 'success');
      } else {
        triggerToast('Failed to delete department', 'error');
      }
    } catch (err) {
      console.error("Failed to delete department:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSaveDept = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const deptData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string
    };

    try {
      const url = deptModal.isEditing ? `${API_BASE_URL}/api/admin/departments/${deptModal.department?.id}` : `${API_BASE_URL}/api/admin/departments`;
      const method = deptModal.isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptData)
      });
      if (response.ok) {
        fetchDepartments();
        setDeptModal({ isOpen: false, department: null, isEditing: false });
        triggerToast(`Department ${deptModal.isEditing ? 'updated' : 'created'} successfully`, 'success');
      } else {
        triggerToast('Failed to save department', 'error');
      }
    } catch (err) {
      console.error("Failed to save department:", err);
    }
  };

  const fetchPasses = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/passes/${user.uid}`);
      const data = await response.json();
      const normalized = data.map((p: any) => ({ ...p, id: p._id || p.id }));
      setPasses(normalized);
    } catch (err) {
      console.error("Failed to fetch passes:", err);
    }
  };

  const fetchAllPasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/passes`);
      const data = await response.json();
      const normalized = data.map((p: any) => ({ ...p, id: p._id || p.id }));
      setAllPasses(normalized);
    } catch (err) {
      console.error("Failed to fetch all passes:", err);
    }
  };

  const handleUpdatePassStatus = async (passId: string, newStatus: PassStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/passes/${passId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        if (adminReports) fetchReports();
        fetchAllPasses();
        triggerToast(`Pass ${newStatus} successfully`, 'success');
        if (view === 'dashboard' || view === 'history' || view === 'apply') fetchPasses();
      } else {
        triggerToast('Failed to update pass', 'error');
      }
    } catch (err) {
      console.error("Failed to update pass status:", err);
      triggerToast('Server connection error', 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPayments(prev => prev.filter(p => String(p.id) !== String(id) && String((p as any)._id) !== String(id)));
        if (adminReports) fetchReports();
        triggerToast('Payment record deleted successfully', 'success');
      } else {
        triggerToast('Failed to delete payment record', 'error');
      }
    } catch (err) {
      console.error("Failed to delete payment record:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!id || deletingIds.has(id)) return;
    if (!window.confirm("Are you sure you want to delete this user? This action is irreversible.")) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAllUsers(prev => prev.filter(u => String(u.uid || u.id) !== String(id) && String((u as any)._id) !== String(id)));
        triggerToast('User deleted successfully', 'success');
      } else {
        triggerToast('Failed to delete user', 'error');
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      triggerToast('Server error', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExportReport = () => {
    if (!adminReports) {
      triggerToast('No report data available', 'error');
      return;
    }

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(24);
    doc.text("Bus Pass Pro", 20, 30);
    doc.setFontSize(16);
    doc.text("Executive Transit Summary", 20, 42);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${timestamp}`, 20, 50);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 55, 190, 55);

    // Stats
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text("High-Level Metrics", 20, 70);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Revenue: Rs. ${adminReports.revenue.toLocaleString()}`, 20, 80);
    doc.text(`Active Passes: ${adminReports.activePasses}`, 20, 90);
    doc.text(`Pending Approvals: ${adminReports.pendingApprovals}`, 20, 100);
    doc.text(`Total Applications: ${adminReports.totalPasses}`, 20, 110);

    // Distribution
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text("Departmental Distribution", 20, 130);
    
    let yPos = 140;
    adminReports.deptDistribution.forEach((dept: any) => {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`${dept.name}: ${dept.count} applications`, 25, yPos);
      yPos += 10;
    });

    doc.save(`BusPassPro_Report_${Date.now()}.pdf`);
    triggerToast('Report exported successfully', 'success');
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    if (authMode === 'signup') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName })
        });
        if (response.ok) {
          // Clear any existing error message first
          setAuthMessage(null);
          // Switch to signin mode - form key change will force remount with empty fields
          setAuthMode('signin');
          // Show success message after mode switch
          setTimeout(() => {
            setAuthMessage('Account created successfully! Please sign in.');
          }, 100);
        } else {
          const error = await response.json();
          setAuthMessage(`Error: ${error.error || 'Signup failed'}`);
        }
      } catch (err) {
        setAuthMessage('Error: Connection failed');
      }
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Redirect to user dashboard instead of direct apply
          setView(userData.role === 'Admin' ? 'admin' : 'dashboard');
        } else {
          const error = await response.json();
          setAuthMessage(`Error: ${error.error || 'Invalid credentials'}`);
        }
      } catch (err) {
        setAuthMessage('Error: Connection failed');
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPasses([]);
    setAllPasses([]);
    setAdminReports(null);
    localStorage.removeItem('buspass_view');
    localStorage.removeItem('buspass_adminView');
    setView('landing');
    setAuthMode('signin');
    setAuthMessage(null);
    triggerToast('Logged out successfully', 'success');
  };

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPassForPayment || !user) return;
    
    if (paymentMethod === 'card') {
      const errors = {
        number: !cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 16,
        expiry: !cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry),
        cvv: !cardDetails.cvv || cardDetails.cvv.length < 3
      };
      setCardErrors(errors);
      if (errors.number || errors.expiry || errors.cvv) {
        triggerToast('Please provide valid card details', 'error');
        return;
      }
      
      setIsPaying(true);
      try {
        // Simulated progress
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const res = await fetch(`${API_BASE_URL}/api/payment/mock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passId: selectedPassForPayment.id || (selectedPassForPayment as any)._id,
            userId: user.uid,
            userName: user.displayName,
            amount: selectedPassForPayment.price
          })
        });
        
        if (res.ok) {
          await fetchPasses();
          setShowPaymentModal(false);
          setSelectedPassForPayment(null);
          setView('dashboard');
          triggerToast('Payment Successful! Your pass is under review.', 'success');
        } else {
          throw new Error("Failed to record payment");
        }
      } catch (err) {
        triggerToast('Transaction failed. Please try again.', 'error');
      } finally {
        setIsPaying(false);
      }
      return;
    }

    // Razorpay Flow for UPI
    setIsPaying(true);
    try {
      // 1. Create Order on Backend
      const orderRes = await fetch(`${API_BASE_URL}/api/payment/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: selectedPassForPayment.price,
          currency: "INR"
        })
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      // 2. Open Razorpay Modal
      if (!(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please check your internet connection.");
      }
      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SeVt7HcMK8Pjxe',
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Bus Pass Pro",
        description: `${selectedPassForPayment.type} Pass Payment`,
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // 3. Verify Payment on Backend
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                passId: selectedPassForPayment.id || (selectedPassForPayment as any)._id,
                userId: user.uid,
                userName: user.displayName,
                amount: orderData.amount
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              // Successfully Paid
              await fetchPasses();
              setShowPaymentModal(false);
              setSelectedPassForPayment(null);
              setView('history');
              triggerToast('Payment Successful! Your application is now under review.', 'success');
            } else {
              triggerToast(verifyData.error || 'Payment verification failed', 'error');
            }
          } catch (err) {
            console.error(err);
            triggerToast('Payment verification error', 'error');
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: {
          color: "#4361EE",
        },
        modal: {
          ondismiss: function() {
            setIsPaying(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        triggerToast("Payment Failed: " + response.error.description, 'error');
        setIsPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Payment initialization error:", err);
      triggerToast(err.message || "Could not start payment. Please try again.", 'error');
      setIsPaying(false);
    }
  };

  const generatePDF = async (pass: BusPass) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [100, 150]
    });

    const primaryColor = "#4361EE";
    const accentColor = "#7209B7";
    const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${pass.id}`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, scale: 4 });

      // Background
      doc.setFillColor(248, 250, 255);
      doc.rect(0, 0, 100, 150, "F");
      
      // Top accent bar
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 100, 5, "F");

      // Header Section
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(5, 10, 90, 25, 3, 3, "F");
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(5, 10, 90, 25, 3, 3, "S");

      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Bus Pass Pro", 12, 22);
      
      doc.setTextColor(accentColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CPU DIGITAL AUTHORITY", 12, 28);
      
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text("#" + (pass.id || 'TEMP').slice(-8).toUpperCase(), 90, 22, { align: 'right' });

      // Main Card Body
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(5, 40, 90, 105, 5, 5, "F");
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(5, 40, 90, 105, 5, 5, "S");

      // Identification Section
      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("PASS HOLDER NAME", 12, 50);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(11);
      doc.text(pass.userName.toUpperCase(), 12, 56);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("STUDENT ID", 12, 64);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(9);
      doc.text(pass.studentId || "NOT PROVIDED", 12, 70);

      // Route Info Section
      doc.setDrawColor(240, 240, 240);
      doc.line(10, 76, 90, 76);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("ROUTE (FROM - TO)", 12, 82);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${pass.from} to ${pass.to}`, 12, 87);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("PICKUP STOP", 12, 94);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(8);
      doc.text(pass.from, 12, 99);

      // Status and Validity
      doc.setDrawColor(240, 240, 240);
      doc.line(10, 105, 90, 105);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("DURATION", 12, 112);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(9);
      doc.text(pass.type, 12, 117);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("ISSUED ON", 50, 112);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(9);
      doc.text(formatDate(pass.issueDate), 50, 117);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("STATUS", 12, 125);
      doc.setTextColor(5, 150, 105); // Green
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(pass.status.toUpperCase(), 12, 130);

      doc.setTextColor(primaryColor);
      doc.setFontSize(7);
      doc.text("EXPIRY DATE", 50, 125);
      doc.setTextColor(219, 39, 119); // Pinkish red for expiry
      doc.setFontSize(9);
      doc.text(formatDate(pass.expiryDate), 50, 130);

      // QR Code
      doc.addImage(qrDataUrl, 'PNG', 70, 110, 20, 20);
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text("SCAN TO VERIFY", 80, 131, { align: 'center' });

      doc.save(`BusPass_${pass.userName.replace(/\s+/g, '_')}_${(pass.id || 'TEMP').slice(-4)}.pdf`);
      triggerToast('Digital pass downloaded', 'success');
    } catch (err) {
      console.error("PDF generation error:", err);
      triggerToast('Failed to generate pass', 'error');
    }
  };

  const activePass = passes.find(p => p.status === 'Active');

  const handleApply = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    const requiredFields = [
      { name: 'fullName', label: 'Full Name' },
      { name: 'studentId', label: 'Student ID' },
      { name: 'department', label: 'Department' },
      { name: 'mobile', label: 'Mobile Number' },
      { name: 'email', label: 'Email Address' },
      { name: 'from', label: 'Pickup Stop' }
    ];

    for (const field of requiredFields) {
      const val = (applyForm as any)[field.name];
      if (!val || (typeof val === 'string' && !val.trim())) {
        const input = form.querySelector(`[name="${field.name}"], [data-name="${field.name}"]`);
        if (input) {
          (input as HTMLElement).focus();
          (input as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setFormError(`Please fill ${field.label}`);
        return;
      }
    }

    if (!applyForm.idProof) {
      const uploadArea = document.getElementById('id-upload-area');
      if (uploadArea) {
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setFormError("Please upload ID Proof");
      return;
    }

    setFormError(null);

    const type = applyForm.passType as PassType;
    let multiplier = 1;
    let durationMonths = 1;

    if (type === '3 Month') {
      multiplier = 3;
      durationMonths = 3;
    } else if (type === '6 Month') {
      multiplier = 6;
      durationMonths = 6;
    } else if (type === '12 Month') {
      multiplier = 12;
      durationMonths = 12;
    }
    
    // Find price from routes
    const selectedRoute = routes.find(r => r.startPlace === applyForm.from);
    const basePrice = selectedRoute ? selectedRoute.fare : 0;
    const finalPrice = basePrice * multiplier;

    const passData = {
      userId: user?.uid || 'guest',
      userName: applyForm.fullName,
      studentId: applyForm.studentId,
      department: applyForm.department,
      year: applyForm.year,
      mobile: applyForm.mobile,
      email: applyForm.email,
      from: applyForm.from,
      to: applyForm.to,
      type: type,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + durationMonths);
        return d.toISOString().split('T')[0];
      })(),
      status: 'Pending Payment',
      price: finalPrice
    };

    try {
      const response = await fetch(API_BASE_URL + '/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passData)
      });
      const rawPass = await response.json();
      const newPass = { ...rawPass, id: rawPass._id || rawPass.id };
      setPasses(prev => [newPass, ...prev]);
      
      // Move to payment
      setSelectedPassForPayment(newPass);
      setShowPaymentModal(true);
      
      setShowApplicationForm(false);
      // Reset form
      setApplyForm({
        fullName: '',
        studentId: '',
        department: 'Computer Science',
        year: '1st Year',
        mobile: '',
        email: '',
        from: '',
        to: 'Main Campus Gate',
        idProof: null,
        passType: '1 Month'
      });
      setView('apply');
    } catch (err) {
      console.error("Failed to submit pass:", err);
    }
  };

  if ((view === 'about' || view === 'contact') && !user) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col font-sans">
        {/* Public Navbar duplicated for consistency */}
        <nav className="w-full bg-white/80 backdrop-blur-md border-b border-[#EDF2FB] px-4 lg:px-8 py-4 flex justify-between items-center fixed top-0 z-50">
          <motion.div
            onClick={() => setView('landing')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:rotate-12 transition-transform">
              <Bus className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-lg lg:text-xl text-brand-ink uppercase tracking-tight">Bus Pass Pro</span>
          </motion.div>
          <div className="flex items-center gap-2 lg:gap-8">
            <button onClick={() => setView('landing')} className="hidden sm:block text-sm font-bold text-brand-gray hover:text-brand-primary transition-colors">Home</button>
            <button onClick={() => setView('about')} className={`hidden sm:block text-sm font-bold transition-colors ${view === 'about' ? 'text-brand-primary' : 'text-brand-gray hover:text-brand-primary'}`}>About Us</button>
            <button onClick={() => setView('contact')} className={`hidden sm:block text-sm font-bold transition-colors ${view === 'contact' ? 'text-brand-primary' : 'text-brand-gray hover:text-brand-primary'}`}>Contact</button>
            <button
              onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); }}
              className="hidden md:block bg-brand-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-brand-primary/10 hover:scale-105 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); }}
              className="md:hidden bg-brand-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-xl shadow-brand-primary/10"
            >
              Sign In
            </button>
          </div>
        </nav>

        <div className="flex-1 pt-20 lg:pt-24 pb-12 px-4 max-w-6xl mx-auto w-full">
          {view === 'about' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative space-y-12"
            >
              {/* Background Decor */}
              <div className="absolute inset-0 bg-grid-pattern opacity-50 -z-10 rounded-[3rem]"></div>

              {/* Header */}
              <div className="text-center space-y-4 pt-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black uppercase tracking-widest">
                  <Info className="w-3.5 h-3.5" /> How it Works
                </div>
                <h1 className="text-5xl font-black text-brand-ink tracking-tight">Streamlined Transit Management</h1>
                <p className="text-xl text-brand-gray font-medium max-w-2xl mx-auto leading-relaxed">
                  Bus Pass Pro digitizes every step of the bus pass lifecycle—from application to issuance.
                </p>
              </div>

              {/* Top Bento Row */}
              <div className="grid lg:grid-cols-12 md:grid-cols-6 gap-6">
                {/* Micro Cards */}
                <div className="lg:col-span-4 md:col-span-3 space-y-6">
                  <div className="p-8 bg-white/80 backdrop-blur-sm rounded-[2rem] border-2 border-slate-300 shadow-sm flex flex-col justify-center">
                    <h3 className="text-xl font-black text-brand-ink mb-1">Student & admin</h3>
                    <p className="text-brand-gray font-bold text-sm">role-based flows</p>
                  </div>
                  <div className="p-8 bg-white/80 backdrop-blur-sm rounded-[2rem] border-2 border-slate-300 shadow-sm flex flex-col justify-center">
                    <h3 className="text-xl font-black text-brand-ink mb-1">QR + PDF</h3>
                    <p className="text-brand-gray font-bold text-sm">ready on approval</p>
                  </div>
                  <div className="p-8 bg-white/80 backdrop-blur-sm rounded-[2rem] border-2 border-slate-300 shadow-sm flex flex-col justify-center">
                    <h3 className="text-xl font-black text-brand-ink mb-1">Local uploads</h3>
                    <p className="text-brand-gray font-bold text-sm">ID proof supported</p>
                  </div>
                </div>

                {/* Status Tracking Card */}
                <div className="lg:col-span-4 md:col-span-3 bg-white/80 backdrop-blur-sm p-10 rounded-[2.5rem] border-2 border-brand-primary/10 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black uppercase text-brand-gray tracking-widest mb-4">Status Tracking</span>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-2xl font-black text-brand-ink">Pending</span>
                    <ArrowRight className="w-6 h-6 text-brand-gray" />
                    <span className="text-2xl font-black text-brand-primary">Approved</span>
                  </div>
                  <p className="text-brand-gray font-medium leading-relaxed">
                    Clear status labels help students know exactly what happens next in their application journey.
                  </p>
                </div>

                {/* Admin Tools Card */}
                <div className="lg:col-span-4 md:col-span-6 bg-brand-primary p-10 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20 flex flex-col text-white">
                  <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest mb-4">Admin Tools</span>
                  <h3 className="text-3xl font-black mb-6 leading-tight">Routes, payments, reports</h3>
                  <p className="font-medium opacity-90 leading-relaxed">
                    Built for quick approvals and easy route management across the entire city network.
                  </p>
                </div>
              </div>

              {/* Main Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12 pb-12">
                {[
                  {
                    icon: FileText,
                    title: 'Simple online applications',
                    desc: 'Students submit route, duration, and ID proof in one guided flow.'
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Quick admin approvals',
                    desc: 'Admins review applications, routes, and payment records from one workspace.'
                  },
                  {
                    icon: CreditCard,
                    title: 'Razorpay Integrated',
                    desc: 'Seamlessly complete secure online transactions for fast pass checkout.'
                  },
                  {
                    icon: QrCode,
                    title: 'Digital PDF passes',
                    desc: 'Approved passes are delivered as downloadable PDFs with QR-ready data.'
                  }
                ].map((feature, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border-2 border-brand-primary/10 shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div className="w-14 h-14 bg-brand-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-primary group-hover:text-white transition-colors duration-500">
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h4 className="text-xl font-black text-brand-ink mb-4 leading-snug">{feature.title}</h4>
                    <p className="text-brand-gray font-medium text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid lg:grid-cols-5 gap-8"
            >
              <div className="lg:col-span-3 space-y-8">
                <div className="bg-white rounded-[3rem] p-12 border-2 border-brand-primary/10 shadow-sm">
                  <h2 className="text-4xl font-black text-brand-ink mb-2">Speak to Support</h2>
                  <p className="text-brand-gray font-medium mb-10">Our average response time is under 15 minutes.</p>
                  
                  <form className="space-y-6" onSubmit={handleContactSubmit}>
                      {contactSubmitStatus.type && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
                          contactSubmitStatus.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {contactSubmitStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                          {contactSubmitStatus.message}
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Your Name</label>
                          <div className="relative">
                            <input 
                              ref={nameRef}
                              className={`w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 text-sm font-bold transition-all outline-none ${contactErrors.name ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-300 focus:border-brand-primary'}`} 
                              placeholder="Karan Maurya"
                              value={contactForm.name}
                              onChange={(e) => {
                                setContactForm({ ...contactForm, name: e.target.value });
                                setContactErrors({ ...contactErrors, name: false });
                                setContactSubmitStatus({ type: null, message: '' });
                              }}
                            />
                            {contactErrors.name && (
                              <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2">Fill this</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Email</label>
                          <div className="relative">
                            <input 
                              ref={emailRef}
                              className={`w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 text-sm font-bold transition-all outline-none ${contactErrors.email ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-300 focus:border-brand-primary'}`} 
                              placeholder="karan@example.com"
                              value={contactForm.email}
                              onChange={(e) => {
                                setContactForm({ ...contactForm, email: e.target.value });
                                setContactErrors({ ...contactErrors, email: false });
                                setContactSubmitStatus({ type: null, message: '' });
                              }}
                            />
                            {contactErrors.email && (
                              <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2">Fill this</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Message</label>
                        <div className="relative">
                          <textarea 
                            ref={messageRef}
                            rows={5} 
                            className={`w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 text-sm font-bold transition-all outline-none resize-none ${contactErrors.message ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-300 focus:border-brand-primary'}`} 
                            placeholder="How can we help you reach your destination?"
                            value={contactForm.message}
                            onChange={(e) => {
                              setContactForm({ ...contactForm, message: e.target.value });
                              setContactErrors({ ...contactErrors, message: false });
                              setContactSubmitStatus({ type: null, message: '' });
                            }}
                          ></textarea>
                          {contactErrors.message && (
                            <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2">Fill this</p>
                          )}
                        </div>
                      </div>
                    <button 
                      type="submit"
                      disabled={isSubmittingContact}
                      className="bg-brand-primary text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full md:w-auto disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isSubmittingContact ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : null}
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-brand-ink p-10 rounded-[3rem] text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-6">24/7 Global <br/>Hotline</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                          <Phone className="w-5 h-5" />
                        </div>
                        <p className="text-xl font-black">1-800-BUS-PRO</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                          <Mail className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold opacity-70">support@buspro.transit</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border-2 border-brand-primary/10 shadow-sm">
                   <h3 className="text-xl font-black text-brand-ink mb-4">University Campus</h3>
                   <p className="text-sm font-medium text-brand-gray leading-relaxed italic">
                     Career Point University (CPU)<br/>
                     National Highway 52, Alaniya<br/>
                     Kota, Rajasthan 325003
                   </p>
                   <div className="mt-10 aspect-video rounded-3xl overflow-hidden border-2 border-brand-primary/10 shadow-inner group relative">
                      <img 
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb_ejpPdgutI3oYUOfT_5fb5gaq0ED51_t1w&s" 
                        alt="Career Point University Campus" 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'landing' && !user) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col font-sans overflow-x-hidden">
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed inset-y-0 right-0 w-72 bg-white z-50 md:hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-[#EDF2FB]">
                  <span className="font-black text-lg text-brand-ink">Menu</span>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-brand-gray"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-col p-4 gap-2">
                  <button onClick={() => { setView('landing'); setSidebarOpen(false); }} className="text-left px-4 py-3 rounded-xl font-bold text-brand-primary hover:bg-brand-bg transition-colors">Home</button>
                  <button onClick={() => { setView('about'); setSidebarOpen(false); }} className="text-left px-4 py-3 rounded-xl font-bold text-brand-gray hover:bg-brand-bg hover:text-brand-primary transition-colors">About Us</button>
                  <button onClick={() => { setView('contact'); setSidebarOpen(false); }} className="text-left px-4 py-3 rounded-xl font-bold text-brand-gray hover:bg-brand-bg hover:text-brand-primary transition-colors">Contact</button>
                  <div className="border-t border-[#EDF2FB] my-2"></div>
                  <button 
                    onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); setSidebarOpen(false); }}
                    className="text-left px-4 py-3 rounded-xl font-bold text-brand-ink hover:bg-brand-bg hover:text-brand-primary transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Portal
                  </button>
                  <button 
                    onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); setSidebarOpen(false); }}
                    className="mt-2 bg-brand-primary text-white px-4 py-3 rounded-xl font-black text-sm shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
                  >
                    Sign In
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Public Navbar */}
        <nav className="w-full bg-white/80 backdrop-blur-md border-b border-[#EDF2FB] px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center fixed top-0 z-50">
          <motion.div 
            onClick={() => setView('landing')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:rotate-12 transition-transform">
              <Bus className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-lg sm:text-xl text-brand-ink uppercase tracking-tight">Bus Pass Pro</span>
          </motion.div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <button onClick={() => setView('landing')} className="text-sm font-bold text-brand-primary transition-colors">Home</button>
            <button onClick={() => setView('about')} className="text-sm font-bold text-brand-gray hover:text-brand-primary transition-colors font-medium">About Us</button>
            <button onClick={() => setView('contact')} className="text-sm font-bold text-brand-gray hover:text-brand-primary transition-colors font-medium">Contact</button>
            <button 
              onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); }}
              className="text-sm font-extrabold text-brand-ink hover:text-brand-primary transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </button>
            <button 
              onClick={() => { setAuthMessage(null); setAuthMode('signin'); setView('auth'); }}
              className="bg-brand-primary text-white px-5 lg:px-7 py-2.5 lg:py-3 rounded-xl font-black text-sm shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all"
            >
              Sign In
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-white border-2 border-slate-300 text-brand-ink hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </nav>

        {/* Hero Section */}
        <header className="relative pt-32 pb-24 px-8 overflow-hidden">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 z-10"
            >
              <h1 className="text-7xl font-black text-brand-ink leading-[1.05] tracking-tight">
                Your City. <br/>
                <span className="text-brand-primary">One Pass.</span> <br/>
                No Limits.
              </h1>
              <p className="text-xl text-brand-gray font-medium leading-relaxed max-w-lg">
                The most advanced digital bus pass system. Apply, verify, and travel instantly with Bus Pass Pro's secure cloud tech.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button 
                  onClick={() => { setAuthMessage(null); setView('auth'); }}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-2xl shadow-brand-primary/20"
                >
                  Apply for Pass
                </button>
                <button 
                  onClick={() => setView('about')}
                  className="bg-white hover:bg-gray-50 text-brand-ink px-10 py-5 rounded-2xl font-black text-lg transition-all border-2 border-brand-primary/10 shadow-sm"
                >
                  How it Works
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-10 bg-brand-primary/10 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
              <div className="relative aspect-square max-w-lg mx-auto">
                 <img 
                    src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800&h=800" 
                    alt="University Charter Bus" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-[3rem] shadow-2xl transform rotate-3"
                 />
              </div>
            </motion.div>
          </div>
          <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl"></div>
        </header>

        {/* Feature Grid */}
        <section className="bg-white py-24 px-8 border-t-2 border-brand-primary/10">
           <div className="max-w-6xl mx-auto space-y-16">
              <div className="text-center space-y-4">
                 <h2 className="text-4xl font-black text-brand-ink">Built for Modern Commuters</h2>
                 <p className="text-brand-gray font-medium">Everything you need to navigate the city seamlessly.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { icon: Wallet, title: 'Smart Wallet', text: 'Top-up your transit balance instantly with multiple payment modes.' },
                   { icon: ShieldCheck, title: 'Digital Proof', text: 'Secure QR-code passes accepted on all major city routes.' },
                   { icon: Users, title: 'Student/Senior', text: 'Special concessional categories with seamless doc verification.' }
                 ].map((feat, i) => (
                   <div key={i} className="p-10 rounded-[2.5rem] bg-brand-bg/50 hover:bg-white border-2 border-slate-300 hover:border-brand-primary transition-all group">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-colors">
                         <feat.icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-black text-brand-ink mb-2">{feat.title}</h4>
                      <p className="text-brand-gray font-medium text-sm leading-relaxed">{feat.text}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Brand Footer */}
        <footer className="bg-brand-ink text-white py-20 px-8">
           <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
              <div className="col-span-2 space-y-6">
                 <motion.div 
                   onClick={() => setView('landing')}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="flex items-center gap-2 cursor-pointer group w-fit"
                 >
                    <Bus className="text-brand-primary w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="font-black text-2xl uppercase tracking-tighter">Bus Pass Pro</span>
                 </motion.div>
                 <p className="text-white/60 font-medium max-w-sm">
                    Reimagining urban transportation through digital innovation. Secure, fast, and built for everyone.
                 </p>
              </div>
              <div className="space-y-4">
                 <h5 className="font-black text-sm uppercase tracking-widest text-brand-primary">Navigation</h5>
                 <ul className="space-y-2 text-sm font-bold opacity-70">
                    <li className="hover:text-white cursor-pointer" onClick={() => setView('landing')}>Home</li>
                    <li className="hover:text-white cursor-pointer" onClick={() => setView('about')}>About Us</li>
                    <li className="hover:text-white cursor-pointer" onClick={() => setView('contact')}>Support</li>
                 </ul>
              </div>
              <div className="space-y-4">
                 <h5 className="font-black text-sm uppercase tracking-widest text-brand-primary">Support</h5>
                 <p className="text-sm font-bold opacity-70">help@buspro.transit</p>
                 <div className="flex gap-4 pt-2">
                    <Globe className="w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
                    <Heart className="w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer transition-opacity" />
                 </div>
              </div>
           </div>
           <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
              © 2026 Bus Pass Pro Transit Solutions. Designed by Karan Maurya.
           </div>
        </footer>
      </div>
    );
  }

  if (view === 'verify') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-200 overflow-hidden"
        >
          <div className="bg-brand-primary p-12 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <Bus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h2 className="text-3xl font-black mb-2">Pass Verification</h2>
              <p className="opacity-80 text-sm font-medium">Official Digital Transit Verification System</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-10 space-y-8">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
                <p className="font-bold text-brand-gray uppercase tracking-widest text-xs">Authenticating Pass...</p>
              </div>
            ) : verifyError ? (
              <div className="text-center py-10 space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-ink">{verifyError}</h3>
                  <p className="text-brand-gray font-medium">This pass could not be verified by our system.</p>
                </div>
                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('verify');
                    window.history.pushState({}, '', url.toString());
                    setView('landing');
                  }}
                  className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105"
                >
                  Return Home
                </button>
              </div>
            ) : verificationPass ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-200 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Status</p>
                      <p className="text-lg font-black text-emerald-900 tracking-tight">Verified & Active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Last Check</p>
                    <p className="text-xs font-bold text-emerald-800">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Pass Holder</p>
                    <p className="font-bold text-brand-ink">{verificationPass.userName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Student ID</p>
                    <p className="font-bold text-brand-ink">{verificationPass.studentId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Route</p>
                    <p className="font-bold text-brand-ink">{verificationPass.from} → {verificationPass.to}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Pass Type</p>
                    <p className="font-bold text-brand-ink">{verificationPass.type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Valid Until</p>
                    <p className="font-bold text-pink-600">{formatDate(verificationPass.expiryDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Pass ID</p>
                    <p className="font-mono text-[9px] font-bold text-brand-gray">{verificationPass.id}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('verify');
                    window.history.pushState({}, '', url.toString());
                    setView('landing');
                  }}
                  className="w-full bg-brand-ink text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all"
                >
                  Close Verification
                </button>
              </div>
            ) : (
              <div className="text-center py-10">
                <p>No verification data available.</p>
                <button onClick={() => setView('landing')}>Home</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'auth' && !user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-brand-primary/5 border border-[#EDF2FB] overflow-hidden"
        >
          <div className="bg-brand-primary p-12 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <motion.div 
                onClick={() => setView('landing')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md cursor-pointer group"
              >
                <Bus className="text-white w-6 h-6 group-hover:rotate-12 transition-transform" />
              </motion.div>
              <h2 className="text-3xl font-black mb-2">{authMode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="opacity-80 text-sm font-medium">
                {authMode === 'signin' ? 'Manage your digital transit cards' : 'Start your modern transit journey'}
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <form key={authMode} className="p-10 space-y-6" onSubmit={handleAuth}>
            {authMessage && (
              <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 ${
                authMessage.startsWith('Error') 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {authMessage.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {authMessage}
              </div>
            )}
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray group-focus-within:text-brand-primary transition-colors" />
                  <input 
                    type="text" 
                    name="displayName"
                    placeholder="Karan Commuter" 
                    className="w-full bg-brand-bg border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold transition-all outline-none"
                    required 
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="email" 
                  name="email"
                  placeholder="name@example.com" 
                  className="w-full bg-brand-bg border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold transition-all outline-none"
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  className="w-full bg-brand-bg border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold transition-all outline-none"
                  required 
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-primary/10 transition-all active:scale-[0.98] mt-4"
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthMessage(null);
                }}
                className="text-xs font-bold text-brand-gray hover:text-brand-primary transition-colors"
              >
                {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setView('landing');
                setAuthMessage(null);
              }}
              className="w-full text-xs font-bold text-brand-gray/50 hover:text-brand-gray transition-colors mt-2"
            >
              Back to Home
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-white border-r-2 border-[#EDF2FB] flex flex-col p-6 lg:p-8 z-50 overflow-hidden transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <motion.div 
          onClick={() => {
            if (user?.role === 'Admin') {
              if (window.confirm("Do you want to logout?")) {
                handleLogout();
              }
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 mb-12 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-brand-primary/20 group-hover:rotate-12 transition-transform">
            <Bus className="text-white w-4 h-4" />
          </div>
          <span className="font-black text-2xl tracking-tight text-brand-primary">Bus Pass Pro</span>
        </motion.div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-brand-gray hover:text-brand-ink"
        >
          <X className="w-5 h-5" />
        </button>

        <nav className="space-y-2 flex-1 mt-8 lg:mt-0">
          {user?.role === 'Admin' ? (
            <>
              <button
                onClick={() => setView('admin')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all ${
                  view === 'admin' 
                    ? 'bg-[#EBF0FF] text-brand-primary' 
                    : 'text-brand-gray hover:text-brand-ink hover:bg-gray-50'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${view === 'admin' ? 'text-brand-primary' : 'text-brand-gray'}`} />
                Admin Panel
              </button>
            </>
          ) : (
            [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'apply', label: 'My Passes', icon: CreditCard },
              { id: 'history', label: 'History', icon: History },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as any);
                  if (item.id !== 'apply') setShowApplicationForm(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all ${
                  view === item.id 
                    ? 'bg-[#EBF0FF] text-brand-primary' 
                    : 'text-brand-gray hover:text-brand-ink hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-4 h-4 ${view === item.id ? 'text-brand-primary' : 'text-brand-gray'}`} />
                {item.label}
              </button>
            ))
          )}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm text-red-400 hover:bg-red-50 transition-all font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Mobile Header with Hamburger */}
        <header className="flex items-center gap-4 mb-6 lg:mb-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white border-2 border-slate-300 text-brand-ink"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-brand-ink flex-1">
            {view === 'apply' ? (showApplicationForm ? 'New Application' : 'My Active Passes') : 
             view === 'dashboard' ? 'Welcome To Our Bus Pass Pro' :
             view === 'admin' ? 'Administrative Control' : 
             view === 'about' ? 'Our Story' :
             view === 'contact' ? 'Support Portal' : 
             view === 'history' ? 'Transaction History' : 'Home'}
          </h1>
          <div className="hidden sm:flex bg-white px-3 lg:px-5 py-2 rounded-full shadow-sm items-center gap-2 lg:gap-3 border border-white">
            <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full ${user?.role === 'Admin' ? 'bg-red-100' : 'bg-brand-accent'} flex items-center justify-center shadow-inner`}>
               {user?.role === 'Admin' ? <ShieldCheck className="w-4 h-4 text-red-600" /> : <User className="w-4 h-4 text-brand-ink mt-0.5" />}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="font-bold text-sm text-brand-ink leading-none">{user?.displayName}</span>
              <span className="text-[10px] font-black text-brand-gray uppercase mt-1 leading-none">{user?.role}</span>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* System Specifications */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                <div className="lg:col-span-2 bg-brand-ink p-6 lg:p-12 rounded-2xl lg:rounded-[2.5rem] text-white relative overflow-hidden group">
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-3xl font-black tracking-tight leading-tight">Ready to start your <br/>commuter journey?</h3>
                    <p className="text-white/60 font-medium max-w-md leading-relaxed">
                      Bus Pass Pro provides a secure, encrypted digital wallet for all your transit passes. Get instant updates on route changes and easy renewal options.
                    </p>
                    <button 
                      onClick={() => {
                        setView('apply');
                        setShowApplicationForm(true);
                      }}
                      className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                      <PlusCircle className="w-6 h-6" />
                      Apply for New Pass
                    </button>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl group-hover:bg-brand-primary/30 transition-all"></div>
                </div>

                <div className="bg-white p-6 lg:p-10 rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-300 shadow-sm flex flex-col justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-brand-bg rounded-3xl flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-10 h-10 text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-brand-ink mb-2">Verified Security</h4>
                    <p className="text-brand-gray text-sm font-medium">Your data is protected with enterprise-grade encryption and secure document handling.</p>
                  </div>
                  <div className="pt-4 flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">System Online</span>
                  </div>
                </div>
              </div>

              {/* How it Works Section */}
              <section className="bg-white rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-12 border-2 border-slate-300 shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                  <h2 className="text-2xl lg:text-4xl font-black text-brand-ink mb-6 lg:mb-10 tracking-tight">How it Works</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
                    {[
                      { step: '01', title: 'Fill Application', text: 'Provide your details and documentation for verification.', icon: CreditCard },
                      { step: '02', title: 'Make Payment', text: 'Once approved, pay for your monthly or annual pass.', icon: Wallet },
                      { step: '03', title: 'Travel Anytime', text: 'Get your digital pass and enjoy unlimited city transit.', icon: Bus }
                    ].map((step, i) => (
                      <div key={i} className="relative group">
                        <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <step.icon className="w-8 h-8 text-brand-primary" />
                        </div>
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2 block">{step.step} Step</span>
                        <h3 className="text-xl font-black text-brand-ink mb-3">{step.title}</h3>
                        <p className="text-brand-gray font-medium text-sm leading-relaxed">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              </section>

              {/* Stats / Specs row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
                {[
                  { label: 'Active Routes', value: '42+', icon: Bus },
                  { label: 'Daily Trips', value: '1.2k', icon: Clock },
                  { label: 'Avg Waiting', value: '8m', icon: Clock },
                  { label: 'Commuters', value: '50k+', icon: Users }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex items-center gap-4 group hover:border-brand-primary transition-all">
                    <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center group-hover:bg-brand-primary transition-colors">
                      <stat.icon className="w-6 h-6 text-brand-primary group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-brand-ink">{stat.value}</p>
                      <p className="text-[10px] font-bold text-brand-gray uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : view === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Admin Sub-navigation */}
                  <div className="flex flex-wrap gap-2 lg:gap-4 p-1.5 bg-white border-2 border-slate-300 rounded-2xl w-full lg:w-fit shadow-sm overflow-x-auto">
                {[
                  { id: 'applications', label: 'Applications', icon: CreditCard },
                  { id: 'routes', label: 'Bus Routes', icon: Bus },
                  { id: 'departments', label: 'Departments', icon: LayoutDashboard },
                  { id: 'payments', label: 'Payments', icon: Wallet },
                  { id: 'users', label: 'User Roles', icon: Users },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAdminView(tab.id as AdminSubView)}
                    className={`flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                      adminView === tab.id 
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                        : 'text-brand-gray hover:text-brand-ink hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {adminView === 'applications' && (
                <div className="space-y-6 lg:space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                    {[
                      { label: 'Approved Request', value: allPasses.filter(p => p.status === 'Approved' || p.status === 'Active').length.toString().padStart(2, '0') },
                      { label: 'Pending Approval', value: allPasses.filter(p => p.status === 'Pending').length.toString().padStart(2, '0') },
                      { label: 'Revenue Generated', value: `₹${allPasses.reduce((acc, curr) => acc + curr.price, 0).toLocaleString('en-IN')}` },
                      { label: 'System Health', value: 'OPTIMAL' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 border-slate-300 shadow-sm">
                        <p className="text-[9px] sm:text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1 lg:mb-2">{stat.label}</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-black text-brand-ink">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] shadow-sm border-2 border-slate-300 overflow-hidden">
                    <div className="p-3 sm:p-4 lg:p-8 border-b-2 border-slate-300 flex justify-between items-center bg-gray-50/50">
                      <h2 className="text-lg sm:text-xl font-black text-brand-ink">Application Management</h2>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-white border-b-2 border-brand-primary/10">
                        <tr>
                          <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">S.No</th>
                          <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Applicant</th>
                          <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Type</th>
                          <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Applied On</th>
                          <th className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F4FF]">
                        {allPasses.filter(p => 
                          p.userName.toLowerCase().includes(appSearchTerm.toLowerCase()) || 
                          p.userId.toLowerCase().includes(appSearchTerm.toLowerCase()) ||
                          p.status?.toLowerCase().includes(appSearchTerm.toLowerCase())
                        ).map((p, i) => (
                          <tr key={p.id || (p as any)._id || `admin-p-${i}`} className="hover:bg-brand-bg/20 transition-colors">
                            <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-sm font-bold text-brand-gray">
                              {i + 1}
                            </td>
                            <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-bold text-brand-ink">{p.userName}</p>
                                  <p className="text-[10px] text-brand-gray font-medium">ID: {p.userId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                              <span className="text-xs font-bold text-brand-ink">{p.type}</span>
                            </td>
                            <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                              <p className="text-xs font-bold text-brand-ink">{formatDate(p.issueDate)}</p>
                            </td>
                            <td className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
                              <div className="flex items-center justify-end gap-2">
                                {p.status === 'Pending' ? (
                                  <>
                                   <button 
                                     onClick={() => handleUpdatePassStatus(p.id || (p as any)._id, 'Approved')}
                                     className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                     title="Approve"
                                   >
                                     <CheckCircle className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => handleUpdatePassStatus(p.id || (p as any)._id, 'Rejected')}
                                     className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                     title="Reject"
                                   >
                                     <XCircle className="w-4 h-4" />
                                   </button>
                                  </>
                                ) : (p.status === 'Active' || p.status === 'Approved') ? (
                                  null
                                ) : p.status === 'Pending Payment' ? (
                                  <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full">
                                     Unpaid
                                  </span>
                                ) : (
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    p.status === 'Active' ? 'bg-[#EBF0FF] text-brand-primary' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {p.status}
                                  </span>
                                )}
                                <button 
                                  onClick={() => handleDeletePass(p.id || (p as any)._id)}
                                  disabled={deletingIds.has(p.id || (p as any)._id)}
                                  className={`p-2 sm:p-2.5 rounded-xl transition-all shadow-sm border ${
                                    deletingIds.has(p.id || (p as any)._id)
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                  }`}
                                  title="Delete Application"
                                >
                                  {deletingIds.has(p.id || (p as any)._id) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}

              {adminView === 'departments' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-ink">Department Management</h2>
                    <button 
                      onClick={() => setDeptModal({ isOpen: true, department: null, isEditing: false })}
                      className="bg-brand-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-extrabold flex items-center gap-2 shadow-lg shadow-brand-primary/20 text-sm sm:text-base whitespace-nowrap"
                    >
                      <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Create Department</span>
                      <span className="sm:hidden">Create</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {departments.map((dept, i) => (
                      <div key={dept.id || dept._id || `dept-${i}`} className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border-2 border-slate-400 shadow-md group hover:shadow-xl hover:shadow-brand-primary/10 transition-all">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-bg rounded-xl sm:rounded-2xl flex items-center justify-center">
                            <LayoutDashboard className="text-brand-primary w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="flex gap-2">
                            <motion.button 
                              whileTap={{ opacity: [1, 0.2, 1], scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => setDeptModal({ isOpen: true, department: dept, isEditing: true })}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-100"
                            >
                              Edit
                            </motion.button>
                            <motion.button 
                              whileTap={{ opacity: [1, 0.2, 1], scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => handleDeleteDept(dept.id || (dept as any)._id)}
                              disabled={deletingIds.has(dept.id || (dept as any)._id)}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                                deletingIds.has(dept.id || (dept as any)._id) 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                              }`}
                            >
                              {deletingIds.has(dept.id || (dept as any)._id) ? 'Deleting...' : 'Delete'}
                            </motion.button>
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-ink mb-1">{dept.name}</h3>
                        <p className="text-sm font-bold text-brand-gray mb-4 sm:mb-6">
                          {dept.description || 'No description provided.'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {deptModal.isOpen && (
                    <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl"
                      >
                        <h3 className="text-xl sm:text-2xl font-black text-brand-ink mb-6 sm:mb-8">{deptModal.isEditing ? 'Update Department' : 'New Department'}</h3>
                        <form onSubmit={handleSaveDept} className="space-y-4 sm:space-y-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Department Name</label>
                            <input name="name" defaultValue={deptModal.department?.name} placeholder="e.g. Computer Science" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Description</label>
                            <textarea name="description" defaultValue={deptModal.department?.description} placeholder="Short description..." rows={3} className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none resize-none"></textarea>
                          </div>
                          <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4">
                             <button type="button" onClick={() => setDeptModal({ isOpen: false, department: null, isEditing: false })} className="flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-brand-gray hover:bg-gray-100 transition-all text-sm sm:text-base">Cancel</button>
                             <button type="submit" className="flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all text-sm sm:text-base">Save Department</button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}

              {adminView === 'routes' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-black text-brand-ink">Bus Route & Fare Management</h2>
                    <button 
                      onClick={() => setRouteModal({ isOpen: true, route: null, isEditing: false })}
                      className="bg-brand-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-extrabold flex items-center gap-2 shadow-lg shadow-brand-primary/20 text-sm sm:text-base whitespace-nowrap"
                    >
                      <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Add New Route</span>
                      <span className="sm:hidden">Add Route</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {routes.map((route, i) => (
                      <div key={route.id || route._id || `route-${i}`} className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border-2 border-slate-400 shadow-md group hover:shadow-xl hover:shadow-brand-primary/10 transition-all">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-bg rounded-xl sm:rounded-2xl flex items-center justify-center">
                            <Bus className="text-brand-primary w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="flex gap-2">
                            <motion.button 
                              whileTap={{ opacity: [1, 0.2, 1], scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => setRouteModal({ isOpen: true, route, isEditing: true })}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-100"
                            >
                              Edit
                            </motion.button>
                            <motion.button 
                              whileTap={{ opacity: [1, 0.2, 1], scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => handleDeleteRoute(route.id || (route as any)._id)}
                              disabled={deletingIds.has(route.id || (route as any)._id)}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                                deletingIds.has(route.id || (route as any)._id) 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                              }`}
                            >
                              {deletingIds.has(route.id || (route as any)._id) ? 'Deleting...' : 'Delete'}
                            </motion.button>
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-ink mb-1">{route.routeName}</h3>
                        <p className="text-sm font-bold text-brand-gray flex items-center gap-2 mb-2">
                          {route.startPlace} <ChevronRight className="w-3 h-3" /> {route.endPlace}
                        </p>
                        <p className="text-[10px] font-black uppercase text-brand-primary tracking-widest mb-4 sm:mb-6">Dist: {route.distance} KM</p>
                        <div className="pt-4 sm:pt-6 border-t-2 border-brand-primary/10 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-brand-gray tracking-widest">Fare</span>
                          <span className="text-xl sm:text-2xl font-black text-brand-primary">₹{route.fare}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {routeModal.isOpen && (
                    <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl"
                      >
                        <h3 className="text-xl sm:text-2xl font-black text-brand-ink mb-6 sm:mb-8">{routeModal.isEditing ? 'Update Route' : 'New Bus Route'}</h3>
                        <form onSubmit={handleSaveRoute} className="space-y-4 sm:space-y-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Route Name</label>
                            <input name="routeName" defaultValue={routeModal.route?.routeName} placeholder="e.g. Line 42" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Start Place</label>
                               <input name="startPlace" defaultValue={routeModal.route?.startPlace} placeholder="Origin" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">End Place</label>
                               <input name="endPlace" defaultValue={routeModal.route?.endPlace} placeholder="End Point" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                             </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Distance (KM)</label>
                               <input name="distance" type="number" step="0.1" defaultValue={routeModal.route?.distance} placeholder="In Kilometers" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Fare (₹)</label>
                               <input name="fare" type="number" defaultValue={routeModal.route?.fare} placeholder="Price in INR" className="w-full bg-brand-bg rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none" required />
                             </div>
                          </div>
                          <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4">
                             <button type="button" onClick={() => setRouteModal({ isOpen: false, route: null, isEditing: false })} className="flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-brand-gray hover:bg-gray-100 transition-all text-sm sm:text-base">Cancel</button>
                             <button type="submit" className="flex-1 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all text-sm sm:text-base">Save Route</button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}

              {adminView === 'payments' && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-300 overflow-hidden shadow-sm">
                  <div className="p-8 border-b-2 border-slate-300 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-brand-ink">Payment Records</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-[#F0F4FF]">
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Transaction</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">User</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Date</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F4FF]">
                        {payments.filter(pay => 
                          pay.transactionId.toLowerCase().includes(paymentSearchTerm.toLowerCase()) || 
                          pay.userName.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
                          pay.passId.toLowerCase().includes(paymentSearchTerm.toLowerCase())
                        ).length > 0 ? payments.filter(pay => 
                          pay.transactionId.toLowerCase().includes(paymentSearchTerm.toLowerCase()) || 
                          pay.userName.toLowerCase().includes(paymentSearchTerm.toLowerCase()) ||
                          pay.passId.toLowerCase().includes(paymentSearchTerm.toLowerCase())
                        ).map((pay, i) => (
                          <tr key={pay.id || pay._id || `pay-${i}`} className="hover:bg-brand-bg/20 transition-colors">
                            <td className="px-8 py-5">
                               <p className="text-xs font-mono font-bold text-brand-ink">{pay.transactionId}</p>
                               <p className="text-[10px] text-brand-gray font-medium">Pass ID: {pay.passId}</p>
                            </td>
                            <td className="px-8 py-5">
                               <p className="text-sm font-bold text-brand-ink">{pay.userName}</p>
                               <p className="text-[10px] text-brand-gray font-medium font-mono tracking-tighter self-start inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 border border-slate-200 mt-1">₹{pay.amount.toLocaleString()}</p>
                            </td>
                            <td className="px-8 py-5">
                               <p className="text-xs font-bold text-brand-gray">{formatDate(pay.date)}</p>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <div className="flex justify-end gap-2">
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg self-center">
                                      {pay.status}
                                  </span>
                                  <button 
                                    onClick={() => handleDeletePayment(pay.id || (pay as any)._id)}
                                    disabled={deletingIds.has(pay.id || (pay as any)._id)}
                                    className={`p-2 rounded-lg transition-all shadow-sm border ${
                                      deletingIds.has(pay.id || (pay as any)._id)
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                    }`}
                                    title="Delete Record"
                                  >
                                    {deletingIds.has(pay.id || (pay as any)._id) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                               </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                               <div className="flex flex-col items-center gap-4 text-brand-gray">
                                  <CreditCard className="w-12 h-12 opacity-20" />
                                  <p className="text-sm font-bold">No payment records found yet.</p>
                               </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminView === 'users' && (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-300 overflow-hidden shadow-sm">
                  <div className="p-8 border-b-2 border-slate-300 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-brand-ink">User Role Management</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-[#F0F4FF]">
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">User Details</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Email</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest">Current Role</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F4FF]">
                        {allUsers.filter(u => 
                          u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                        ).length > 0 ? allUsers.filter(u => 
                          u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                        ).map((u, i) => (
                          <tr key={u.uid || u.id || `user-${i}`} className="hover:bg-brand-bg/20 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${u.role === 'Admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-brand-gray'}`}>
                                  {u.displayName?.charAt(0) || 'U'}
                                </div>
                                <p className="text-sm font-bold text-brand-ink">{u.displayName}</p>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-xs font-bold text-brand-gray">{u.email}</p>
                            </td>
                            <td className="px-8 py-5">
                               <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${u.role === 'Admin' ? 'bg-red-50 text-red-700' : 'bg-brand-bg text-brand-primary'}`}>
                                  {u.role}
                               </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button 
                                onClick={() => handleDeleteUser(u.uid || u.id || (u as any)._id)}
                                disabled={deletingIds.has(u.uid || u.id || (u as any)._id)}
                                className={`p-2 rounded-lg transition-all shadow-sm border ${
                                  deletingIds.has(u.uid || u.id || (u as any)._id)
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                  : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                }`}
                                title="Delete User"
                              >
                                {deletingIds.has(u.uid || u.id || (u as any)._id) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={3} className="px-8 py-20 text-center">
                               <div className="flex flex-col items-center gap-4 text-brand-gray">
                                  <Users className="w-12 h-12 opacity-20" />
                                  <p className="text-sm font-bold">No users found.</p>
                               </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          ) : view === 'about' ? (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-12 border-2 border-brand-primary/10"
            >
              <h2 className="text-4xl font-black text-brand-ink mb-8">Our Journey</h2>
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                  <p className="text-brand-gray font-medium leading-relaxed">
                    Bus Pass Pro was created to bridge the gap between traditional transit systems and the modern digital native. We believe that applying for a bus pass should be as easy as ordering a coffee.
                  </p>
                  <p className="text-brand-gray font-medium leading-relaxed">
                    Designed by Karan, our platform serves over 50,000 commuters daily, streamlining operations for city transit authorities while providing users with instant, digital-first access to transportation.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-brand-bg rounded-3xl text-center">
                    <p className="text-3xl font-black text-brand-primary mb-1">50k+</p>
                    <p className="text-[10px] font-bold text-brand-gray uppercase tracking-widest">Daily Users</p>
                  </div>
                  <div className="p-6 bg-brand-bg rounded-3xl text-center border-2 border-brand-primary/10">
                    <p className="text-3xl font-black text-brand-primary mb-1">12+</p>
                    <p className="text-[10px] font-bold text-brand-gray uppercase tracking-widest">Cities</p>
                  </div>
                  <div className="p-6 bg-brand-primary rounded-3xl text-center col-span-2">
                    <p className="text-3xl font-black text-white mb-1">99.9%</p>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Uptime Reliance</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'contact' ? (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* 4K Clear Full Image Section */}
              <div className="w-full bg-white rounded-[3.5rem] overflow-hidden border-2 border-brand-primary/10 shadow-2xl group relative">
                <div className="relative aspect-[16/7] md:aspect-[21/9] overflow-hidden bg-brand-bg">
                    <img 
                      src="https://images.shiksha.com/mediadata/images/1572948639phptk0D0O.jpeg" 
                      alt="Career Point University Campus Kota"
                      className="w-full h-full object-cover transition-all duration-[3000ms] group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 via-transparent to-black/20 p-12 flex flex-col justify-end">
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-4">
                                <span className="bg-brand-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Official Campus</span>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Kota, Rajasthan</span>
                             </div>
                             <h2 className="text-white text-5xl font-black leading-tight drop-shadow-2xl tracking-tighter decoration-brand-accent decoration-4 underline-offset-8">
                               Career Point University
                             </h2>
                             <p className="text-brand-accent text-xl font-black italic tracking-[0.2em] drop-shadow-lg opacity-90">
                               CHASE YOUR DREAMS & UNLOCK YOUR FUTURE
                             </p>
                          </div>
                        </motion.div>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                 <div className="col-span-2 bg-white rounded-[2.5rem] p-12 border-2 border-slate-300 shadow-sm relative overflow-hidden">
                 <div className="mb-10">
                    <h2 className="text-5xl font-black text-brand-ink mb-3 tracking-tight">Speak to Support</h2>
                    <p className="text-brand-gray font-medium text-lg">Our average response time is under 15 minutes.</p>
                 </div>

                 <form className="space-y-8" onSubmit={handleContactSubmit}>
                    {contactSubmitStatus.type && (
                      <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
                        contactSubmitStatus.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {contactSubmitStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                        {contactSubmitStatus.message}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Your Name</label>
                          <div className="relative">
                            <input 
                              ref={nameRef}
                              className={`w-full bg-[#F8FAFF] border-2 rounded-2xl px-6 py-5 text-sm font-bold transition-all outline-none text-brand-ink ${contactErrors.name ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-400 focus:border-brand-primary'}`} 
                              placeholder="Karan Maurya"
                              value={contactForm.name}
                              onChange={(e) => {
                                setContactForm({ ...contactForm, name: e.target.value });
                                setContactErrors({ ...contactErrors, name: false });
                                setContactSubmitStatus({ type: null, message: '' });
                              }}
                            />
                            {contactErrors.name && (
                              <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2 rounded-lg">Fill this</p>
                            )}
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Email</label>
                          <div className="relative">
                             <input 
                               ref={emailRef}
                               type="email"
                               className={`w-full bg-[#F8FAFF] border-2 rounded-2xl px-6 py-5 text-sm font-bold transition-all outline-none text-brand-ink ${contactErrors.email ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-400 focus:border-brand-primary'}`} 
                               placeholder="karan@example.com"
                               value={contactForm.email}
                               onChange={(e) => {
                                 setContactForm({ ...contactForm, email: e.target.value });
                                 setContactErrors({ ...contactErrors, email: false });
                                 setContactSubmitStatus({ type: null, message: '' });
                               }}
                             />
                             {contactErrors.email && (
                              <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2 rounded-lg">Fill this</p>
                            )}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Message</label>
                       <div className="relative">
                          <textarea 
                             ref={messageRef}
                             rows={6} 
                             className={`w-full bg-[#F8FAFF] border-2 rounded-2xl px-6 py-5 text-sm font-bold transition-all outline-none resize-none text-brand-ink ${contactErrors.message ? 'border-red-500 focus:ring-4 focus:ring-red-100' : 'border-slate-400 focus:border-brand-primary'}`} 
                             placeholder="How can we help you reach your destination?"
                             value={contactForm.message}
                             onChange={(e) => {
                               setContactForm({ ...contactForm, message: e.target.value });
                               setContactErrors({ ...contactErrors, message: false });
                               setContactSubmitStatus({ type: null, message: '' });
                             }}
                           ></textarea>
                           {contactErrors.message && (
                             <p className="absolute -top-6 right-2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-2 rounded-lg">Fill this</p>
                           )}
                       </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingContact}
                      className="bg-brand-primary text-white px-12 py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3"
                    >
                       {isSubmittingContact ? (
                         <RefreshCw className="w-6 h-6 animate-spin" />
                       ) : null}
                       Send Message
                    </button>
                 </form>

                 {/* Pass Details Modal */}
               <AnimatePresence>
                 {viewingPassDetails && (
                   <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.9, y: 20 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 20 }}
                       className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
                     >
                       <div className="bg-brand-bg p-8 flex justify-between items-center border-b-2 border-slate-200">
                         <div>
                            <h3 className="text-2xl font-black text-brand-ink">Application Details</h3>
                            <p className="text-xs font-bold text-brand-gray uppercase tracking-widest mt-1">Ref: {viewingPassDetails.id}</p>
                         </div>
                         <button 
                           onClick={() => setViewingPassDetails(null)}
                           className="p-2 bg-white/50 hover:bg-white rounded-xl transition-colors shadow-sm"
                         >
                           <X className="w-6 h-6 text-brand-gray" />
                         </button>
                       </div>
                       
                       <div className="p-8 grid grid-cols-2 gap-8">
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Student Name</p>
                               <p className="text-lg font-black text-brand-ink">{viewingPassDetails.userName}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Student ID</p>
                               <p className="font-bold text-brand-ink">{(viewingPassDetails as any).studentId || 'N/A'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Department / Year</p>
                               <p className="font-bold text-brand-ink">{(viewingPassDetails as any).department} - {(viewingPassDetails as any).year}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Pass Type</p>
                               <p className="font-bold text-brand-primary">{viewingPassDetails.type}</p>
                            </div>
                         </div>
                         
                         <div className="space-y-6">
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Contact Number</p>
                               <p className="font-bold text-brand-ink">{(viewingPassDetails as any).mobile || 'N/A'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Email Address</p>
                               <p className="font-bold text-brand-ink">{(viewingPassDetails as any).email || 'N/A'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Route (From → To)</p>
                               <p className="font-bold text-brand-ink">{(viewingPassDetails as any).from} → {(viewingPassDetails as any).to}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Status</p>
                               <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                 viewingPassDetails.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                                 viewingPassDetails.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                 'bg-gray-100 text-gray-600'
                               }`}>
                                 {viewingPassDetails.status}
                               </span>
                            </div>
                         </div>
                       </div>
                       
                       <div className="p-8 bg-gray-50 flex justify-end gap-4 border-t-2 border-slate-200">
                          <button 
                            onClick={() => setViewingPassDetails(null)}
                            className="px-8 py-3 rounded-2xl font-bold bg-white border-2 border-slate-300 text-brand-gray hover:bg-gray-100 transition-all"
                          >
                            Close
                          </button>
                          {viewingPassDetails.status === 'Active' && (
                             <button 
                               onClick={() => generatePDF(viewingPassDetails)}
                               className="px-8 py-3 rounded-2xl font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                             >
                               <FileText className="w-4 h-4" /> Download PDF
                             </button>
                          )}
                       </div>
                     </motion.div>
                   </div>
                 )}
               </AnimatePresence>
                 <AnimatePresence>
                   {showToast && (
                     <motion.div 
                       initial={{ opacity: 0, y: 50, x: '-50%' }}
                       animate={{ opacity: 1, y: 0, x: '-50%' }}
                       exit={{ opacity: 0, y: 50, x: '-50%' }}
                       className={`fixed bottom-12 left-1/2 z-50 px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-md border border-white/20 ${
                         toastStatus === 'success' ? 'bg-emerald-500/95 text-white' : 
                         toastStatus === 'warning' ? 'bg-amber-500/95 text-white' : 
                         'bg-rose-500/95 text-white'
                       }`}
                     >
                       <div className="bg-white/20 p-2 rounded-full shadow-inner">
                         {toastStatus === 'success' ? (
                           <CheckCircle className="w-6 h-6" />
                         ) : toastStatus === 'warning' ? (
                           <AlertCircle className="w-6 h-6" />
                         ) : (
                           <XCircle className="w-6 h-6" />
                         )}
                       </div>
                       <div className="flex-1">
                         <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">
                           {toastStatus === 'success' ? 'Great!' : toastStatus === 'warning' ? 'Wait!' : 'Oops!'}
                         </p>
                         <p className="font-bold text-xs opacity-90">{toastMessage}</p>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
              <div className="space-y-6">
                 <div className="bg-brand-ink p-8 rounded-[2.5rem] text-white">
                    <h3 className="text-xl font-black mb-4">University Campus</h3>
                    <p className="text-sm opacity-70 leading-relaxed font-medium">
                      Career Point University (CPU)<br />
                      National Highway 52, Alankapur<br />
                      Alaniya, Kota<br />
                      Rajasthan, 325003
                    </p>
                 </div>
                 <div className="bg-[#EBF0FF] p-8 rounded-[2.5rem]">
                    <h3 className="text-xl font-black text-brand-primary mb-2">Emergency?</h3>
                    <p className="text-sm text-brand-primary font-bold">Call 24/7 Helpline</p>
                    <p className="text-2xl font-black text-brand-ink mt-2">1-800-BUS-GO</p>
                 </div>
              </div>
            </div>
          </motion.div>
          ) : view === 'apply' ? (
            <motion.div 
               key="apply"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               className="space-y-6"
            >
              {showApplicationForm ? (
                <div className="max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] shadow-sm border-2 border-slate-300 overflow-hidden">
                  <div className="bg-brand-primary p-6 sm:p-8 lg:p-12 text-white relative">
                    <div className="relative z-10 flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 leading-tight text-white">Application Form</h2>
                        <p className="opacity-80 font-medium tracking-tight text-white/80 text-sm sm:text-base">Complete the form below to apply for your digital bus pass.</p>
                      </div>
                      <button 
                        onClick={() => setShowApplicationForm(false)}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors text-white flex-shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-white/10 rounded-full -mr-10 sm:-mr-20 -mt-10 sm:-mt-20 blur-3xl"></div>
                  </div>
                  <form className="p-4 sm:p-8 lg:p-12 space-y-8 sm:space-y-10" onSubmit={handleApply}>
                    {formError && (
                      <div className="bg-red-50 border-2 border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 font-bold text-sm">
                        <AlertCircle className="w-5 h-5" />
                        {formError}
                      </div>
                    )}

                    {/* Student Information Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 border-b-2 border-brand-bg pb-3 sm:pb-4 mb-4 sm:mb-6">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-ink">Student Information</h3>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Full Name</label>
                           <input 
                             type="text"
                             name="fullName"
                             value={applyForm.fullName}
                             onChange={(e) => setApplyForm({...applyForm, fullName: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Full Name') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                             placeholder="Karan Maurya"
                           />
                           {formError?.includes('Full Name') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Student ID</label>
                           <input 
                             type="text"
                             name="studentId"
                             value={applyForm.studentId}
                             onChange={(e) => setApplyForm({...applyForm, studentId: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Student ID') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                             placeholder="CPU/2026/001"
                           />
                           {formError?.includes('Student ID') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Department</label>
                           <select 
                             name="department"
                             value={applyForm.department}
                             onChange={(e) => setApplyForm({...applyForm, department: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Department') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                           >
                              <option value="">Select Department</option>
                              {departments.map((dept, idx) => (
                                <option key={dept.id || idx} value={dept.name}>
                                  {dept.name}
                                </option>
                              ))}
                           </select>
                           {formError?.includes('Department') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Year</label>
                           <select 
                             value={applyForm.year}
                             onChange={(e) => setApplyForm({...applyForm, year: e.target.value})}
                             className="w-full bg-brand-bg border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none"
                           >
                              <option>1st Year</option>
                              <option>2nd Year</option>
                              <option>3rd Year</option>
                              <option>4th Year</option>
                           </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Mobile Number</label>
                           <input 
                             type="tel"
                             name="mobile"
                             value={applyForm.mobile}
                             onChange={(e) => setApplyForm({...applyForm, mobile: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Mobile Number') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                             placeholder="+91 9876543210"
                           />
                           {formError?.includes('Mobile Number') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Email Address</label>
                           <input 
                             type="email"
                             name="email"
                             value={applyForm.email}
                             onChange={(e) => setApplyForm({...applyForm, email: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Email Address') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                             placeholder="karan@example.com"
                           />
                           {formError?.includes('Email Address') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                      </div>
                    </div>

                    {/* Route Details Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 border-b-2 border-brand-bg pb-3 sm:pb-4 mb-4 sm:mb-6">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-ink">Route Details</h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">From (Pickup Stop)</label>
                           <select 
                             name="from"
                             value={applyForm.from}
                             onChange={(e) => setApplyForm({...applyForm, from: e.target.value})}
                             className={`w-full bg-brand-bg border-2 focus:ring-4 focus:ring-brand-primary/10 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold transition-all outline-none ${formError?.includes('Pickup Stop') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 focus:border-brand-primary'}`}
                           >
                             <option value="">Select Pickup Stop</option>
                             {routes.map((route, idx) => (
                               <option key={route.id || idx} value={route.startPlace}>
                                 {route.startPlace}
                               </option>
                             ))}
                           </select>
                           {formError?.includes('Pickup Stop') && <p className="text-[10px] text-red-500 font-black uppercase mt-1 ml-1">Fill this</p>}
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">To (College)</label>
                           <input 
                             type="text"
                             value={applyForm.to}
                             readOnly
                             className="w-full bg-gray-50 border-2 border-slate-400 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm font-bold outline-none cursor-not-allowed text-brand-gray"
                           />
                        </div>
                      </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center gap-3 border-b-2 border-brand-bg pb-3 sm:pb-4 mb-4 sm:mb-6">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-ink">Document Upload</h3>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Upload ID Proof</label>
                        <div id="id-upload-area" className="relative">
                          <input 
                            type="file"
                            id="id-upload"
                            name="idProof"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setApplyForm({...applyForm, idProof: file});
                            }}
                            className="hidden"
                          />
                          <label 
                            htmlFor="id-upload"
                            className={`flex flex-col items-center justify-center w-full min-h-[120px] sm:min-h-[160px] bg-brand-bg border-2 border-dashed focus-within:ring-4 focus-within:ring-brand-primary/10 rounded-xl sm:rounded-[2rem] cursor-pointer transition-all group p-4 sm:p-6 ${formError?.includes('upload ID Proof') ? 'border-red-500 bg-red-50/10' : 'border-slate-400 hover:border-brand-primary focus-within:border-brand-primary'}`}
                          >
                            {applyForm.idProof ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                  <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="font-bold text-emerald-600 text-sm">{applyForm.idProof.name}</p>
                                <p className="text-[10px] font-black uppercase text-brand-gray tracking-widest">Click to change file</p>
                              </div>
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                  <PlusCircle className="w-6 h-6 text-brand-primary" />
                                </div>
                                <p className="font-bold text-brand-ink mb-1">Upload ID Proof</p>
                                <p className="text-xs text-brand-gray font-medium">Accepts Image or PDF</p>
                                {formError?.includes('upload ID Proof') && <p className="text-[10px] text-red-500 font-black uppercase mt-2">Fill this</p>}
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 sm:pt-6 border-t-2 border-brand-bg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Pass Category</label>
                            <select 
                              value={applyForm.passType}
                              onChange={(e) => setApplyForm({...applyForm, passType: e.target.value as PassType})}
                              className="bg-brand-bg border-2 border-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all outline-none"
                            >
                               <option value="1 Month">1 Month Duration</option>
                               <option value="3 Month">3 Month Duration</option>
                               <option value="6 Month">6 Month Duration</option>
                               <option value="12 Month">12 Month Duration</option>
                            </select>
                         </div>
                         <div className="text-left sm:text-right w-full sm:w-auto">
                           <p className="text-[10px] font-black uppercase text-brand-gray tracking-widest mb-1">Fare Price</p>
                           <div className="flex flex-col items-start sm:items-end">
                             <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                               <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Automatic</label>
                               <p className="text-xl sm:text-2xl font-black text-brand-primary">
                                 ₹{(routes.find(r => r.startPlace === applyForm.from)?.fare || 0) * (applyForm.passType === '3 Month' ? 3 : applyForm.passType === '6 Month' ? 6 : applyForm.passType === '12 Month' ? 12 : 1)}
                               </p>
                             </div>
                             <p className="text-[10px] font-bold text-brand-gray mt-1">Read-Only (Based on Route)</p>
                           </div>
                         </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-4 sm:py-6 rounded-xl sm:rounded-[2rem] font-black text-lg sm:text-xl shadow-2xl shadow-brand-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                      >
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                        Submit and Pay
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Passes Header */}
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-brand-gray font-bold text-sm">You have {passes.filter(p => p.status === 'Active').length} active passes</p>
                    <button 
                      onClick={() => setShowApplicationForm(true)}
                      className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Apply for New Pass
                    </button>
                  </div>

                  {passes.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      {passes.map((p, i) => (
                        <div key={p.id || p._id || i} className="bg-white rounded-[2.5rem] border-2 border-slate-300 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-brand-primary transition-all">
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-12 h-12 bg-brand-bg rounded-2xl flex items-center justify-center">
                                <Bus className="text-brand-primary w-6 h-6" />
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                (p.status === 'Active' || p.status === 'Approved') ? 'bg-emerald-100 text-emerald-600' : 
                                p.status === 'Pending Payment' ? 'bg-amber-100 text-amber-600' :
                                p.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {p.status}
                              </span>
                            </div>
                            <h3 className="text-2xl font-black text-brand-ink mb-1">{p.type} Pass</h3>
                            <p className="text-brand-gray font-bold text-xs uppercase tracking-widest mb-6">Fare: ₹{p.price}</p>
                            
                            <div className="space-y-1 mb-8">
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                  <span className="text-[10px] font-black text-brand-gray uppercase tracking-widest">Issued On: {formatDate(p.issueDate)}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                                  <span className="text-[10px] font-black text-brand-ink uppercase tracking-widest">Valid Until: {formatDate(p.expiryDate)}</span>
                               </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 relative z-10 w-full">
                            {(p.status === 'Active' || p.status === 'Approved') ? (
                              <button 
                                onClick={() => generatePDF(p)}
                                className="flex-1 bg-brand-primary text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10 hover:scale-[1.02] transition-all"
                              >
                                <FileText className="w-4 h-4" /> Download Pass (PDF)
                              </button>
                            ) : p.status === 'Pending Payment' ? (
                              <button 
                                onClick={() => {
                                  setSelectedPassForPayment(p);
                                  setShowPaymentModal(true);
                                }}
                                className="flex-1 bg-brand-ink text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all"
                              >
                                <Wallet className="w-4 h-4" /> Pay Now
                              </button>
                            ) : (
                              <button 
                                className="flex-1 bg-brand-bg py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-brand-gray cursor-default"
                              >
                                {p.status === 'Rejected' ? 'Application Rejected' : 'Under Review'}
                              </button>
                            )}
                            
                            {(p.status === 'Expired' || p.status === 'Pending' || p.status === 'Pending Payment') && (
                               <button 
                                 onClick={() => handleDeleteUserPass(p.id || (p as any)._id)}
                                 disabled={deletingIds.has(p.id || (p as any)._id)}
                                 className={`px-4 rounded-xl transition-all shadow-sm border ${
                                   deletingIds.has(p.id || (p as any)._id)
                                   ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                   : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                                 }`}
                                 title="Delete"
                               >
                                 {deletingIds.has(p.id || (p as any)._id) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                               </button>
                            )}
                          </div>
                          
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand-primary/10 transition-all"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-slate-300 border-dashed">
                      <div className="w-20 h-20 bg-brand-bg rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="w-10 h-10 text-brand-gray/30" />
                      </div>
                      <h3 className="text-2xl font-black text-brand-ink mb-2">No Active Passes</h3>
                      <p className="text-brand-gray font-medium mb-8 max-w-sm mx-auto tracking-tight">Apply for your digital bus pass today and start traveling with ease across the city.</p>
                      <button 
                        onClick={() => setShowApplicationForm(true)}
                        className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
                      >
                        <PlusCircle className="w-6 h-6" />
                        Apply Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : view === 'history' ? (
            <motion.div 
               key="history"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm border-2 border-brand-primary/10 overflow-hidden"
            >
              <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-brand-bg border-b-2 border-brand-primary/10">
                  <tr>
                    <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-[10px] font-black uppercase text-brand-gray tracking-widest">Type</th>
                    <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-[10px] font-black uppercase text-brand-gray tracking-widest">Duration</th>
                    <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right">Amount</th>
                    <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right">Status</th>
                    <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-[10px] font-black uppercase text-brand-gray tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4FF]">
                  {passes.map((p, i) => (
                    <tr key={p.id || p._id || `hist-${i}`} className="hover:bg-brand-bg/30 transition-colors">
                      <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-bg rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <Bus className="text-brand-primary w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-brand-ink text-sm sm:text-base truncate">{p.type} Pass</p>
                            <p className="text-[10px] text-brand-gray font-mono tracking-tighter uppercase">#{(p.id || p._id || '').replace('pass_', 'BG-')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
                         <p className="font-bold text-sm text-brand-ink">{formatDate(p.issueDate)}</p>
                         <p className="text-[10px] text-brand-gray font-medium">{formatDate(p.expiryDate)}</p>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 font-black text-brand-ink text-right text-sm sm:text-base">₹{p.price.toLocaleString('en-IN')}</td>
                      <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-right">
                        <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          (p.status === 'Active' || p.status === 'Approved') ? 'bg-emerald-100 text-emerald-600' : 
                          p.status === 'Pending Payment' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 text-right">
                        <div className="flex items-center justify-end gap-2 sm:gap-3">
                          {p.status === 'Pending Payment' && (
                             <button 
                               onClick={() => {
                                 setSelectedPassForPayment(p);
                                 setShowPaymentModal(true);
                               }}
                               className="text-brand-ink hover:text-brand-primary transition-colors h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200"
                               title="Pay Now"
                             >
                               <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                             </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUserPass(p.id || (p as any)._id)}
                            disabled={deletingIds.has(p.id || (p as any)._id)}
                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border transition-all ${
                              deletingIds.has(p.id || (p as any)._id)
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                            }`}
                            title="Delete History"
                          >
                            {deletingIds.has(p.id || (p as any)._id) ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {passes.length === 0 && (
                <div className="text-center py-12 sm:py-20">
                  <p className="font-bold text-brand-gray">No transactions recorded yet.</p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPassForPayment && (
          <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-brand-ink p-10 text-white relative">
                 <div className="relative z-10 flex justify-between items-start">
                    <div>
                       <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest mb-2 block">Secure Checkout</span>
                       <h3 className="text-3xl font-black">Complete Payment</h3>
                    </div>
                    <button onClick={() => setShowPaymentModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              </div>

              <div className="p-10 space-y-8">
                 <div className="bg-brand-bg p-6 rounded-2xl flex justify-between items-center border-2 border-slate-300 shadow-inner">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Bus className="w-6 h-6 text-brand-primary" />
                       </div>
                       <div>
                          <p className="font-black text-brand-ink">{selectedPassForPayment.type} Pass</p>
                          <p className="text-[10px] font-bold text-brand-gray uppercase">{selectedPassForPayment.userName}</p>
                       </div>
                    </div>
                    <p className="text-2xl font-black text-brand-primary">₹{selectedPassForPayment.price}</p>
                 </div>

                 <form onSubmit={handlePayment} className="space-y-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-brand-gray tracking-widest ml-1">Select Payment Method</label>
                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            type="button" 
                            onClick={() => setPaymentMethod('card')}
                            className={`p-5 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-brand-primary bg-brand-primary/5 shadow-inner' : 'border-slate-300 opacity-50 grayscale hover:opacity-100'}`}
                          >
                             <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-brand-primary' : 'text-brand-gray'}`} />
                             <span className={`text-xs font-black ${paymentMethod === 'card' ? 'text-brand-ink' : 'text-brand-gray'}`}>Debit/Credit Card</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setPaymentMethod('upi')}
                            className={`p-5 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'upi' ? 'border-brand-primary bg-brand-primary/5 shadow-inner' : 'border-slate-300 opacity-50 grayscale hover:opacity-100'}`}
                          >
                             <Wallet className={`w-6 h-6 ${paymentMethod === 'upi' ? 'text-brand-primary' : 'text-brand-gray'}`} />
                             <span className={`text-xs font-black ${paymentMethod === 'upi' ? 'text-brand-ink' : 'text-brand-gray'}`}>UPI / NetBanking</span>
                          </button>
                       </div>
                    </div>

                    {paymentMethod === 'card' ? (
                       <div className="bg-brand-bg rounded-2xl p-6 border-2 border-slate-300">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-gray mb-4">Card Details (Simulation)</h4>
                          <div className="space-y-4">
                             <div>
                                <input 
                                  className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${cardErrors.number ? 'border-red-500' : 'border-slate-400 focus:border-brand-primary'}`} 
                                  placeholder="Card Number" 
                                  value={cardDetails.number}
                                  onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                                />
                                {cardErrors.number && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Enter 16 digit card number</p>}
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <input 
                                     className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${cardErrors.expiry ? 'border-red-500' : 'border-slate-400 focus:border-brand-primary'}`} 
                                     placeholder="MM/YY"
                                     value={cardDetails.expiry}
                                     onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                                   />
                                   {cardErrors.expiry && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Format: MM/YY</p>}
                                </div>
                                <div>
                                   <input 
                                     className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${cardErrors.cvv ? 'border-red-500' : 'border-slate-400 focus:border-brand-primary'}`} 
                                     placeholder="CVV"
                                     value={cardDetails.cvv}
                                     onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                                   />
                                   {cardErrors.cvv && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">3 or 4 digits</p>}
                                </div>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="bg-brand-bg rounded-2xl p-6 border-2 border-slate-300 text-center space-y-4">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                             <ShieldCheck className="w-8 h-8 text-emerald-500" />
                          </div>
                          <h4 className="text-sm font-black text-brand-ink">Secure UPI / NetBanking Gateway</h4>
                          <p className="text-xs text-brand-gray font-medium">You will be redirected to the secure payment portal to complete your transaction via UPI, NetBanking or Wallets.</p>
                       </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isPaying}
                      className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {isPaying ? (
                         <>
                           <RefreshCw className="w-6 h-6 animate-spin" />
                           Processing...
                         </>
                       ) : (
                         <>
                           <ShieldCheck className="w-6 h-6" />
                           Pay ₹{selectedPassForPayment.price} Securely
                         </>
                       )}
                    </button>
                 </form>

                 <p className="text-center text-[10px] font-bold text-brand-gray uppercase tracking-widest opacity-60">
                    Your transaction is encrypted by enterprise-grade security
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Modals & Notifications */}
      <AnimatePresence>
        {viewingPassDetails && (
          <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-brand-bg p-8 flex justify-between items-center border-b-2 border-slate-200">
                <div>
                   <h3 className="text-2xl font-black text-brand-ink">Application Details</h3>
                   <p className="text-xs font-bold text-brand-gray uppercase tracking-widest mt-1">Ref: {viewingPassDetails.id}</p>
                </div>
                <button 
                  onClick={() => setViewingPassDetails(null)}
                  className="p-2 bg-white/50 hover:bg-white rounded-xl transition-colors shadow-sm"
                >
                  <X className="w-6 h-6 text-brand-gray" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Student Name</p>
                      <p className="text-lg font-black text-brand-ink">{viewingPassDetails.userName}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Student ID</p>
                      <p className="font-bold text-brand-ink">{(viewingPassDetails as any).studentId || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Department / Year</p>
                      <p className="font-bold text-brand-ink">{(viewingPassDetails as any).department} - {(viewingPassDetails as any).year}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Pass Type</p>
                      <p className="font-bold text-brand-primary">{viewingPassDetails.type}</p>
                   </div>
                </div>
                
                <div className="space-y-6">
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Contact Number</p>
                      <p className="font-bold text-brand-ink">{(viewingPassDetails as any).mobile || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Email Address</p>
                      <p className="font-bold text-brand-ink">{(viewingPassDetails as any).email || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Route (From → To)</p>
                      <p className="font-bold text-brand-ink">{(viewingPassDetails as any).from} → {(viewingPassDetails as any).to}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-brand-gray uppercase tracking-widest mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        viewingPassDetails.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                        viewingPassDetails.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {viewingPassDetails.status}
                      </span>
                   </div>
                </div>
              </div>
              
              <div className="p-8 bg-gray-50 flex justify-end gap-4 border-t-2 border-slate-200">
                 <button 
                   onClick={() => setViewingPassDetails(null)}
                   className="px-8 py-3 rounded-2xl font-bold bg-white border-2 border-slate-300 text-brand-gray hover:bg-gray-100 transition-all"
                 >
                   Close
                 </button>
                 {viewingPassDetails.status === 'Active' && (
                    <button 
                      onClick={() => generatePDF(viewingPassDetails)}
                      className="px-8 py-3 rounded-2xl font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Download PDF
                    </button>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-12 left-1/2 z-[200] px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-md border border-white/20 ${
              toastStatus === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400' : 
              toastStatus === 'warning' ? 'bg-amber-500/95 text-white border-amber-400' : 
              'bg-rose-500/95 text-white border-rose-400'
            }`}
          >
            <div className="bg-white/20 p-2 rounded-full shadow-inner">
              {toastStatus === 'success' ? (
                <CheckCircle className="w-6 h-6" />
              ) : toastStatus === 'warning' ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">
                {toastStatus === 'success' ? 'Great!' : toastStatus === 'warning' ? 'Wait!' : 'Oops!'}
              </p>
              <p className="font-bold text-xs opacity-90">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
