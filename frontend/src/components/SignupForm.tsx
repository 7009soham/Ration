import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { ProgressIndicator } from './ProgressIndicator';
import { SocialLoginButtons } from './SocialLoginButtons';
import { CheckCircle } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  teamSize: string;
}

export function SignupForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    teamSize: ''
  });

  const stepNames = ['Personal', 'Security', 'Company', 'Complete'];
  const totalSteps = 4;

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName && formData.lastName && formData.email;
      case 1:
        return formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
      case 2:
        return formData.company && formData.teamSize;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    nextStep(); // Move to success step
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="Create a strong password"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Must be at least 8 characters long
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateFormData('company', e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div>
              <Label htmlFor="teamSize">Team Size</Label>
              <Select value={formData.teamSize} onValueChange={(value) => updateFormData('teamSize', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 people</SelectItem>
                  <SelectItem value="6-20">6-20 people</SelectItem>
                  <SelectItem value="21-50">21-50 people</SelectItem>
                  <SelectItem value="51-200">51-200 people</SelectItem>
                  <SelectItem value="200+">200+ people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div>
              <h3 className="mb-2">Welcome to the team!</h3>
              <p className="text-muted-foreground">
                Your account has been created successfully. We've sent a verification email to{' '}
                <span className="text-primary">{formData.email}</span>
              </p>
            </div>
            <Button className="w-full" onClick={() => console.log('Redirecting to dashboard...')}>
              Get Started
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="mb-8">
        <h1 className="mb-2">Create your account</h1>
        <p className="text-muted-foreground">Join thousands of teams already using our platform</p>
      </div>

      {currentStep < 3 && (
        <>
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepNames={stepNames}
          />

          <SocialLoginButtons />

          <div className="my-6">
            <Separator className="my-4" />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="min-h-[200px]">
        {renderStep()}
      </div>

      {currentStep < 3 && (
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={currentStep === 2 ? handleSubmit : nextStep}
            disabled={!isStepValid()}
            className="flex-1"
          >
            {currentStep === 2 ? 'Create Account' : 'Continue'}
          </Button>
        </div>
      )}

      {currentStep < 3 && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <button className="text-primary hover:underline">Sign in</button>
        </p>
      )}
    </div>
  );
}