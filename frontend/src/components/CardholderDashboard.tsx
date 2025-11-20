import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Package,
  Bell,
  Calendar,
  AlertCircle,
} from "lucide-react";

import {
  getStocks,
  getNotifications,
  createToken,
  getMyToken,
  StockItem,
  TokenInfo,
} from "../lib/api";

interface CardholderDashboardProps {
  userData: any;
  onLogout: () => void;
}

export function CardholderDashboard({
  userData,
  onLogout,
}: CardholderDashboardProps) {
  const shopId = userData?.shopId || "SHOP001";

  const [stock, setStock] = useState<StockItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [token, setToken] = useState<TokenInfo | null>(null);

  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [loadingToken, setLoadingToken] = useState(true);

  const [stockError, setStockError] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // ============================================================
  // AUTO REFRESH — Every 10 seconds (same as admin)
  // ============================================================
  useEffect(() => {
    let active = true;

    const loadAll = async () => {
      try {
        const [s, n, t] = await Promise.all([
          getStocks(shopId),
          getNotifications(20),
          getMyToken(),
        ]);

        if (!active) return;

        setStock(s);
        setNotifications(n);

        const formatted =
          t && typeof t === "object" && "id" in t ? (t as TokenInfo) : null;

        setToken(formatted);

        setLoadingStock(false);
        setLoadingNotif(false);
        setLoadingToken(false);
      } catch (err: any) {
        console.error(err);
      }
    };

    loadAll();
    const interval = setInterval(loadAll, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [shopId]);

  // ============================================================
  // BOOK TOKEN
  // ============================================================
  const bookToken = async () => {
    try {
      setLoadingToken(true);
      const created = await createToken(shopId);
      setToken(created);
    } catch (err: any) {
      setTokenError(err.message || "Failed to book token");
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-orange-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl">राशन कार्ड होल्डर / Ration Card Holder</h1>
            <p className="text-orange-100">{userData?.name}</p>
          </div>

          <Button
            variant="outline"
            className="text-orange-600 bg-white"
            onClick={onLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        {/* ======================================================
            STOCK
        ====================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stock Availability
            </CardTitle>
            <CardDescription>Live stock from ration shop</CardDescription>
          </CardHeader>

          <CardContent>
            {loadingStock && <p>Loading stock...</p>}
            {stockError && (
              <Alert>
                <AlertDescription>{stockError}</AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {stock.map((s) => (
                <Card key={s.code}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{s.name}</strong>
                        <div className="text-sm text-muted-foreground">
                          {s.item_name_hindi ?? "—"}
                        </div>
                      </div>
                      <Badge>{s.quantity}</Badge>
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Updated: {s.updatedAt || s.last_restocked || "—"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ======================================================
            NOTIFICATIONS
        ====================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loadingNotif && <p>Loading notifications...</p>}
            {notifError && (
              <Alert>
                <AlertDescription>{notifError}</AlertDescription>
              </Alert>
            )}

            {notifications.length === 0 && (
              <p className="text-muted-foreground">No recent notifications</p>
            )}

            {notifications.map((n) => (
              <Alert key={n.id} className="mt-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="flex justify-between w-full">
                  <span>{n.message}</span>
                  <small className="text-xs text-muted-foreground">
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleString()
                      : n.acknowledgedAt
                      ? new Date(n.acknowledgedAt).toLocaleString()
                      : ""}
                  </small>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>

        {/* ======================================================
            TOKEN
        ====================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Digital Token
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loadingToken && <p>Loading token...</p>}
            {tokenError && (
              <Alert>
                <AlertDescription>{tokenError}</AlertDescription>
              </Alert>
            )}

            {!token ? (
              <div className="text-center">
                <p className="mb-2">Book a token to reserve your visit time</p>
                <Button onClick={bookToken}>Book Token</Button>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>Token: {token.id}</strong>
                      <div>Slot: {token.timeslot}</div>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CardholderDashboard;
