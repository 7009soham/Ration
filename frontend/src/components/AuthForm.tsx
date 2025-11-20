import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface AuthFormProps {
  onLogin: (userType: 'admin' | 'cardholder', userData: any) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [adminForm, setAdminForm] = useState({
    shopId: '',
    password: '',
    language: 'english'
  });

  const [cardholderForm, setCardholderForm] = useState({
    rationCard: '',
    mobile: '',
    language: 'english'
  });

  const handleAdminLogin = () => {
    // Mock admin login
    onLogin('admin', {
      shopId: adminForm.shopId,
      shopName: 'Ration Shop - Block 15, Sector 7',
      district: 'Delhi Central',
      language: adminForm.language
    });
  };

  const handleCardholderLogin = () => {
    // Mock cardholder login
    onLogin('cardholder', {
      rationCard: cardholderForm.rationCard,
      name: 'राम कुमार / Ram Kumar',
      category: cardholderForm.rationCard.startsWith('BPL') ? 'BPL' : 'APL',
      mobile: cardholderForm.mobile,
      language: cardholderForm.language,
      eligibility: {
        rice: 5,
        wheat: 5,
        sugar: 1,
        kerosene: 2
      },
      collected: {
        rice: 0,
        wheat: 0,
        sugar: 0,
        kerosene: 0
      }
    });
  };

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'malayalam', label: 'മലയാളം' },
    { value: 'bengali', label: 'বাংলা' },
    { value: 'marathi', label: 'मराठी' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">राशन वितरण प्रणाली</CardTitle>
          <CardTitle className="text-xl">Ration Distribution System</CardTitle>
          <CardDescription>
            Public Distribution System - Digital Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cardholder" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cardholder">Card Holder</TabsTrigger>
              <TabsTrigger value="admin">Shop Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cardholder" className="space-y-4">
              <div>
                <Label htmlFor="rationCard">Ration Card Number</Label>
                <Input
                  id="rationCard"
                  placeholder="Enter ration card number"
                  value={cardholderForm.rationCard}
                  onChange={(e) => setCardholderForm(prev => ({ ...prev, rationCard: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use: BPL123456 or APL789012 for demo
                </p>
              </div>
              
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  placeholder="Enter mobile number"
                  value={cardholderForm.mobile}
                  onChange={(e) => setCardholderForm(prev => ({ ...prev, mobile: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="language">Language / भाषा</Label>
                <Select value={cardholderForm.language} onValueChange={(value) => setCardholderForm(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700" 
                onClick={handleCardholderLogin}
                disabled={!cardholderForm.rationCard || !cardholderForm.mobile}
              >
                Login as Card Holder
              </Button>
            </TabsContent>
            
            <TabsContent value="admin" className="space-y-4">
              <div>
                <Label htmlFor="shopId">Shop ID</Label>
                <Input
                  id="shopId"
                  placeholder="Enter shop ID"
                  value={adminForm.shopId}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, shopId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use: SHOP001 for demo
                </p>
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="adminLanguage">Language / भाषा</Label>
                <Select value={adminForm.language} onValueChange={(value) => setAdminForm(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleAdminLogin}
                disabled={!adminForm.shopId || !adminForm.password}
              >
                Login as Shop Admin
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}