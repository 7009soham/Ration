import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

import {
  Package,
  Bell,
  Users,
  Plus,
  AlertCircle,
  Send,
} from "lucide-react";

import {
  getStocks,
  updateStockItem,
  getNotifications,
  createNotification,
  getAllTokens,
  StockItem,
  NotificationItem,
  TokenInfo,
} from "../lib/api";

interface AdminDashboardProps {
  userData: any;
  onLogout: () => void;
}

export function AdminDashboard({ userData, onLogout }: AdminDashboardProps) {
  const shopId = userData?.shopId ?? "";

  const [stock, setStock] = useState<StockItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);

  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [loadingTokens, setLoadingTokens] = useState(true);

  const [newStock, setNewStock] = useState({ itemId: "", quantity: "" });
  const [customNotification, setCustomNotification] = useState({
    category: 'all',
    type: 'stock',
    message: ''
  });

  // ============================================================
  // AUTO REFRESH — STOCK + NOTIFS + TOKENS
  // ============================================================
  useEffect(() => {
    if (!shopId) return;

    const loadAll = async () => {
      try {
        const [s, n, t] = await Promise.all([
          getStocks(shopId),
          getNotifications(50),
          getAllTokens(shopId),
        ]);

        setStock(s ?? []);
        setNotifications(n ?? []);
        setTokens(t ?? []);

        setLoadingStock(false);
        setLoadingNotif(false);
        setLoadingTokens(false);
      } catch (e) {
        console.error("Auto refresh failed", e);
      }
    };

    loadAll();
    const interval = setInterval(loadAll, 10000);

    return () => clearInterval(interval);
  }, [shopId]);

  // ============================================================
  // UPDATE STOCK
  // ============================================================
  const updateStockHandler = async () => {
    if (!newStock.itemId || !newStock.quantity) {
      return alert("Enter item & quantity");
    }

    try {
      await updateStockItem(newStock.itemId, Number(newStock.quantity), shopId);

      const refreshed = await getStocks(shopId);
      setStock(refreshed ?? []);

      setNewStock({ itemId: "", quantity: "" });

      await createNotification({
        shopId,
        userId: null,
        type: "stock-update",
        message: `Stock updated for ${newStock.itemId}`,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update stock");
    }
  };

  // ============================================================
  // NOTIFY ALL USERS
  // ============================================================
  const sendBulkNotification = async () => {
    try {
      await createNotification({
        shopId,
        userId: null,
        type: "system",
        message: "Stock update available for all users",
      });

      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "system",
          message: "Stock update available for all users",
        } as any,
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to send notification");
    }
  };
  
  // ============================================================
  // SEND CUSTOM NOTIFICATION
  // ============================================================
  const sendCustomNotification = async () => {
    if (!customNotification.message.trim()) {
      alert("Please enter a message");
      return;
    }
    
    try {
      await createNotification({
        shopId,
        userId: null,
        type: customNotification.type as any,
        message: `[${customNotification.category}] ${customNotification.message}`,
      });

      setNotifications((prev) => [
        {
          id: Date.now(),
          type: customNotification.type as any,
          message: `[${customNotification.category}] ${customNotification.message}`,
        } as any,
        ...prev,
      ]);
      
      setCustomNotification({ category: 'all', type: 'stock', message: '' });
      alert(`Notification sent to ${customNotification.category === 'all' ? 'all users' : customNotification.category + ' cardholders'}`);
    } catch (err) {
      console.error(err);
      alert("Failed to send notification");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-green-600 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <div>
            <h1 className="text-xl">Admin Dashboard</h1>
            <p className="text-green-100">{userData.shopName}</p>
          </div>

          <Button variant="outline" className="text-green-600 bg-white" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Tabs defaultValue="stock">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* ================= STOCK TAB ================= */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Stock Management
                </CardTitle>
                <CardDescription>Manage stock inventory</CardDescription>
              </CardHeader>

              <CardContent>
                {loadingStock ? (
                  <p>Loading...</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {stock.map((s) => (
                      <Card
                        key={s.code}
                        className={s.quantity < 15 ? "border-red-300 bg-red-50" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{s.name}</h3>
                              <p className="text-xs">{s.unit}</p>
                            </div>
                            {s.quantity < 15 && (
                              <Badge className="bg-red-600 text-white">Low</Badge>
                            )}
                          </div>
                          <p className="text-2xl mt-2">{s.quantity}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* ADD STOCK */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" /> Add Stock
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Label>Item</Label>
                        <select
                          className="w-full border p-2 rounded-md"
                          value={newStock.itemId}
                          onChange={(e) =>
                            setNewStock((p) => ({ ...p, itemId: e.target.value }))
                          }
                        >
                          <option value="">Select item</option>
                          {stock.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={newStock.quantity}
                          onChange={(e) =>
                            setNewStock((p) => ({ ...p, quantity: e.target.value }))
                          }
                          placeholder="Enter qty"
                        />
                      </div>

                      <Button onClick={updateStockHandler}>Add</Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= NOTIFICATIONS TAB ================= */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Custom Notification Form */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base">Send Custom Notification</CardTitle>
                    <CardDescription>Target specific card categories based on NFSA 2013</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Card Category (NFSA 2013)</Label>
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
                      <Label>Notification Type</Label>
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
                      <Label>Message</Label>
                      <textarea
                        className="w-full border rounded-md p-2 mt-1 min-h-[100px]"
                        placeholder="Enter notification message..."
                        value={customNotification.message}
                        onChange={(e) => setCustomNotification({ ...customNotification, message: e.target.value })}
                      />
                    </div>
                    
                    <Button 
                      onClick={sendCustomNotification} 
                      className="w-full bg-green-600"
                      disabled={!customNotification.message.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send to {customNotification.category === 'all' ? 'All Users' : customNotification.category + ' Cardholders'}
                    </Button>
                  </CardContent>
                </Card>

                <h3 className="mt-4 font-medium">Recent Notifications</h3>

                {loadingNotif ? (
                  <p>Loading...</p>
                ) : notifications.length === 0 ? (
                  <p>No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <Alert key={n.id} className="bg-blue-50 border-blue-300 mt-2">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{n.message}</AlertDescription>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TOKENS TAB ================= */}
          <TabsContent value="tokens">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Tokens
                </CardTitle>
              </CardHeader>

              <CardContent>
                {loadingTokens ? (
                  <p>Loading...</p>
                ) : tokens.length === 0 ? (
                  <p>No tokens booked</p>
                ) : (
                  tokens.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 border rounded-lg mb-2 flex justify-between"
                    >
                      <div>
                        <p className="font-medium">#{t.id}</p>
                        <p className="text-xs">{t.timeslot}</p>
                      </div>
                      <Badge>{t.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= ANALYTICS TAB ================= */}
          <TabsContent value="analytics">
            <p className="text-gray-500">Analytics coming soon…</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminDashboard;
