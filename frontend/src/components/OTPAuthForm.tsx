import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { ArrowLeft, Shield, User, MessageCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface OTPAuthFormProps {
  onLogin: (userType: 'admin' | 'cardholder', userData: any) => void;
}

type AuthStep = 'userType' | 'email' | 'otp';

export function OTPAuthForm({ onLogin }: OTPAuthFormProps) {
  const [step, setStep] = useState<AuthStep>('userType');
  const [userType, setUserType] = useState<'cardholder' | 'admin'>('cardholder');
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'malayalam', label: 'മലയാളം' },
    { value: 'bengali', label: 'বাংলা' },
    { value: 'marathi', label: 'मराठी' }
  ];

  const sendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: userType })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      setIsOTPSent(true);
      setCountdown(30);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp, role: userType, language })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid verification code');
      }
      // Store JWT + user details for persistence across refresh
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.user.role);
      try {
        localStorage.setItem('user_data', JSON.stringify(data.user));
      } catch (_) {
        // ignore storage errors
      }
      // Pass user data to parent
      if (userType === 'admin') {
        const adminData = {
          email: data.user.email,
          shopId: data.user.shopId || 'SHOP001',
          shopName: 'Ration Shop - Block 15, Sector 7',
          district: 'Delhi Central',
          language: data.user.language
        };
        try { localStorage.setItem('user_data', JSON.stringify(adminData)); } catch {}
        onLogin('admin', adminData);
      } else {
        const cardData = {
          email: data.user.email,
          rationCard: data.user.rationCard,
          name: data.user.name,
          category: data.user.category,
          language: data.user.language,
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
        };
        try { localStorage.setItem('user_data', JSON.stringify(cardData)); } catch {}
        onLogin('cardholder', cardData);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: userType })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend code');
      }
      setCountdown(30);
    } catch (err: any) {
      setError(err.message || 'Resend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOTP('');
    } else if (step === 'email') {
      setStep('userType');
      setEmail('');
    }
  };

  const renderUserTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl">Select Account Type</h2>
        <p className="text-muted-foreground">Choose your role to continue</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setUserType('cardholder')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            userType === 'cardholder' 
              ? 'border-orange-600 bg-orange-50' 
              : 'border-gray-200 bg-white hover:border-orange-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${userType === 'cardholder' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <User className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Ration Card Holder</h3>
              <p className="text-sm text-muted-foreground">राशन कार्ड धारक</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setUserType('admin')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            userType === 'admin' 
              ? 'border-green-600 bg-green-50' 
              : 'border-gray-200 bg-white hover:border-green-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${userType === 'admin' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Shop Admin</h3>
              <p className="text-sm text-muted-foreground">दुकान प्रशासक</p>
            </div>
          </div>
        </button>
      </div>

      <div>
        <Label htmlFor="language" className="text-base">Language / भाषा</Label>
        <Select value={language} onValueChange={setLanguage}>
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
        className={`w-full h-14 text-lg ${
          userType === 'cardholder' 
            ? 'bg-orange-600 hover:bg-orange-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
        onClick={() => setStep('email')}
      >
        Continue
      </Button>
    </div>
  );

  const renderPhoneInput = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl">Enter Email Address</h2>
          <p className="text-muted-foreground">ईमेल पता दर्ज करें</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={userType === 'cardholder' ? 'default' : 'secondary'} 
               className={userType === 'cardholder' ? 'bg-orange-600' : 'bg-green-600'}>
          {userType === 'cardholder' ? 'Card Holder' : 'Shop Admin'}
        </Badge>
      </div>

      <div>
        <Label htmlFor="email" className="text-base">Email Address</Label>
        <div className="mt-2">
          <Input
            id="email"
            type="email"
            className="h-14 text-lg"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Demo: Use any email (include 'bpl' for BPL category)
        </p>
      </div>

      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription>
          A verification code will be sent to your email address. Please check your inbox and spam folder.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        className={`w-full h-14 text-lg ${
          userType === 'cardholder' 
            ? 'bg-orange-600 hover:bg-orange-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
        onClick={sendOTP}
        disabled={loading || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
      >
        {loading ? 'Sending...' : (
          <>
            <MessageCircle className="w-5 h-5 mr-2" />
            Send Verification Code
          </>
        )}
      </Button>
    </div>
  );

  const renderOTPInput = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl">Enter OTP</h2>
          <p className="text-muted-foreground">OTP दर्ज करें</p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          Code sent to {email.slice(0, 3)}***@{email.split('@')[1]}
        </p>
      </div>

      <div>
        <Label htmlFor="otp" className="text-base">6-Digit Verification Code</Label>
        <Input
          id="otp"
          type="text"
          className="h-14 text-lg text-center tracking-widest"
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Demo Code: 123456
        </p>
      </div>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend code in {countdown} seconds
          </p>
        ) : (
          <Button variant="ghost" onClick={resendOTP}>
            Resend Code
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        className={`w-full h-14 text-lg ${
          userType === 'cardholder' 
            ? 'bg-orange-600 hover:bg-orange-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
        onClick={verifyOTP}
        disabled={loading || otp.length !== 6}
      >
        {loading ? 'Verifying...' : 'Verify & Login'}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-6 text-center border-b">
          <h1 className="text-2xl mb-1">राशन वितरण प्रणाली</h1>
          <h2 className="text-lg text-muted-foreground">PDS Digital Platform</h2>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            {step === 'userType' && renderUserTypeSelection()}
            {step === 'email' && renderPhoneInput()}
            {step === 'otp' && renderOTPInput()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}