import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Shield, User } from 'lucide-react';

interface MobileAuthFormProps {
  onLogin: (userType: 'admin' | 'cardholder', userData: any) => void;
}

export function MobileAuthForm({ onLogin }: MobileAuthFormProps) {
  const [userType, setUserType] = useState<'cardholder' | 'admin'>('cardholder');
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
    onLogin('admin', {
      shopId: adminForm.shopId,
      shopName: 'Ration Shop - Block 15, Sector 7',
      district: 'Delhi Central',
      language: adminForm.language
    });
  };

  const handleCardholderLogin = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-6 text-center border-b">
          <h1 className="text-2xl mb-1">राशन वितरण प्रणाली</h1>
          <h2 className="text-lg text-muted-foreground">PDS Digital Platform</h2>
        </div>
        
        {/* User Type Toggle */}
        <div className="flex p-2 bg-gray-50">
          <button
            onClick={() => setUserType('cardholder')}
            className={`flex-1 py-3 px-4 rounded-lg mx-1 flex items-center justify-center gap-2 transition-all ${
              userType === 'cardholder' 
                ? 'bg-orange-600 text-white shadow-md' 
                : 'bg-white text-gray-600 border'
            }`}
          >
            <User className="w-5 h-5" />
            Card Holder
          </button>
          <button
            onClick={() => setUserType('admin')}
            className={`flex-1 py-3 px-4 rounded-lg mx-1 flex items-center justify-center gap-2 transition-all ${
              userType === 'admin' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'bg-white text-gray-600 border'
            }`}
          >
            <Shield className="w-5 h-5" />
            Shop Admin
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            {userType === 'cardholder' ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="rationCard" className="text-base">Ration Card Number</Label>
                  <Input
                    id="rationCard"
                    className="mt-2 h-12 text-lg"
                    placeholder="Enter ration card number"
                    value={cardholderForm.rationCard}
                    onChange={(e) => setCardholderForm(prev => ({ ...prev, rationCard: e.target.value }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Demo: BPL123456 or APL789012
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="mobile" className="text-base">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    className="mt-2 h-12 text-lg"
                    placeholder="Enter 10-digit mobile number"
                    value={cardholderForm.mobile}
                    onChange={(e) => setCardholderForm(prev => ({ ...prev, mobile: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="language" className="text-base">Language / भाषा</Label>
                  <Select value={cardholderForm.language} onValueChange={(value) => setCardholderForm(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value} className="text-base py-3">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700" 
                  onClick={handleCardholderLogin}
                  disabled={!cardholderForm.rationCard || !cardholderForm.mobile}
                >
                  Login as Card Holder
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="shopId" className="text-base">Shop ID</Label>
                  <Input
                    id="shopId"
                    className="mt-2 h-12 text-lg"
                    placeholder="Enter shop ID"
                    value={adminForm.shopId}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, shopId: e.target.value }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Demo: SHOP001
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-base">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    className="mt-2 h-12 text-lg"
                    placeholder="Enter password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="adminLanguage" className="text-base">Language / भाषा</Label>
                  <Select value={adminForm.language} onValueChange={(value) => setAdminForm(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value} className="text-base py-3">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700" 
                  onClick={handleAdminLogin}
                  disabled={!adminForm.shopId || !adminForm.password}
                >
                  Login as Shop Admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}