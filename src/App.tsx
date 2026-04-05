  import React, { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { setupOfflineSync, setupPeriodicSync } from './services/offlineSync';
import { storeToken, fetchGoogleUserInfo, getStoredToken } from './services/googleAuth';
import { useAuth } from './hooks/useAuth';

  import { 
    Package, 
    LayoutGrid, 
    MoreVertical,
    AlertCircle,
    Search,
    Filter,
    Plus,
    Database,
    Package2,
    X,
    Edit,
    Trash2,
    ChevronDown,
    Tag,
    Layers,
    ChevronRight,
    Box,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    Settings,
    Menu
  } from 'lucide-react';

  // Define interfaces
  interface InventoryItem {
    id: string;
    batchCode: string;
    categoryId: string;
    categoryName?: string;
    varietyId: string;
    varietyName?: string;
    packagingId: string;
    packagingName?: string;
    packagingSize?: number;
    packagingUnit?: string;
    quantityPackages: number;
    totalWeight: number;
    status: string;
    createdAt: string;
  }

  interface Category {
    id: string;
    name: string;
    description: string;
  }

  interface Variety {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    packagingPrices?: Record<string, number>; // per-variety price per packaging type
  }

  interface PackagingType {
    id: string;
    name: string;
    size: number;
    unit: string;
    description: string;
    pricePerPackage?: number;
  }

  interface HistoryRecord {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    details: string;
    old_values: string | null;
    new_values: string | null;
    created_at: string;
    created_by_email?: string | null;
  }

  export default function App() {
    // Authentication
    const { isAuthenticated, isLoading: isAuthLoading, isUnverified, user, logout } = useAuth();

    // Initialize activeTab from localStorage, default to Dashboard
    const [activeTab, setActiveTabState] = useState(() => {
      try {
        return localStorage.getItem('activeTab') || 'Dashboard';
      } catch {
        return 'Dashboard';
      }
    });

    // Wrapper to persist activeTab to localStorage when it changes
    const setActiveTab = (tab: string) => {
      setActiveTabState(tab);
      localStorage.setItem('activeTab', tab);
    };

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [varieties, setVarieties] = useState<Variety[]>([]);
    const [packagingTypes, setPackagingTypes] = useState<PackagingType[]>([]);
    const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
    // Dashboard specific states
    const [timePeriod, setTimePeriod] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);

   const [chartMetric, setChartMetric] = useState<'batches' | 'weight'>('batches');
    const [chartCategoryFilter, setChartCategoryFilter] = useState<string>('All');
    const [chartVarietyFilter, setChartVarietyFilter] = useState<string>('All');

const [donutView, setDonutView] = useState<'category' | 'variety'>('category');
// Set to first category by default (will be Rice)
const [donutCategoryFilter, setDonutCategoryFilter] = useState<string>('');
    
    const [searchQuery, setSearchQuery] = useState("");
    const [searchBy, setSearchBy] = useState("All");
    const [filterPackaging, setFilterPackaging] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [sortBy, setSortBy] = useState<'date' | 'batch' | 'quantity' | 'weight'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [varietyCategoryFilter, setVarietyCategoryFilter] = useState<string>('All');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const [formData, setFormData] = useState<InventoryItem>({
      id: '',
      batchCode: '',
      categoryId: '',
      varietyId: '',
      packagingId: '',
      quantityPackages: 0,
      totalWeight: 0,
      status: 'In Stock',
      createdAt: new Date().toISOString()
    });

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
    const [categoryFormData, setCategoryFormData] = useState<Category>({
      id: '',
      name: '',
      description: ''
    });
    const [categoryPricingRows, setCategoryPricingRows] = useState<{ rowId: string; packagingId: string; price: number }[]>([]);

    // Variety Modal State
    const [isVarietyModalOpen, setIsVarietyModalOpen] = useState(false);
    const [isVarietyEditMode, setIsVarietyEditMode] = useState(false);
    const [varietyFormData, setVarietyFormData] = useState<Variety>({
      id: '',
      categoryId: '',
      name: '',
      description: ''
    });
    const [varietyPricingRows, setVarietyPricingRows] = useState<{ rowId: string; packagingId: string; price: number }[]>([]);

    // Packaging Modal State
    const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
    const [isPackagingEditMode, setIsPackagingEditMode] = useState(false);
    const [packagingFormData, setPackagingFormData] = useState<PackagingType>({
      id: '',
      name: '',
      size: 0,
      unit: 'kg',
      description: '',
      pricePerPackage: 0
    });

    // History Modal State
    const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
    const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);

  // Status bar state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

    useEffect(() => {
      // Handle OAuth callback parameters (auth_token / auth_error)
      try {
        const params = new URLSearchParams(window.location.search);
        const authTokenParam = params.get('auth_token');
        const authError = params.get('auth_error');

        console.log('[DEBUG] OAuth callback check:', { hasToken: !!authTokenParam, hasError: !!authError });

        if (authTokenParam) {
          try {
            console.log('[DEBUG] Processing auth token from URL');
            const decoded = decodeURIComponent(authTokenParam);
            console.log('[DEBUG] Decoded token:', decoded);
            const tokenObj = JSON.parse(decoded);
            console.log('[DEBUG] Parsed token object:', tokenObj);
            
            storeToken(tokenObj as any);
            console.log('[DEBUG] Token stored in localStorage');
            console.log('[DEBUG] Verification - token in storage:', getStoredToken());
            
            // Try to fetch user info in background, but reload the page immediately
            fetchGoogleUserInfo().catch(() => {
              console.warn('Failed to fetch user info, but proceeding with login');
            });
            
            // Remove the query param from history and reload
            console.log('[DEBUG] Reloading page to trigger authentication');
            const url = new URL(window.location.href);
            url.searchParams.delete('auth_token');
            window.history.replaceState({}, document.title, url.toString());
            
            // Do a full page reload so React re-initializes with the stored token
            setTimeout(() => window.location.reload(), 100);
          } catch (err) {
            console.error('Failed to parse auth token from URL:', err);
          }
        }

        if (authError) {
          const message = decodeURIComponent(authError);
          // show clear instructions for test-user / unverified app problems
          alert(
            `Google sign-in failed: ${message}.\n\nIf the app is unverified, add your Google address as a Test user in the Cloud Console (APIs & Services → OAuth consent screen → Test users).`
          );
          const url = new URL(window.location.href);
          url.searchParams.delete('auth_error');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (err) {
        console.error('Error handling OAuth callback params:', err);
      }

      loadInventory();
      loadCategories();
      loadVarieties();
      loadPackaging();
      loadHistory();

      // Setup offline sync and periodic auto-sync
      const unsubscribe = setupOfflineSync();
      const _timer = setupPeriodicSync(5); // 5 minutes

      return () => {
        unsubscribe?.();
        if (_timer) clearInterval(_timer);
      };
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-dropdown]')) {
          setActiveDropdown(null);
          setShowSearchDropdown(false);
          setShowFilterDropdown(false);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
  if (categories.length > 0 && donutCategoryFilter === '') {
    setDonutCategoryFilter(categories[0].id);
  }
}, [categories, donutCategoryFilter]);
    // Helper: currency symbol (PHP)
    const getCurrencySymbol = () => '₱';

    // Dashboard stats (group totals by currency and show primary PHP total)
    const dashboardStats = React.useMemo(() => {
      const totalPackages = inventoryData.reduce((sum, item) => sum + item.quantityPackages, 0);
      inventoryData.reduce((sum, item) => sum + item.totalWeight, 0);

      // Calculate total value using API-provided calculated_value
      const totalValueNumber = inventoryData.reduce((sum, item) => {
        return sum + ((item as any).calculatedValue || 0);
      }, 0);

      const totalValueLabel = `${getCurrencySymbol()}${totalValueNumber.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;

      const totalItems = inventoryData.length;
      const totalCategories = categories.length;
      const uniqueVarieties = varieties.length;

      return {
        totalValue: totalValueLabel,
        totalPackages: totalPackages.toLocaleString(),
        totalItems: totalItems.toString(),
        totalCategories: totalCategories.toString(),
        varieties: uniqueVarieties.toString()
      };
    }, [inventoryData, varieties, categories]);

// Helper function to handle sync status
const showSyncStatus = (message: string = 'Saved to Drive') => {
  setSyncStatus('saving');
  setLastSyncMessage('Saving...');
  setTimeout(() => {
    setSyncStatus('saved');
    setLastSyncMessage(message);
    setTimeout(() => {
      setSyncStatus('idle');
      setLastSyncMessage('');
    }, 2000);
  }, 500);
};

// Chart data calculations
const chartData = React.useMemo(() => {
  let timePoints: Date[] = [];
  let labelFormat: Intl.DateTimeFormatOptions = {};
  
  switch (timePeriod) {
    case 'days':
      timePoints = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date;
      });
      labelFormat = { month: 'short', day: 'numeric' };
      break;
    case 'weeks':
      timePoints = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (11 - i) * 7);
        return date;
      });
      labelFormat = { month: 'short', day: 'numeric' };
      break;
    case 'months':
      timePoints = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        return date;
      });
      labelFormat = { month: 'short', year: 'numeric' };
      break;
    case 'years':
      timePoints = Array.from({ length: 5 }, (_, i) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - (4 - i));
        return date;
      });
      labelFormat = { year: 'numeric' };
      break;
  }

  const trendData = timePoints.map((date) => {
    let startDate: Date;
    let endDate: Date;
    
    switch (timePeriod) {
      case 'days':
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weeks':
        startDate = new Date(date);
        endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 6);
        break;
      case 'months':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
      case 'years':
        startDate = new Date(date.getFullYear(), 0, 1);
        endDate = new Date(date.getFullYear(), 11, 31);
        break;
      default:
        startDate = date;
        endDate = date;
    }
    
    // Filter items by date AND category/variety
    const periodItems = inventoryData.filter(item => {
      const itemDate = new Date(item.createdAt);
      const inDateRange = itemDate >= startDate && itemDate <= endDate;
      const matchesCategory = chartCategoryFilter === 'All' || item.categoryId === chartCategoryFilter;
      const matchesVariety = chartVarietyFilter === 'All' || item.varietyId === chartVarietyFilter;
      
      return inDateRange && matchesCategory && matchesVariety;
    });
  
    const batchesAdded = periodItems.length; // Count number of batches (items)
    const weightAdded = periodItems.reduce((sum, item) => sum + item.totalWeight, 0);

return {
  date: date.toLocaleDateString('en-US', labelFormat),
  batches: batchesAdded,
  weight: weightAdded,
  value: chartMetric === 'batches' ? batchesAdded : weightAdded
};
  });

  return { trendData };
}, [inventoryData, timePeriod, chartMetric, chartCategoryFilter, chartVarietyFilter]);

// Donut chart data - variety distribution
// Donut chart data - category or variety distribution
const donutChartData = React.useMemo(() => {
  let filteredInventory = inventoryData;

  if (donutView === 'variety') {
    // When viewing varieties, filter by selected category
    if (donutCategoryFilter !== 'All') {
      filteredInventory = inventoryData.filter(item => item.categoryId === donutCategoryFilter);
    }

    // Group by variety
    const varietyTotals = new Map<string, { name: string; value: number; color: string }>();
    
    filteredInventory.forEach(item => {
      const varietyName = item.varietyName || item.varietyId || 'Unknown';
      const current = varietyTotals.get(varietyName) || { name: varietyName, value: 0, color: '' };
      current.value += item.totalWeight;
      varietyTotals.set(varietyName, current);
    });

    const varietyArray = Array.from(varietyTotals.values()).sort((a, b) => b.value - a.value);
    
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    varietyArray.forEach((item, index) => {
      item.color = colors[index % colors.length];
    });

    const total = varietyArray.reduce((sum, item) => sum + item.value, 0);

    return { items: varietyArray, total, type: 'variety' };
  } else {
    // Group by category
    const categoryTotals = new Map<string, { name: string; value: number; color: string }>();
    
    filteredInventory.forEach(item => {
      const categoryName = item.categoryName || 'Unknown';
      const current = categoryTotals.get(categoryName) || { name: categoryName, value: 0, color: '' };
      current.value += item.totalWeight;
      categoryTotals.set(categoryName, current);
    });

    const categoryArray = Array.from(categoryTotals.values()).sort((a, b) => b.value - a.value);
    
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    categoryArray.forEach((item, index) => {
      item.color = colors[index % colors.length];
    });

    const total = categoryArray.reduce((sum, item) => sum + item.value, 0);

    return { items: categoryArray, total, type: 'category' };
  }
}, [inventoryData, donutView, donutCategoryFilter]);

// Get varieties for the selected category
const filteredVarietiesForChart = React.useMemo(() => {
  if (chartCategoryFilter === 'All') return varieties;
  return varieties.filter(v => v.categoryId === chartCategoryFilter);
}, [varieties, chartCategoryFilter]);

// Get filtered varieties based on selected category
const filteredVarietiesForForm = React.useMemo(() => {
  if (!formData.categoryId) return [];
  return varieties.filter(v => v.categoryId === formData.categoryId);
}, [varieties, formData.categoryId]);

    // Filtered varieties for the varieties table
    const filteredVarietiesForTable = React.useMemo(() => {
      if (varietyCategoryFilter === "All") return varieties;
      return varieties.filter(v => v.categoryId === varietyCategoryFilter);
    }, [varieties, varietyCategoryFilter]);

    // Filtered inventory data
    const filteredData = React.useMemo(() => {
      let result = inventoryData.filter(item => {
        const matchesPackaging = filterPackaging === "All" || item.packagingId === filterPackaging;
        const matchesStatus = filterStatus === "All" || item.status === filterStatus;
        const matchesCategory = filterCategory === "All" || item.categoryId === filterCategory;
        
        // Date filtering
        let matchesDate = true;
        if (filterDateFrom || filterDateTo) {
          const itemDate = new Date(item.createdAt);
          if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && itemDate >= fromDate;
          }
          if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && itemDate <= toDate;
          }
        }
        
        let matchesSearch = true;
        if (searchQuery !== "") {
          const query = searchQuery.toLowerCase();
          switch (searchBy) {
            case "Batch Code":
              matchesSearch = item.batchCode.toLowerCase().includes(query);
              break;
            case "Variety":
              matchesSearch = item.varietyName?.toLowerCase().includes(query) || false;
              break;
            case "Category":
              matchesSearch = item.categoryName?.toLowerCase().includes(query) || false;
              break;
            case "All":
            default:
              matchesSearch = 
                item.batchCode.toLowerCase().includes(query) ||
                item.varietyName?.toLowerCase().includes(query) ||
                item.categoryName?.toLowerCase().includes(query) ||
                item.packagingName?.toLowerCase().includes(query) ||
                item.status.toLowerCase().includes(query);
              break;
          }
        }
        
        return matchesPackaging && matchesStatus && matchesCategory && matchesDate && matchesSearch;
      });

      // Sorting
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'batch':
            comparison = a.batchCode.localeCompare(b.batchCode);
            break;
          case 'quantity':
            comparison = a.quantityPackages - b.quantityPackages;
            break;
          case 'weight':
            comparison = a.totalWeight - b.totalWeight;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return result;
    }, [inventoryData, filterPackaging, filterStatus, filterCategory, filterDateFrom, filterDateTo, searchQuery, searchBy, sortBy, sortOrder]);

    // INVENTORY HANDLERS
const handleOpenModal = () => {
  const riceCategory = categories.find(c => c.name.toLowerCase() === 'rice');
  const defaultCategoryId = riceCategory?.id || (categories.length > 0 ? categories[0].id : '');
  
  // Generate category-based batch code
  const selectedCategory = categories.find(c => c.id === defaultCategoryId);
  let categoryPrefix = 'GEN'; // Default: General
  
  if (selectedCategory) {
    // Generate prefix from category name (first 2-3 letters, uppercase)
    const name = selectedCategory.name.toUpperCase();
    if (name.length <= 3) {
      categoryPrefix = name;
    } else {
      // Take first 2 consonants or first 2 letters
      const consonants = name.replace(/[AEIOU]/g, '');
      categoryPrefix = consonants.length >= 2 ? consonants.substring(0, 2) : name.substring(0, 2);
    }
  }
  
  // Find the highest batch number for this category prefix
  let maxBatchNumber = 1000;
  
  inventoryData.forEach(item => {
    // Extract number from batch code like "RC-1001" -> 1001
    const match = item.batchCode.match(/([A-Z]+)-(\d+)/);
    if (match && match[1] === categoryPrefix) {
      const num = parseInt(match[2]);
      if (num > maxBatchNumber) {
        maxBatchNumber = num;
      }
    }
  });
  
  // Increment by 1 for the next batch
  const nextBatchNumber = maxBatchNumber + 1;
  const autoBatch = `${categoryPrefix}-${nextBatchNumber}`;

  // UPDATE THIS PART - Add current date in YYYY-MM-DD format
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  setFormData({
    id: '', 
    batchCode: autoBatch,
    categoryId: defaultCategoryId,
    varietyId: '',
    packagingId: packagingTypes.length > 0 ? packagingTypes[0].id : '',
    quantityPackages: 0,
    totalWeight: 0,
    status: 'In Stock',
    createdAt: formattedDate  // Changed to just date, not ISO string
  });

  setIsEditMode(false);
  setIsModalOpen(true);
};

const handleEdit = (item: InventoryItem) => {
  // Format the date to YYYY-MM-DD for the date input
  const dateObj = new Date(item.createdAt);
  const formattedDate = dateObj.toISOString().split('T')[0];
  
  setFormData({
    ...item,
    createdAt: formattedDate  // Format for date input
  });
  setIsEditMode(true);
  setIsModalOpen(true);
  setActiveDropdown(null);
};

const handleCloseModal = () => {
  setIsModalOpen(false);
  setIsEditMode(false);
};

    const handleDelete = async (id: string) => {
      const confirmed = window.confirm("Are you sure you want to delete this item?");
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/inventory?id=${id}`, {
          method: "DELETE",
        });
        
        if (!response.ok) {
          throw new Error(`Delete failed with status: ${response.status}`);
        }
        
        await loadInventory();
        await loadHistory();
        setActiveDropdown(null);
      } catch (err) {
        console.error("Failed to delete inventory", err);
        alert("Failed to delete item. Check console for details.");
      }
    };

    const handleCategoryChange = (newCategoryId: string) => {
      // Update batch code when category changes
      const selectedCategory = categories.find(c => c.id === newCategoryId);
      let categoryPrefix = 'GEN';
      
      if (selectedCategory) {
        const name = selectedCategory.name.toUpperCase();
        if (name.length <= 3) {
          categoryPrefix = name;
        } else {
          const consonants = name.replace(/[AEIOU]/g, '');
          categoryPrefix = consonants.length >= 2 ? consonants.substring(0, 2) : name.substring(0, 2);
        }
      }
      
      // Find the highest batch number for this category prefix
      let maxBatchNumber = 1000;
      
      inventoryData.forEach(item => {
        const match = item.batchCode.match(/([A-Z]+)-(\d+)/);
        if (match && match[1] === categoryPrefix) {
          const num = parseInt(match[2]);
          if (num > maxBatchNumber) {
            maxBatchNumber = num;
          }
        }
      });
      
      const nextBatchNumber = maxBatchNumber + 1;
      const newBatchCode = `${categoryPrefix}-${nextBatchNumber}`;
      
      setFormData({
        ...formData, 
        categoryId: newCategoryId, 
        varietyId: '',
        batchCode: isEditMode ? formData.batchCode : newBatchCode // Don't change batch code in edit mode
      });
    };

    const handleClearFilters = () => {
      setFilterPackaging("All");
      setFilterStatus("All");
      setFilterCategory("All");
      setFilterDateFrom("");
      setFilterDateTo("");
      setSearchQuery("");
      setSearchBy("All");
    };

    const loadInventory = async () => {
      try {
        const res = await fetch("/api/inventory");
        const data = await res.json();

        const mappedData = data.map((row: any) => ({
          id: row.id,
          batchCode: row.batch_code,
          categoryId: row.category_id,
          categoryName: row.category_name,
          varietyId: row.variety_id,
          varietyName: row.variety_name,
          packagingId: row.packaging_id,
          packagingName: row.packaging_name,
          packagingSize: row.packaging_size,
          packagingUnit: row.packaging_unit,
          quantityPackages: row.quantity_packages,
          totalWeight: row.total_weight,
          status: row.status,
          createdAt: row.created_at,
          pricePerPackage: row.price_per_package,
          calculatedValue: row.calculated_value
        }));
        
        setInventoryData(mappedData);
      } catch (err) {
        console.error("Failed to load inventory", err);
      }
    };

    // CATEGORY HANDLERS
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategories([]);
      }
    };

    const handleOpenCategoryModal = () => {
      setCategoryFormData({ id: '', name: '', description: '' });
      setCategoryPricingRows([]);
      setIsCategoryEditMode(false);
      setIsCategoryModalOpen(true);
    };

    const handleEditCategory = (category: Category) => {
      setCategoryFormData(category);
      setCategoryPricingRows([]);
      setIsCategoryEditMode(true);
      setIsCategoryModalOpen(true);
      setActiveDropdown(null);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const payload = categoryFormData;

        if (isCategoryEditMode) {
          await fetch(`/api/categories?id=${categoryFormData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        await loadCategories();
        await loadHistory();
        setIsCategoryModalOpen(false);
        if (isOnline) showSyncStatus('Saved to Drive');
      } catch (err) {
        console.error("Failed to save category", err);
      }
    };

    const handleDeleteCategory = async (id: string) => {
      const confirmed = window.confirm("Are you sure? This will affect related varieties and inventory items.");
      if (!confirmed) return;

      try {
        await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
        await loadCategories();
        await loadVarieties();
        await loadInventory();
        await loadHistory();
        setActiveDropdown(null);
      } catch (err) {
        console.error("Failed to delete category", err);
      }
    };

    // VARIETY HANDLERS
    const loadVarieties = async () => {
      try {
        const res = await fetch("/api/varieties");
        const data = await res.json();
        
        const mappedData = data.map((row: any) => ({
          id: row.id,
          categoryId: row.category_id,
          name: row.name,
          description: row.description || '',
          packagingPrices: row.packagingPrices || {}
        }));
        
        setVarieties(mappedData);
      } catch (err) {
        console.error("Failed to load varieties", err);
        setVarieties([]);
      }
    };

    const handleOpenVarietyModal = () => {
      setVarietyFormData({ 
        id: '', 
        categoryId: categories.length > 0 ? categories[0].id : '', 
        name: '', 
        description: '' 
      });
      setVarietyPricingRows([]);
      setIsVarietyEditMode(false);
      setIsVarietyModalOpen(true);
    };

    const handleEditVariety = (variety: Variety) => {
      setVarietyFormData(variety);
      // populate editable rows from existing packagingPrices object
      const rows = Object.entries(variety.packagingPrices || {}).map(([pkgId, price]) => ({
        rowId: `${pkgId}-${Date.now()}`,
        packagingId: pkgId,
        price: Number(price) || 0
      }));
      setVarietyPricingRows(rows);
      setIsVarietyEditMode(true);
      setIsVarietyModalOpen(true);
      setActiveDropdown(null);
    };

    const handleSaveVariety = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!varietyFormData.categoryId) {
        alert("Please select a category");
        return;
      }

      try {
        const packagingPricesPayload = varietyPricingRows.reduce<Record<string, number>>((acc, row) => {
          if (row.packagingId) acc[row.packagingId] = Number(row.price) || 0;
          return acc;
        }, {});

        const payload = {
          categoryId: varietyFormData.categoryId,
          name: varietyFormData.name,
          description: varietyFormData.description,
          packagingPrices: packagingPricesPayload
        };

        if (isVarietyEditMode) {
          await fetch(`/api/varieties?id=${varietyFormData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/varieties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        await loadVarieties();
        await loadHistory();
        setIsVarietyModalOpen(false);
        if (isOnline) showSyncStatus('Saved to Drive');
      } catch (err) {
        console.error("Failed to save variety", err);
        alert("Failed to save variety. Please check console for details.");
      }
    };

    const handleDeleteVariety = async (id: string) => {
      const confirmed = window.confirm("Are you sure? This will affect related inventory items.");
      if (!confirmed) return;

      try {
        await fetch(`/api/varieties?id=${id}`, { method: "DELETE" });
        await loadVarieties();
        await loadInventory();
        await loadHistory();
        setActiveDropdown(null);
      } catch (err) {
        console.error("Failed to delete variety", err);
      }
    };

    // PACKAGING HANDLERS
    const loadPackaging = async () => {
      try {
        const res = await fetch("/api/packaging");
        const data = await res.json();
        const mapped = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          size: row.size,
          unit: row.unit,
          description: row.description,
          pricePerPackage: row.price_per_package || 0
        }));
        setPackagingTypes(mapped);
      } catch (err) {
        console.error("Failed to load packaging", err);
        setPackagingTypes([]);
      }
    };

    const handleOpenPackagingModal = () => {
      setPackagingFormData({ id: '', name: '', size: 0, unit: 'kg', description: '', pricePerPackage: 0 });
      setIsPackagingEditMode(false);
      setIsPackagingModalOpen(true);
    };

    const handleEditPackaging = (packaging: PackagingType) => {
      setPackagingFormData(packaging);
      setIsPackagingEditMode(true);
      setIsPackagingModalOpen(true);
      setActiveDropdown(null);
    };

    const handleSavePackaging = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        // Convert camelCase to snake_case for database
        const dbPayload = {
          name: packagingFormData.name,
          size: packagingFormData.size,
          unit: packagingFormData.unit,
          description: packagingFormData.description,
          price_per_package: packagingFormData.pricePerPackage || 0
        };

        if (isPackagingEditMode) {
          await fetch(`/api/packaging?id=${packagingFormData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dbPayload),
          });
        } else {
          await fetch("/api/packaging", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dbPayload),
          });
        }

        await loadPackaging();
        await loadHistory();
        setIsPackagingModalOpen(false);
        if (isOnline) showSyncStatus('Saved to Drive');
      } catch (err) {
        console.error("Failed to save packaging", err);
      }
    };

    const handleDeletePackaging = async (id: string) => {
      const confirmed = window.confirm("Are you sure? This will affect related inventory items.");
      if (!confirmed) return;

      try {
        await fetch(`/api/packaging?id=${id}`, { method: "DELETE" });
        await loadPackaging();
        await loadInventory();
        await loadHistory();
        setActiveDropdown(null);
      } catch (err) {
        console.error("Failed to delete packaging", err);
      }
    };

    // HISTORY HANDLERS
    const loadHistory = async () => {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        setHistoryRecords(data);
      } catch (err) {
        console.error("Failed to load history", err);
        setHistoryRecords([]);
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDateShort = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const handleSort = (column: 'date' | 'batch' | 'quantity' | 'weight') => {
      if (sortBy === column) {
        // Toggle order if clicking the same column
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        // Set new column with default desc order
        setSortBy(column);
        setSortOrder('desc');
      }
    };

    const getActionColor = (action: string) => {
      switch (action) {
        case 'CREATE': return 'bg-green-100 text-green-800';
        case 'UPDATE': return 'bg-blue-100 text-blue-800';
        case 'DELETE': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getActionIcon = (action: string) => {
      switch (action) {
        case 'CREATE': return '+';
        case 'UPDATE': return '✏';
        case 'DELETE': return '×';
        default: return '•';
      }
    };

    const handleDeleteHistory = async (id: string) => {
      const confirmed = window.confirm("Are you sure you want to delete this history record?");
      if (!confirmed) return;

      try {
        await fetch(`/api/history?id=${id}`, { method: "DELETE" });
        await loadHistory();
        setActiveDropdown(null);
      } catch (err) {
        console.error("Failed to delete history record", err);
      }
    };

    const handleClearAllHistory = async () => {
      const confirmed = window.confirm("Are you sure you want to delete ALL history records? This cannot be undone.");
      if (!confirmed) return;

      try {
        await fetch("/api/history", { method: "DELETE" });
        await loadHistory();
      } catch (err) {
        console.error("Failed to clear history", err);
      }
    };

    const formatHistoryChanges = (oldValues: string | null, newValues: string | null) => {
      if (!oldValues && !newValues) return null;

      const changes: { field: string; old: any; new: any }[] = [];
      
      try {
        const oldData = oldValues ? JSON.parse(oldValues) : {};
        const newData = newValues ? JSON.parse(newValues) : {};
        
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        
        allKeys.forEach(key => {
          if (oldData[key] !== newData[key]) {
            changes.push({
              field: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              old: oldData[key] !== undefined ? oldData[key] : 'N/A',
              new: newData[key] !== undefined ? newData[key] : 'N/A'
            });
          }
        });
      } catch (err) {
        console.error("Error parsing history changes:", err);
      }

      return changes.length > 0 ? changes : null;
    };

    const renderContent = () => {
      // Unverified account notification is shown instead of blocking (handled in UI)

      // DASHBOARD TAB
// Replace the Dashboard section (starting from "if (activeTab === 'Dashboard')") with this:

if (activeTab === 'Dashboard') {
  const cardStyles = [
    { icon: Tag },
    { icon: Package },
    { icon: AlertCircle },
    { icon: LayoutGrid },
  ];

  const cardsData = [
    { label: "Total Value", value: dashboardStats.totalValue },
    { label: "Total Items", value: dashboardStats.totalItems },
    { label: "Categories", value: dashboardStats.totalCategories },
    { label: "Varieties", value: dashboardStats.varieties },
  ];

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 bg-gray-50">
      {/* Main Layout Container - Stack on mobile */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        
        {/* Left Column: Stats Cards + Chart */}
        <div className="flex-1 space-y-8">
          
          {/* Stats Cards Section */}
          <section>
            <div className="bg-white border-gray-200 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {cardsData.map((card, index) => {
                const Style = cardStyles[index] || cardStyles[0];
                const Icon = Style.icon;
                
                return (
                  <div
                    key={card.label}
                    className="p-6 flex flex-col justify-between h-40 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl border flex items-center justify-center text-blue-400 shadow-sm bg-blue-50 border-gray-100">
                        <Icon size={20} strokeWidth={1.5} />
                      </div>
                      {index === 2 && (
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical size={20} />
                        </button>
                      )}
                    </div>

                    <div className="mb-1">
                      <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
                    </div>

                    <div>
                      <span className="text-2xl font-bold tracking-tight text-gray-900">
                        {card.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

{/* Stock Summary Chart Section */}

<section>
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h3 className="font-semibold text-base sm:text-lg text-gray-900">Inventory Summary</h3>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
        {/* Metric Toggle (Packages vs Weight) */}
        <div className="relative flex-1 sm:flex-none min-w-max">
     <select
  value={chartMetric}
  onChange={(e) => setChartMetric(e.target.value as 'batches' | 'weight')}
  className="appearance-none w-full px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
>
  <option value="batches">Batches</option>
  <option value="weight">Weight (kg)</option>
</select>
          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={14} />
        </div>

        {/* Category Filter */}
        <div className="relative flex-1 sm:flex-none min-w-max">
          <select
            value={chartCategoryFilter}
            onChange={(e) => {
              setChartCategoryFilter(e.target.value);
              setChartVarietyFilter('All');
            }}
            className="appearance-none w-full px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={14} />
        </div>

        {/* Variety Filter */}
        <div className="relative flex-1 sm:flex-none min-w-max">
          <select
            value={chartVarietyFilter}
            onChange={(e) => setChartVarietyFilter(e.target.value)}
            disabled={chartCategoryFilter === 'All'}
            className="appearance-none w-full px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="All">All Varieties</option>
            {filteredVarietiesForChart.map(variety => (
              <option key={variety.id} value={variety.id}>{variety.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={14} />
        </div>

        {/* Time Period Dropdown */}
        <div className="relative flex-1 sm:flex-none min-w-max">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as 'days' | 'weeks' | 'months' | 'years')}
            className="appearance-none w-full px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="days">Day</option>
            <option value="weeks">Week</option>
            <option value="months">Month</option>
            <option value="years">Year</option>
          </select>
          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={14} />
        </div>
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <ResponsiveContainer width="100%" height={300} minWidth={250}>
      <LineChart data={chartData.trendData}>
        <defs>
          <linearGradient id="colorPackages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          stroke="#f0f0f0"
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          stroke="#f0f0f0"
          axisLine={false}
          tickLine={false}
          domain={[0, 'auto']}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
        />
< Line 
  type="monotone" 
  dataKey="value"
  stroke="#8b5cf6" 
  strokeWidth={2.5}
  name={chartMetric === 'batches' ? 'Batches' : 'Weight (kg)'}
  dot={false}
  fill="url(#colorPackages)"
  activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
/>
      </LineChart>
    </ResponsiveContainer>
    </div>
  </div>
</section>

{/* Donut Charts Section - Category/Variety Distribution */}
<section>
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
      <div>
        <h3 className="font-semibold text-base sm:text-lg text-gray-900">
          {donutView === 'category' ? 'Category Distribution' : 'Variety Distribution'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {donutView === 'category' ? 'Stock breakdown by category' : 'Stock breakdown by variety'}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Toggle between Category and Variety */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => {
              setDonutView('category');
              setDonutCategoryFilter('All');
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              donutView === 'category'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => {
              setDonutView('variety');
              // Set to first category (Rice) when switching to variety view
              const firstCategory = categories.length > 0 ? categories[0].id : 'All';
              setDonutCategoryFilter(firstCategory);
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              donutView === 'variety'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Varieties
          </button>
        </div>

        {/* Category Filter - only show when viewing varieties, no "All" option */}
        {donutView === 'variety' && (
          <div className="relative flex-1 sm:flex-none min-w-max">
            <select
              value={donutCategoryFilter}
              onChange={(e) => setDonutCategoryFilter(e.target.value)}
              className="appearance-none w-full px-3 sm:px-4 py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={14} />
          </div>
        )}
      </div>
    </div>

    {/* Single Donut Chart with Legend - Stack on mobile */}
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
      {/* Donut Chart - Full width on mobile, 40% on desktop */}
      <div className="w-full lg:w-2/5 shrink-0">
        {donutChartData.items.length > 0 ? (
          <div className="relative" style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutChartData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text - Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">
                {donutChartData.total.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 mt-1">kg total</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Layers size={48} className="mb-3 opacity-50" />
            <p className="text-sm">No {donutView} data</p>
          </div>
        )}
      </div>

      {/* Legend - 3/5 width on desktop, full on mobile */}
      <div className="w-full lg:w-3/5">
        <div className="space-y-2 sm:space-y-3">
          {donutChartData.items.map((item) => {
            const percentage = donutChartData.total > 0 
              ? Math.round((item.value / donutChartData.total) * 100) 
              : 0;

            return (
              <div key={item.name} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.value.toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="shrink-0 ml-2 sm:ml-4">
                  <span className="text-base sm:text-lg font-bold text-gray-900">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
</section>
        </div>

        {/* Right Column: Recent History Sidebar (Collapsible) */}
        {isHistorySidebarOpen ? (
          <aside className="w-full lg:w-96 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-200">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-100 bg-white z-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Recent History</h3>
                      <p className="text-xs text-gray-500">Real-time activity log</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsHistorySidebarOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                    title="Hide sidebar"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable List Container */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="space-y-6 relative">
                  {/* Timeline Line Vertical Decor */}
                  <div className="absolute left-1.75 top-2 bottom-2 w-0.5 bg-gray-100" />

                  {historyRecords.slice(0, 30).map((record) => (
                    <div key={record.id} className="relative pl-8 group">
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125 ${
                        record.action === 'CREATE' ? 'bg-green-500' : 
                        record.action === 'UPDATE' ? 'bg-blue-500' : 'bg-red-500'
                      }`} />
                      
                      <div className="flex flex-col bg-gray-50 rounded-xl p-3 border border-transparent group-hover:border-blue-100 group-hover:bg-white transition-all duration-200">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            record.action === 'CREATE' ? 'text-green-600' : 
                            record.action === 'UPDATE' ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {record.action}
                          </span>
                          <span className="text-[9px] text-gray-400 font-medium">
                            {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">
                          {record.entity_name}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {new Date(record.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {historyRecords.length === 0 && (
                    <div className="text-center py-20">
                      <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Box className="text-gray-300" size={24} />
                      </div>
                      <p className="text-sm text-gray-400">No activity yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={() => setActiveTab('History')}
                  className="w-full py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  View Full Logs
                </button>
              </div>
            </div>
          </aside>
        ) : (
          /* Collapsed Sidebar Toggle Button */
          <div className="flex items-start">
            <button
              onClick={() => setIsHistorySidebarOpen(true)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:bg-gray-50 transition-all group"
              title="Show history"
            >
              <ChevronLeft size={20} className="text-gray-600 group-hover:text-blue-600" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

      // INVENTORY TAB
      if (activeTab === 'Inventory') {
        const activeFiltersCount = [
          filterPackaging !== "All" ? 1 : 0,
          filterStatus !== "All" ? 1 : 0, 
          filterCategory !== "All" ? 1 : 0,
          filterDateFrom ? 1 : 0,
          filterDateTo ? 1 : 0
        ].reduce((a, b) => a + b, 0);
        
        return (
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
              
              {/* Table Toolbar */}
              <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100 flex flex-col gap-3 sm:gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Inventory Stock</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage rice stocks and by-products</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 relative">
                  {/* Search with dropdown */}
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    <input
                      type="text"
                      placeholder={`Search by ${searchBy.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-20 sm:pr-24 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSearchDropdown(!showSearchDropdown);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                      data-dropdown
                    >
                      {searchBy} <ChevronDown size={14} />
                    </button>
                    
                    {/* Search By Dropdown */}
                    {showSearchDropdown && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                        data-dropdown
                      >
                        {["All", "Batch Code", "Category", "Variety"].map(option => (
                          <button
                            key={option}
                            onClick={() => {
                              setSearchBy(option);
                              setShowSearchDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                              searchBy === option ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filter with dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFilterDropdown(!showFilterDropdown);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      data-dropdown
                    >
                      <Filter size={16} /> 
                      Filter
                      {activeFiltersCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                          {activeFiltersCount}
                        </span>
                      )}
                      <ChevronDown size={14} />
                    </button>

                    {/* Filter Dropdown */}
                    {showFilterDropdown && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4"
                        data-dropdown
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-sm text-gray-900">Filters</h4>
                          {activeFiltersCount > 0 && (
                            <button
                              onClick={handleClearFilters}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        {/* Category Filter */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                          <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="All">All</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Packaging Filter */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Packaging</label>
                          <select
                            value={filterPackaging}
                            onChange={e => setFilterPackaging(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="All">All</option>
                            {packagingTypes.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name} ({pkg.size}{pkg.unit})</option>
                            ))}
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                          <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
                          >
                            <option>All</option>
                            <option>In Stock</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                          </select>
                        </div>

                        {/* Date From Filter */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date From</label>
                          <input
                            type="date"
                            value={filterDateFrom}
                            onChange={e => setFilterDateFrom(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Date To Filter */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date To</label>
                          <input
                            type="date"
                            value={filterDateTo}
                            onChange={e => setFilterDateTo(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleOpenModal}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Add Stock</span><span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">Active filters:</span>
                  {filterCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Category: {categories.find(c => c.id === filterCategory)?.name}
                      <button onClick={() => setFilterCategory("All")} className="hover:bg-blue-200 rounded-full">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterPackaging !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Packaging: {packagingTypes.find(p => p.id === filterPackaging)?.name}
                      <button onClick={() => setFilterPackaging("All")} className="hover:bg-blue-200 rounded-full">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterStatus !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Status: {filterStatus}
                      <button onClick={() => setFilterStatus("All")} className="hover:bg-blue-200 rounded-full">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterDateFrom && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      From: {new Date(filterDateFrom).toLocaleDateString()}
                      <button onClick={() => setFilterDateFrom("")} className="hover:bg-blue-200 rounded-full">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {filterDateTo && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      To: {new Date(filterDateTo).toLocaleDateString()}
                      <button onClick={() => setFilterDateTo("")} className="hover:bg-blue-200 rounded-full">
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Table Area */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('batch')}
                      >
                        <div className="flex items-center gap-2">
                          Batch Code
                          {sortBy === 'batch' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Variety</th>
                      <th className="px-6 py-4">Packaging</th>
                      <th 
                        className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Quantity
                          {sortBy === 'quantity' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('weight')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Total Weight (kg)
                          {sortBy === 'weight' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Price</th>
                      <th className="px-6 py-4 text-right">Value</th>
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Date Added
                          {sortBy === 'date' ? (
                            sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} className="text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredData.length > 0 ? (
                      filteredData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.batchCode}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.categoryName || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.varietyId === 'N/A' ? 'N/A' : (item.varietyName || '-')}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {item.packagingName || '-'} 
                            {item.packagingSize && item.packagingUnit !== 'N/A' && <span className="text-gray-500"> ({item.packagingSize}{item.packagingUnit})</span>} 
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">{item.quantityPackages}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">{item.totalWeight.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === 'In Stock' 
                                ? 'bg-green-100 text-green-800' 
                                : item.status === 'Low Stock'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Price (per package) & Value (price * qty) - from API enriched data */}
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {`₱${((item as any).pricePerPackage || 0).toFixed(2)}`}
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {`₱${((item as any).calculatedValue || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`}
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex flex-col">
                              <span>{formatDateShort(item.createdAt)}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === item.id ? null : item.id);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                data-dropdown
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {activeDropdown === item.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                  data-dropdown
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEdit(item);
                                    }}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors"
                                  >
                                    <Edit size={16} className="text-blue-600" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10}>
                          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                              <Database size={32} className="text-gray-300" />
                            </div>
                            <p className="text-lg font-medium text-gray-900">
                              {searchQuery || activeFiltersCount > 0 ? "No matching results" : "No inventory data found"}
                            </p>
                            <p className="text-sm max-w-sm text-center mt-1">
                              {searchQuery || activeFiltersCount > 0
                                ? "Try adjusting your search or filter criteria."
                                : "Your inventory table is ready. Add your first stock item to get started."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Footer */}
              <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl flex justify-between items-center text-sm text-gray-500">
                <span>{filteredData.length} items</span>
                <div className="flex gap-2">
                  <button disabled className="px-3 py-1 border rounded bg-white text-gray-300 cursor-not-allowed">Prev</button>
                  <button disabled className="px-3 py-1 border rounded bg-white text-gray-300 cursor-not-allowed">Next</button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // CATEGORIES TAB
      if (activeTab === 'Categories') {
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Categories</h3>
                  <p className="text-sm text-gray-500">Manage product categories</p>
                </div>
                <button 
                  onClick={handleOpenCategoryModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} /> Add Category
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{category.description || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === category.id ? null : category.id);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                data-dropdown
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {activeDropdown === category.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                  data-dropdown
                                >
                                  <button
                                    onClick={() => handleEditCategory(category)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                  >
                                    <Edit size={16} className="text-blue-600" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          <div className="flex flex-col items-center justify-center py-24">
                            <Tag size={32} className="text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-900">No categories yet</p>
                            <p className="text-sm text-gray-500">Create your first category to get started</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      // VARIETIES TAB
      if (activeTab === 'Varieties') {
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Varieties</h3>
                  <p className="text-sm text-gray-500">Manage product varieties and pricing</p>
                </div>
                <div className="flex gap-3">
                  {/* Category Filter */}
                  <select
                    value={varietyCategoryFilter}
                    onChange={e => setVarietyCategoryFilter(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={handleOpenVarietyModal}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={16} /> Add Variety
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.isArray(filteredVarietiesForTable) && filteredVarietiesForTable.length > 0 ? (
                      filteredVarietiesForTable.map((variety) => {
                        const category = categories.find(c => c.id === variety.categoryId);
                        return (
                          <tr key={variety.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{variety.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {category?.name || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{variety.description || '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="relative inline-block">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(activeDropdown === variety.id ? null : variety.id);
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                  data-dropdown
                                >
                                  <MoreVertical size={18} />
                                </button>
                                
                                {activeDropdown === variety.id && (
                                  <div 
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                    data-dropdown
                                  >
                                    <button
                                      onClick={() => handleEditVariety(variety)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                    >
                                      <Edit size={16} className="text-blue-600" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVariety(variety.id)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                    >
                                      <Trash2 size={16} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4}>
                          <div className="flex flex-col items-center justify-center py-24">
                            <Layers size={32} className="text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-900">
                              {varietyCategoryFilter === "All" ? "No varieties yet" : "No varieties in this category"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {varietyCategoryFilter === "All" 
                                ? "Create your first variety to get started"
                                : "Select a different category or add a new variety"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Footer with count */}
              {filteredVarietiesForTable.length > 0 && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl text-sm text-gray-500">
                  Showing {filteredVarietiesForTable.length} {filteredVarietiesForTable.length === 1 ? 'variety' : 'varieties'}
                  {varietyCategoryFilter !== "All" && ` in ${categories.find(c => c.id === varietyCategoryFilter)?.name}`}
                </div>
              )}
            </div>
          </div>
        );
      }

      // PACKAGING TAB
      if (activeTab === 'Packaging') {
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Packaging Types</h3>
                  <p className="text-sm text-gray-500">Manage packaging sizes and units</p>
                </div>
                <button 
                  onClick={handleOpenPackagingModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} /> Add Packaging
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4 text-right">Size</th>
                      <th className="px-6 py-4">Unit</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Array.isArray(packagingTypes) && packagingTypes.length > 0 ? (
                      packagingTypes.map((packaging) => (
                        <tr key={packaging.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{packaging.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">{packaging.size}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{packaging.unit}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{packaging.description || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === packaging.id ? null : packaging.id);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                data-dropdown
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {activeDropdown === packaging.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                  data-dropdown
                                >
                                  <button
                                    onClick={() => handleEditPackaging(packaging)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                  >
                                    <Edit size={16} className="text-blue-600" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePackaging(packaging.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex flex-col items-center justify-center py-24">
                            <Box size={32} className="text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-900">No packaging types yet</p>
                            <p className="text-sm text-gray-500">Create your first packaging type to get started</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      // HISTORY TAB
      if (activeTab === 'History') {
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Activity History</h3>
                  <p className="text-sm text-gray-500">Track all changes to inventory, categories, varieties, and packaging</p>
                </div>
                {historyRecords.length > 0 && (
                  <button 
                    onClick={handleClearAllHistory}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 size={16} /> Clear All History
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                {historyRecords.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {historyRecords.map((record) => {
                      const changes = formatHistoryChanges(record.old_values, record.new_values);
                      
                      return (
                        <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors group">
                          <div className="flex items-start gap-4">
                            {/* Action Badge */}
                            <div className={`shrink-0 w-10 h-10 rounded-full ${getActionColor(record.action)} flex items-center justify-center font-bold text-lg`}>
                              {getActionIcon(record.action)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getActionColor(record.action)}`}>
                                  {record.action}
                                </span>
                                <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                  {record.entity_type}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{record.entity_name}</span>
                                <span className="text-xs text-gray-400 ml-auto">{formatDate(record.created_at)}</span>
                              </div>

                              <p className="text-sm text-gray-600 mb-2">{record.details}</p>

                              {/* Show Changes Summary for UPDATE actions */}
                              {record.action === 'UPDATE' && changes && changes.length > 0 && (
                                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-blue-900 mb-2">Changes Made:</div>
                                  <div className="space-y-1">
                                    {changes.slice(0, 3).map((change, idx) => (
                                      <div key={idx} className="text-xs text-blue-800">
                                        <span className="font-medium">{change.field}:</span>{' '}
                                        <span className="line-through text-red-600">{String(change.old)}</span>
                                        {' → '}
                                        <span className="text-green-600 font-medium">{String(change.new)}</span>
                                      </div>
                                    ))}
                                    {changes.length > 3 && (
                                      <button
                                        onClick={() => {
                                          setSelectedHistory(record);
                                          setIsHistoryDetailOpen(true);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                                      >
                                        +{changes.length - 3} more changes... Click to view all
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Show Created/Deleted Data Summary */}
                              {(record.action === 'CREATE' || record.action === 'DELETE') && (
                                <button
                                  onClick={() => {
                                    setSelectedHistory(record);
                                    setIsHistoryDetailOpen(true);
                                  }}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  View details →
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === record.id ? null : record.id);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                data-dropdown
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {activeDropdown === record.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                  data-dropdown
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedHistory(record);
                                      setIsHistoryDetailOpen(true);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                  >
                                    <AlertCircle size={16} className="text-blue-600" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => handleDeleteHistory(record.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                  >
                                    <Trash2 size={16} />
                                    Delete Record
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24">
                    <Database size={32} className="text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No history yet</p>
                    <p className="text-sm text-gray-500">Activity will appear here as you make changes</p>
                  </div>
                )}
              </div>

              {historyRecords.length > 0 && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 text-sm text-gray-500">
                  Showing {historyRecords.length} recent activities
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // ANALYTICS TAB
      if (activeTab === 'Analytics') {
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900">Analytics & Master Data</h3>
                <p className="text-sm text-gray-500 mt-1">Manage your categories, varieties, and packaging types</p>
              </div>

              {/* Master Data Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Categories Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('Categories')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Tag size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Categories</h4>
                      <p className="text-sm text-gray-500">{categories.length} categories</p>
                    </div>
                  </div>
                  <button className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg gap-2">
                    Manage Categories →
                  </button>
                </div>

                {/* Varieties Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('Varieties')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Layers size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Varieties</h4>
                      <p className="text-sm text-gray-500">{varieties.length} varieties</p>
                    </div>
                  </div>
                  <button className="w-full py-2 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 rounded-lg gap-2">
                    Manage Varieties →
                  </button>
                </div>

                {/* Packaging Card */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('Packaging')}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <Box size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Packaging</h4>
                      <p className="text-sm text-gray-500">{packagingTypes.length} types</p>
                    </div>
                  </div>
                  <button className="w-full py-2 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 rounded-lg gap-2">
                    Manage Packaging →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // Fallback
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <AlertCircle size={48} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{activeTab} Unavailable</h2>
          <p className="text-gray-500 max-w-md">
            The {activeTab} page is currently under construction.
          </p>
        </div>
      );
    };

    // Show loading page while checking authentication
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // Show login page if NOT authenticated - blocks all access
    const loginWarning = isUnverified
      ? 'Your Google account is not authorized to enter this system.'
      : undefined;

    if (!isAuthenticated) {
      return <LoginPage warning={loginWarning} />;
    }

    // Only authenticated users see the full dashboard
    return (
      <div className="h-screen flex flex-col lg:flex-row bg-gray-50 text-gray-800 font-sans overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-gray-200 border-b px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package2 size={28} className="text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Inventory</span>
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
          >
            {isMobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Sidebar - Desktop visible, Mobile overlay */}
        <aside className={`fixed lg:static inset-y-0 left-0 lg:inset-auto w-56 sm:w-64 lg:w-60 bg-white border-gray-200 border-r transition-transform duration-300 z-40 lg:z-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } pt-4 lg:pt-8 px-3 sm:px-4 lg:px-6 flex flex-col overflow-y-auto`}>
          {/* Close button for mobile */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden mb-4 p-2 rounded-lg self-end hover:bg-gray-100"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 text-xl font-bold mb-8 lg:mb-10 text-gray-900">
            <Package2 size={26} className="text-blue-600" /> 
            <h1 className="hidden sm:inline">Menu</h1>
          </div>

          <nav className="space-y-2 flex-1">
            {["Dashboard", "Inventory"].map(item => (
              <button
                key={item}
                onClick={() => {
                  setActiveTab(item);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === item 
                    ? 'bg-blue-50 text-blue-600 shadow'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Analytics & Master Data Section */}
          <nav className="space-y-2 border-t py-4" style={{borderColor: '#e5e7eb'}}>
            <button
              onClick={() => {
                setActiveTab("Analytics");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "Analytics"
                  ? 'bg-blue-50 text-blue-600 shadow'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              Analytics
            </button>

            {/* Master Data subsection */}
            <div className="mt-2 ml-4 space-y-1 pl-4 border-gray-100 border-l-2">
              {["Categories", "Varieties", "Packaging"].map(item => (
                <button
                  key={item}
                  onClick={() => {
                    setActiveTab(item);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === item 
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </nav>

          <nav className="space-y-2 border-t py-4" style={{borderColor: '#e5e7eb'}}>
            {["History"].map(item => (
              <button
                key={item}
                onClick={() => {
                  setActiveTab(item);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === item 
                    ? 'bg-blue-50 text-blue-600 shadow'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Settings Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <button 
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all hover:bg-gray-100 text-gray-700"
            >
              <Settings size={20} /> Settings
            </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main Layout */}
        <main className="flex-1 flex flex-col overflow-hidden relative w-full lg:w-auto">
          <header className="bg-white border-gray-100 px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-5 flex items-center justify-between sticky top-0 z-10 border-b">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{activeTab}</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate hidden sm:block">
                {activeTab === 'Dashboard' ? 'Your Inventory Dashboard' : `Manage your ${activeTab}`}
              </p>
            </div>
            <div className="flex items-center gap-2 lg:gap-6 ml-4">
              {/* Online/Offline Status */}
              <div className="hidden sm:flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs font-medium hidden md:inline text-gray-600 dark:text-gray-400">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Sync Status */}
              {syncStatus !== 'idle' && (
                <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  syncStatus === 'saving' 
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {syncStatus === 'saving' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {lastSyncMessage}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                title="Settings"
              >
                <Settings size={20} className="lg:w-6 lg:h-6" />
              </button>
            </div>
          </header>
          
          {/* Content Area - Responsive Padding */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="px-2 sm:px-4 py-3 sm:py-4 lg:px-8 lg:py-6 max-w-7xl mx-auto w-full">
              {renderContent()}
            </div>
          </div>

          {/* Settings Modal */}
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            onLogout={() => {
              logout();
              setIsSettingsOpen(false);
            }}
            user={user}
          />


          {/* INVENTORY MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-125 shadow-2xl transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {isEditMode ? 'Edit Stock' : 'Add New Stock'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isEditMode ? 'Update stock details below.' : 'Enter stock details below.'}
                    </p>
                  </div>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={async (e) => {
  e.preventDefault();

  const selectedPackaging = packagingTypes.find(p => p.id === formData.packagingId);
  const packagingWeight = selectedPackaging ? selectedPackaging.size : 50;
  const totalWeight = formData.quantityPackages * packagingWeight;

  // Convert date to ISO format for database
  const dateToSave = new Date(formData.createdAt + 'T00:00:00').toISOString();

  const payload = {
    batchCode: formData.batchCode,
    categoryId: formData.categoryId,
    varietyId: formData.varietyId,
    packagingId: formData.packagingId,
    quantityPackages: formData.quantityPackages,
    totalWeight: totalWeight,
    status: formData.status,
    createdAt: dateToSave
  };

  try {
    if (isEditMode) {
      await fetch(`/api/inventory?id=${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadInventory();
    await loadHistory();
    setIsModalOpen(false);
    setIsEditMode(false);
    if (isOnline) showSyncStatus('Saved to Drive');
  } catch (err) {
    console.error("Failed to save inventory", err);
  }
}} className="space-y-5">

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Batch Code {!isEditMode && '(Auto-Generated)'}
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-200 rounded-lg font-mono text-blue-600 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                      value={formData.batchCode} 
                      onChange={e => setFormData({...formData, batchCode: e.target.value})}
                      required
                      placeholder="Will auto-generate based on category"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: Category Prefix + Number (e.g., RC-1001 for Rice, CN-1001 for Corn)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                      <select 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                        value={formData.categoryId} 
                        onChange={e => handleCategoryChange(e.target.value)}
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Variety</label>
                      <select 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                        value={formData.varietyId} 
                        onChange={e => setFormData({...formData, varietyId: e.target.value})}
                        required
                        disabled={!formData.categoryId}
                      >
                        <option value="">Select Variety</option>
                        <option value="N/A">N/A</option>
                        {filteredVarietiesForForm.map(variety => (
                          <option key={variety.id} value={variety.id}>{variety.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Packaging</label>
                      <select 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                        value={formData.packagingId} 
                        onChange={e => setFormData({...formData, packagingId: e.target.value})}
                        required
                      >
                        <option value="">Select Packaging</option>
                        {packagingTypes.map(pkg => {
                          const selectedVariety = varieties.find(v => v.id === formData.varietyId);
                          const varietyPrice = selectedVariety?.packagingPrices?.[pkg.id];
                          const displayPrice = (typeof varietyPrice === 'number' && varietyPrice > 0) ? varietyPrice : (pkg.pricePerPackage || 0);
                          return (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name}{(pkg.unit && pkg.unit !== 'N/A') ? ` (${pkg.size}${pkg.unit})` : ''}{displayPrice ? ` — ₱${displayPrice.toFixed(2)}` : ''}
                            </option>
                          );
                        })} 
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                      <input 
                        type="number" 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                        value={formData.quantityPackages || ''}
                        onChange={e => setFormData({...formData, quantityPackages: parseInt(e.target.value) || 0})} 
                        required 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option>In Stock</option>
                      <option>Low Stock</option>
                      <option>Out of Stock</option>
                    </select>
                  </div>

                  {/* ADD THIS DATE FIELD */}
<div>
  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
    Date Created
  </label>
  <input 
    type="date" 
    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
    value={formData.createdAt}
    onChange={e => setFormData({...formData, createdAt: e.target.value})} 
    required 
  />
</div>

                  <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
                      {isEditMode ? 'Update Stock' : 'Add to Inventory'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CATEGORY MODAL */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-125 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {isCategoryEditMode ? 'Edit Category' : 'Add New Category'}
                    </h3>
                    <p className="text-sm text-gray-500">Enter category details</p>
                  </div>
                  <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rice"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                      value={categoryFormData.name} 
                      onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                      placeholder="Optional description"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" 
                      rows={3}
                      value={categoryFormData.description} 
                      onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Packaging prices for this category</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pb-2">
                      {categoryPricingRows.length === 0 && (
                        <div className="text-xs text-gray-400">No category-specific packaging prices yet. Click "+ Add price" to create one.</div>
                      )}

                      {categoryPricingRows.map(row => (
                        <div key={row.rowId} className="flex items-center gap-2">
                          <select
                            className="flex-1 p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
                            value={row.packagingId}
                            onChange={e => setCategoryPricingRows(rows => rows.map(r => r.rowId === row.rowId ? { ...r, packagingId: e.target.value } : r))}
                            required
                          >
                            <option value="">Select packaging</option>
                            {packagingTypes.map(pkg => {
                              const alreadySelected = categoryPricingRows.some(r => r.packagingId === pkg.id && r.rowId !== row.rowId);
                              return (
                                <option key={pkg.id} value={pkg.id} disabled={alreadySelected}>
                                  {pkg.name} ({pkg.size}{pkg.unit})
                                </option>
                              );
                            })}
                          </select>

                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            className="w-28 p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                            value={row.price || ''}
                            onChange={e => setCategoryPricingRows(rows => rows.map(r => r.rowId === row.rowId ? { ...r, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 } : r))}
                          />

                          <button type="button" onClick={() => setCategoryPricingRows(rows => rows.filter(r => r.rowId !== row.rowId))} className="text-red-500 px-3 py-2 hover:bg-red-50 rounded">✕</button>
                        </div>
                      ))}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setCategoryPricingRows(rows => [...rows, { rowId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, packagingId: '', price: 0 }])}
                          className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 font-medium"
                        >
                          + Add price
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Add specific packaging prices for this category. Leave a packaging out to use the general packaging price instead.</p>
                  </div>



                  <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                      {isCategoryEditMode ? 'Update Category' : 'Add Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VARIETY MODAL */}
          {isVarietyModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-125 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {isVarietyEditMode ? 'Edit Variety' : 'Add New Variety'}
                    </h3>
                    <p className="text-sm text-gray-500">Enter variety details</p>
                  </div>
                  <button onClick={() => setIsVarietyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveVariety} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                      value={varietyFormData.categoryId} 
                      onChange={e => setVarietyFormData({...varietyFormData, categoryId: e.target.value})}
                      required
                    >
                      {categories.length === 0 ? (
                        <option value="">No categories available</option>
                      ) : (
                        <>
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Variety Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Jasmine, Basmati"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                      value={varietyFormData.name} 
                      onChange={e => setVarietyFormData({...varietyFormData, name: e.target.value})} 
                      required 
                    />
                  </div>



                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                      placeholder="Optional description"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" 
                      rows={3}
                      value={varietyFormData.description} 
                      onChange={e => setVarietyFormData({...varietyFormData, description: e.target.value})} 
                    />
                  </div>

                  {/* Packaging Prices */}
                  <div className="pt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Packaging Prices</label>
                    {varietyPricingRows.length === 0 && (
                      <p className="text-sm text-gray-500 mb-3 italic">No prices set yet</p>
                    )}
                    {varietyPricingRows.map(row => (
                      <div key={row.rowId} className="flex gap-2 mb-2 items-center">
                        <select 
                          value={row.packagingId} 
                          onChange={e => setVarietyPricingRows(rows => rows.map(r => r.rowId === row.rowId ? { ...r, packagingId: e.target.value } : r))}
                          className="flex-1 p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
                          required
                        >
                          <option value="">Select Packaging</option>
                          {packagingTypes.map(pkg => {
                            const alreadySelected = varietyPricingRows.some(r => r.packagingId === pkg.id && r.rowId !== row.rowId);
                            const displayLabel = `${pkg.name} (${pkg.size}${pkg.unit})`;
                            return <option key={pkg.id} value={pkg.id} disabled={alreadySelected}>{displayLabel}</option>;
                          })}
                        </select>
                        <input 
                          type="number" 
                          placeholder="0" 
                          min="0"
                          step="0.01"
                          value={row.price || ''} 
                          onChange={e => setVarietyPricingRows(rows => rows.map(r => r.rowId === row.rowId ? { ...r, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 } : r))}
                          className="w-28 p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button type="button" onClick={() => setVarietyPricingRows(rows => rows.filter(r => r.rowId !== row.rowId))} className="text-red-500 px-3 py-2 hover:bg-red-50 rounded">✕</button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => setVarietyPricingRows(rows => [...rows, { rowId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, packagingId: '', price: 0 }])}
                      className="text-blue-600 text-sm font-medium mt-3 hover:text-blue-700 px-2 py-1"
                    >
                      + Add Price
                    </button>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                      {isVarietyEditMode ? 'Update Variety' : 'Add Variety'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PACKAGING MODAL */}
          {isPackagingModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 w-125 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {isPackagingEditMode ? 'Edit Packaging' : 'Add New Packaging'}
                    </h3>
                    <p className="text-sm text-gray-500">Define packaging size and unit</p>
                  </div>
                  <button onClick={() => setIsPackagingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSavePackaging} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Packaging Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sack, Bag, Box"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                      value={packagingFormData.name} 
                      onChange={e => setPackagingFormData({...packagingFormData, name: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Size</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="50"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                        value={packagingFormData.size || ''} 
                        onChange={e => setPackagingFormData({...packagingFormData, size: parseFloat(e.target.value) || 0})} 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unit</label>
                      <select 
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white" 
                        value={packagingFormData.unit} 
                        onChange={e => setPackagingFormData({...packagingFormData, unit: e.target.value})}
                      >
                        <option>kg</option>
                        <option>g</option>
                        <option>lbs</option>
                        <option>oz</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price Per Package (₱)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                      value={packagingFormData.pricePerPackage || ''} 
                      onChange={e => setPackagingFormData({...packagingFormData, pricePerPackage: parseFloat(e.target.value) || 0})} 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                      placeholder="Optional description"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" 
                      rows={3}
                      value={packagingFormData.description} 
                      onChange={e => setPackagingFormData({...packagingFormData, description: e.target.value})} 
                    />
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                      {isPackagingEditMode ? 'Update Packaging' : 'Add Packaging'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* HISTORY DETAIL MODAL */}
          {isHistoryDetailOpen && selectedHistory && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getActionColor(selectedHistory.action)}`}>
                        {selectedHistory.action}
                      </span>
                      <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                        {selectedHistory.entity_type}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedHistory.entity_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(selectedHistory.created_at)}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsHistoryDetailOpen(false);
                      setSelectedHistory(null);
                    }} 
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedHistory.details}</p>
                  </div>

                  {/* Changes for UPDATE */}
                  {selectedHistory.action === 'UPDATE' && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Changes Made</h4>
                      {(() => {
                        const changes = formatHistoryChanges(selectedHistory.old_values, selectedHistory.new_values);
                        return changes && changes.length > 0 ? (
                          <div className="space-y-3">
                            {changes.map((change, idx) => (
                              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{change.field}</div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-red-50 border border-red-100 rounded p-3">
                                    <div className="text-xs font-semibold text-red-900 mb-1">Before</div>
                                    <div className="text-sm text-red-700 wrap-break-word">{String(change.old)}</div>
                                  </div>
                                  <div className="bg-green-50 border border-green-100 rounded p-3">
                                    <div className="text-xs font-semibold text-green-900 mb-1">After</div>
                                    <div className="text-sm text-green-700 wrap-break-word font-medium">{String(change.new)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No detailed changes available</p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Data for CREATE */}
                  {selectedHistory.action === 'CREATE' && selectedHistory.new_values && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Created Data</h4>
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        {(() => {
                          try {
                            const data = JSON.parse(selectedHistory.new_values);
                            return (
                              <div className="space-y-2">
                                {Object.entries(data).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-2 border-b border-green-100 last:border-0">
                                    <span className="text-xs font-semibold text-green-900 uppercase">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                    <span className="text-sm text-green-700 font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return <p className="text-sm text-gray-500">Unable to parse data</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Data for DELETE */}
                  {selectedHistory.action === 'DELETE' && selectedHistory.old_values && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Deleted Data</h4>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        {(() => {
                          try {
                            const data = JSON.parse(selectedHistory.old_values);
                            return (
                              <div className="space-y-2">
                                {Object.entries(data).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-2 border-b border-red-100 last:border-0">
                                    <span className="text-xs font-semibold text-red-900 uppercase">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                    <span className="text-sm text-red-700">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return <p className="text-sm text-gray-500">Unable to parse data</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t flex gap-3">
                    <button
                      onClick={() => {
                        setIsHistoryDetailOpen(false);
                        setSelectedHistory(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteHistory(selectedHistory.id);
                        setIsHistoryDetailOpen(false);
                        setSelectedHistory(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Record
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
}