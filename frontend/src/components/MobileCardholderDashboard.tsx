import React, { useState, useEffect } from 'react';
import { getStocks, getNotifications, createToken, getMyToken, StockItem, TokenInfo } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { 
  Home, 
  Package, 
  Bell, 
  Calendar, 
  Menu,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  FileText,
  RefreshCw
} from 'lucide-react';

interface MobileCardholderDashboardProps {
  userData: any;
  onLogout: () => void;
}

interface StockStatus {
  code: string;
  item: string;
  hindiName?: string;
  available: boolean;
  quantity: number;
  unit?: string;
  lastUpdated?: string;
}

type ActiveTab = 'home' | 'stock' | 'quota' | 'notifications';

interface TokenDetails {
  id: string;
  timeSlot: string;
  date: string;
  position: number;
}

interface NotificationItem {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'info';
  time: string;
}

export function MobileCardholderDashboard({ userData, onLogout }: MobileCardholderDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stockStatus, setStockStatus] = useState<StockStatus[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const shopId = userData?.shopId || 'SHOP001';

  useEffect(() => {
    let mounted = true;
    const loadStocks = async () => {
  setStockLoading(true);
  setStockError(null);

  try {
    const data = await getStocks(shopId);

    const mapped: StockStatus[] = (data ?? []).map((s) => ({
      code: s.code,
      item: s.name,
      hindiName: s.item_name_hindi ?? undefined,
      available: s.quantity > 0,
      quantity: s.quantity,
      unit: s.unit ?? undefined,
      lastUpdated: s.updatedAt || "",
    }));

    setStockStatus(mapped);
  } catch (e: any) {
    setStockError(e.message || "Failed to load stock");
  } finally {
    setStockLoading(false);
  }
};

    loadStocks();
    return () => { mounted = false; };
  }, [shopId]);

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      setNotifLoading(true); setNotifError(null);
      try {
        const data = await getNotifications(20);
        if (mounted) setNotifications(data.map(n => ({ id: n.id, message: n.message, type: 'info', time: n.createdAt || '' })));
      } catch (e: any) {
        if (mounted) setNotifError(e.message || 'Failed to load notifications');
      } finally { mounted && setNotifLoading(false); }
    };
    loadNotifications();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadMyToken = async () => {
      setTokenLoading(true); setTokenError(null);
      try {
        const data = await getMyToken();
        let token: TokenInfo | null = null;
        if (data) {
          token = 'token' in data ? (data as any).token : (data as TokenInfo);
        }
        if (mounted && token) {
          setTokenDetails({
            id: token.id?.toString() || 'T-UNKNOWN',
            timeSlot: token.timeslot || 'N/A',
            date: token.createdAt?.split('T')[0] || 'Today',
            position: (token.position as number) || 0,
          });
        }
      } catch (e: any) {
        if (mounted) setTokenError(e.message || 'Failed to load token');
      } finally { mounted && setTokenLoading(false); }
    };
    loadMyToken();
    return () => { mounted = false; };
  }, []);

  const bookToken = async () => {
    setTokenLoading(true); setTokenError(null);
    try {
      const created = await createToken(shopId);
      setTokenDetails({
        id: created.id?.toString() || 'T-NEW',
        timeSlot: created.timeslot || 'Pending',
        date: created.createdAt?.split('T')[0] || 'Today',
        position: (created.position as number) || 0,
      });
    } catch (e: any) {
      setTokenError(e.message || 'Failed to book token');
    } finally { setTokenLoading(false); }
  };

  const calculateProgress = (collected: number, eligible: number) => (eligible === 0 ? 0 : (collected / eligible) * 100);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4">
            {/* Priority Alert for BPL */}
            {userData.category === 'BPL' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Priority Access:</strong> You have priority notifications as a BPL cardholder.
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">
                    {stockStatus.filter(s => s.available).length}/{stockStatus.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Items Available</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">{tokenDetails?.position ?? 0}</div>
                  <p className="text-sm text-muted-foreground">Queue Position</p>
                </CardContent>
              </Card>
            </div>

            {/* Token Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Token Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!tokenDetails ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Book a token to avoid waiting in long queues
                    </p>
                    <Button onClick={bookToken} className="w-full h-12 bg-orange-600 hover:bg-orange-700">
                      <Clock className="w-4 h-4 mr-2" />
                      Book Token for Today
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Token: {tokenDetails.id}</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm"><strong>Time:</strong> {tokenDetails.timeSlot}</p>
                      <p className="text-sm"><strong>Position:</strong> #{tokenDetails.position}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Arrive 15 minutes before your slot
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.slice(0, 2).map(notif => (
                  <Alert key={notif.id} className={
                    notif.type === 'success' ? 'border-green-200 bg-green-50' :
                    notif.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                    'border-blue-200 bg-blue-50'
                  }>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="text-sm">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">{notif.time}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'stock':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2>Stock Status</h2>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {stockStatus.map((stock, index) => (
              <Card key={index} className={!stock.available ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{stock.item}</h3>
                      <p className="text-sm text-muted-foreground">{stock.hindiName}</p>
                    </div>
                    <Badge variant={stock.available ? 'default' : 'destructive'}>
                      {stock.available ? 'Available' : 'Out of Stock'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xl font-bold">
                        {stock.quantity} {stock.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated: {stock.lastUpdated}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'quota':
        return (
          <div className="space-y-4">
            <h2>Monthly Quota</h2>
            
            {Object.entries((userData?.eligibility ?? {}) as Record<string, number>).map(([item, eligible]) => {
              const collected = ((userData?.collected ?? {}) as Record<string, number>)[item] ?? 0;
              const progress = calculateProgress(collected, eligible);
              return (
                <Card key={item}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium capitalize">{item}</h3>
                        <span className="text-sm">
                          {collected}/{eligible} kg
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Collected: {collected} kg</span>
                        <span>Remaining: {eligible - collected} kg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h2>All Notifications</h2>
            {notifications.map(notif => (
              <Alert key={notif.id} className={
                notif.type === 'success' ? 'border-green-200 bg-green-50' :
                notif.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">{notif.time}</p>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-600 text-white sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h1 className="text-lg truncate">{userData.name}</h1>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={userData.category === 'BPL' ? 'default' : 'secondary'} className="bg-white text-orange-600 text-xs">
                {userData.category}
              </Badge>
              <span className="text-orange-100 text-xs">{userData.rationCard}</span>
            </div>
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
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Ration Shop - Block 15, Sector 7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">rationshop.block15@gov.in</span>
                  </div>
                </div>
                
                <hr />
                
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  File Complaint
                </Button>
                
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
      {(() => {
        const tabs: { id: ActiveTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'stock', icon: Package, label: 'Stock' },
          { id: 'quota', icon: Calendar, label: 'Quota' },
          { id: 'notifications', icon: Bell, label: 'Alerts' },
        ];
        return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-4 h-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === tab.id 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
        );
      })()}
    </div>
  );
}