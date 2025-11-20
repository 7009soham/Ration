import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  Package, 
  Bell, 
  Users, 
  BarChart3, 
  Plus, 
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Menu,
  Minus,
  RefreshCw,
  Flag,
  Shield,
  Eye
} from 'lucide-react';

interface MobileAdminDashboardProps {
  userData: any;
  onLogout: () => void;
}

interface StockItem {
  id: string;
  name: string;
  hindiName: string;
  quantity: number;
  unit: string;
  lastRestocked: string;
  lowStock: boolean;
}

export function MobileAdminDashboard({ userData, onLogout }: MobileAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const API_BASE = 'http://localhost:5000/api';

  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Wheat stock is running low', type: 'warning', sent: false },
    { id: 2, message: 'New rice stock added - 150kg', type: 'success', sent: true },
    ]);  
  
  const [customNotification, setCustomNotification] = useState({
    category: 'all',
    type: 'stock',
    message: ''
  });

  const [tokens] = useState([
    { id: 'T001', cardHolder: 'RAM KUMAR (BPL123456)', category: 'BPL', timeSlot: '10:00 AM', status: 'active' },
    { id: 'T002', cardHolder: 'SITA DEVI (APL789012)', category: 'APL', timeSlot: '11:00 AM', status: 'completed' },
    { id: 'T003', cardHolder: 'MOHAN LAL (BPL456789)', category: 'BPL', timeSlot: '12:00 PM', status: 'pending' },
    ]);  
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Backend returns array directly, not wrapped in { success, data }
      if (res.ok && Array.isArray(data)) {
        setNotifications(data.map((n: any) => ({ 
          id: n.id, 
          message: n.message, 
          type: n.type, 
          sent: n.isSent 
        })));
      }
    } catch {}
  };
  
  const sendNotification = async (notificationId: number) => {
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isSent: true })
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, sent: true } : n));
    } catch {}
  };
  
  const sendBulkNotification = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shopId: userData?.shopId || 'SHOP001', type: 'stock', message: 'Stock update broadcast' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(prev => [{ 
          id: data.id, 
          message: 'Stock update broadcast', 
          type: 'stock', 
          sent: true 
        }, ...prev]);
      }
    } catch {}
  };
  
  const sendCustomNotification = async () => {
    if (!customNotification.message.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          shopId: userData?.shopId || 'SHOP001', 
          type: customNotification.type,
          message: `[${customNotification.category}] ${customNotification.message}`,
          category: customNotification.category
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(prev => [{ 
          id: data.id, 
          message: `[${customNotification.category}] ${customNotification.message}`, 
          type: customNotification.type, 
          sent: true 
        }, ...prev]);
        setCustomNotification({ category: 'all', type: 'stock', message: '' });
        alert(`Notification sent to ${customNotification.category === 'all' ? 'all users' : customNotification.category + ' cardholders'}`);
      }
    } catch (e) {
      alert('Failed to send notification');
    }
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const shopId = userData?.shopId || 'SHOP001';
      const res = await fetch(`${API_BASE}/stocks?shopId=${encodeURIComponent(shopId)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load stock');
      const mapped: StockItem[] = (data.data || []).map((r: any) => ({
        id: r.code,
        name: r.name,
        hindiName: r.hindiName,
        quantity: Number(r.quantity),
        unit: r.unit,
        lastRestocked: r.lastRestocked || '-',
        lowStock: Number(r.quantity) < 50
      }));
      setStock(mapped);
    } catch (e: any) {
      setError(e.message || 'Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    if (activeTab === 'users') {
      fetchUsers();
      fetchUserStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedShop, showFlaggedOnly]);

  const updateStock = async (itemId: string, change: number) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const shopId = userData?.shopId || 'SHOP001';
      
      // Find current quantity
      const currentItem = stock.find(item => item.id === itemId);
      if (!currentItem) throw new Error('Item not found');
      
      // Calculate new quantity
      const newQuantity = Math.max(0, currentItem.quantity + change);
      
      const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity, shopId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update');
      
      // Update local state with response
      const updatedItem = data.data;
      setStock(prev => prev.map(item => item.id === itemId ? {
        ...item,
        quantity: Number(updatedItem.quantity),
        lastRestocked: updatedItem.updatedAt || new Date().toLocaleString(),
        lowStock: Number(updatedItem.quantity) < 50
      } : item));
    } catch (e: any) {
      setError(e.message || 'Failed to update');
      console.error('Update stock error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (selectedRole !== 'all') params.set('role', selectedRole);
      if (selectedShop !== 'all') params.set('shopId', selectedShop);
      if (showFlaggedOnly) params.set('flagged', 'true');

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) setUsers(data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) setUserStats(data.data || []);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const toggleFlagUser = async (userId: number, currentlyFlagged: boolean, userName: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!currentlyFlagged) {
        const reason = prompt(`Enter reason for flagging ${userName}:`);
        if (!reason) return;

        const res = await fetch(`${API_BASE}/users/${userId}/flag`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ isFlagged: true, flagReason: reason })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          alert(`🚩 ${userName} has been flagged. Government authorities will be notified.`);
          await fetchUsers();
        }
      } else {
        if (confirm(`Remove flag from ${userName}?`)) {
          const res = await fetch(`${API_BASE}/users/${userId}/flag`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ isFlagged: false })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            alert(`Flag removed from ${userName}`);
            await fetchUsers();
          }
        }
      }
    } catch (err) {
      alert('Failed to update flag status');
    }
  };

  

  const renderContent = () => {
    switch (activeTab) {
      case 'stock':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2>Stock Management</h2>
              <Button variant="outline" size="sm" onClick={fetchStock} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {loading ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {stock.map(item => (
              <Card key={item.id} className={item.lowStock ? 'border-orange-200 bg-orange-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.hindiName}</p>
                    </div>
                    {item.lowStock && (
                      <Badge variant="destructive" className="text-xs">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xl font-bold">{item.quantity} {item.unit}</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {item.lastRestocked}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStock(item.id, -10)}
                        disabled={item.quantity < 10}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStock(item.id, 25)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h2>Notifications</h2>
            
            {/* Custom Notification Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Send Custom Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Card Category (NFSA 2013)</Label>
                  <select
                    className="w-full border rounded-md p-2 mt-1"
                    value={customNotification.category}
                    onChange={(e) => setCustomNotification({ ...customNotification, category: e.target.value })}
                  >
                    <option value="all">All Cardholders</option>
                    <option value="AAY">AAY - Antyodaya Anna Yojana (Poorest of Poor)</option>
                    <option value="PHH">PHH - Priority Household (Below Poverty Line)</option>
                    <option value="BPL">BPL - Below Poverty Line (Legacy)</option>
                    <option value="APL">APL - Above Poverty Line (Discontinued)</option>
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm">Notification Type</Label>
                  <select
                    className="w-full border rounded-md p-2 mt-1"
                    value={customNotification.type}
                    onChange={(e) => setCustomNotification({ ...customNotification, type: e.target.value })}
                  >
                    <option value="stock">Stock Update</option>
                    <option value="alert">Alert/Warning</option>
                    <option value="system">System Message</option>
                  </select>
                </div>
                
                <div>
                  <Label className="text-sm">Message</Label>
                  <textarea
                    className="w-full border rounded-md p-2 mt-1 min-h-[80px]"
                    placeholder="Enter notification message..."
                    value={customNotification.message}
                    onChange={(e) => setCustomNotification({ ...customNotification, message: e.target.value })}
                  />
                </div>
                
                <Button 
                  onClick={sendCustomNotification} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!customNotification.message.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to {customNotification.category === 'all' ? 'All Users' : customNotification.category + ' Cardholders'}
                </Button>
              </CardContent>
            </Card>
            
            <div className="space-y-3">
              <h3 className="font-medium">Recent Notifications</h3>
              {notifications.map(notif => (
                <Alert key={notif.id} className={notif.type === 'warning' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm">{notif.message}</p>
                      </div>
                      <div className="ml-2">
                        {notif.sent ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => sendNotification(notif.id)}>
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        );

      case 'tokens':
        return (
          <div className="space-y-4">
            <h2>Active Tokens</h2>
            
            {tokens.map(token => (
              <Card key={token.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-medium">{token.id}</span>
                    <Badge 
                      variant={
                        token.status === 'completed' ? 'default' : 
                        token.status === 'active' ? 'destructive' : 'secondary'
                      }
                    >
                      {token.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Card Holder</span>
                      <Badge variant={token.category === 'BPL' ? 'default' : 'secondary'} className="text-xs">
                        {token.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{token.cardHolder}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {token.timeSlot}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-4">
            <h2>Today's Analytics</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">45</div>
                  <p className="text-sm text-muted-foreground">Families Served</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">450kg</div>
                  <p className="text-sm text-muted-foreground">Total Distributed</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">28</div>
                  <p className="text-sm text-muted-foreground">BPL Families</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold mb-1">17</div>
                  <p className="text-sm text-muted-foreground">APL Families</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stock.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm">{item.name}</span>
                      <span className={`text-sm font-medium ${item.lowStock ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-4">
            <h2>Users & Shopkeepers Management</h2>
            
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3">
              {userStats.map((stat) => (
                <Card key={stat.shopId}>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">{stat.shopName}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shopkeepers:</span>
                      <Badge variant="outline">{stat.shopkeepers}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cardholders:</span>
                      <Badge variant="outline">{stat.cardholders}</Badge>
                    </div>
                    {stat.flaggedShopkeepers > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-red-600">🚩 Flagged:</span>
                        <Badge variant="destructive">{stat.flaggedShopkeepers}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <div>
                  <Label className="text-xs">Filter by Role</Label>
                  <select 
                    value={selectedRole} 
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full mt-1 p-2 border rounded text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="shopkeeper">Shopkeepers</option>
                    <option value="cardholder">Cardholders</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Filter by Shop</Label>
                  <select 
                    value={selectedShop} 
                    onChange={(e) => setSelectedShop(e.target.value)}
                    className="w-full mt-1 p-2 border rounded text-sm"
                  >
                    <option value="all">All Shops</option>
                    {userStats.map((stat) => (
                      <option key={stat.shopId} value={stat.shopId}>{stat.shopName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="flagged-only"
                    checked={showFlaggedOnly}
                    onChange={(e) => setShowFlaggedOnly(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="flagged-only" className="text-sm">Show Flagged Only</Label>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <div className="space-y-2">
              {users.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No users found
                  </CardContent>
                </Card>
              )}
              
              {users.map((user) => (
                <Card key={user.id} className={user.isFlagged ? 'border-red-300 bg-red-50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{user.name || 'No Name'}</span>
                          <Badge variant={
                            user.role === 'admin' ? 'default' : 
                            user.role === 'shopkeeper' ? 'secondary' : 
                            'outline'
                          } className="text-xs">
                            {user.role}
                          </Badge>
                          {user.isFlagged && (
                            <Badge variant="destructive" className="text-xs">
                              <Flag className="w-3 h-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div className="truncate">{user.email}</div>
                          {user.shopName && <div>Shop: {user.shopName}</div>}
                          {user.mobileNumber && <div>📞 {user.mobileNumber}</div>}
                          {user.cardType && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{user.cardType}</Badge>
                              {user.familySize && <span>Family: {user.familySize}</span>}
                            </div>
                          )}
                          {user.isFlagged && user.flagReason && (
                            <div className="text-red-600 mt-1 italic">
                              ⚠️ {user.flagReason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {user.role !== 'admin' && (
                        <Button
                          variant={user.isFlagged ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => toggleFlagUser(user.id, user.isFlagged, user.name)}
                          className="shrink-0"
                        >
                          {user.isFlagged ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Unflag
                            </>
                          ) : (
                            <>
                              <Flag className="w-3 h-3 mr-1" />
                              Flag
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h1 className="text-lg">Admin Dashboard</h1>
            <p className="text-green-100 text-sm truncate">{userData.shopName}</p>
          </div>
          
          {/* Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Shop Details</h3>
                  <p className="text-sm text-muted-foreground">{userData.shopName}</p>
                  <p className="text-sm text-muted-foreground">ID: {userData.shopId}</p>
                  <p className="text-sm text-muted-foreground">District: {userData.district}</p>
                </div>
                
                <hr />
                
                <Button variant="destructive" onClick={onLogout} className="w-full">
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <div className="pb-20">
        <div className="p-4">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-5 h-16">
            {[
              { id: 'stock', icon: Package, label: 'Stock' },
              { id: 'notifications', icon: Bell, label: 'Alerts' },
              { id: 'users', icon: Users, label: 'Users' },
              { id: 'tokens', icon: Clock, label: 'Tokens' },
              { id: 'analytics', icon: BarChart3, label: 'Reports' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                  activeTab === tab.id 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}