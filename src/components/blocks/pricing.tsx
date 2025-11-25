// components/Pricing.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  maxParticipants: number;
  maxDuration: number;
  maxRoomsPerMonth: number;
  maxMinutesPerMonth: number;
  recordingStorage: number;
  whiteboard: boolean;
  status: 'active' | 'inactive' | 'archived';
  sortOrder: number;
}

interface RegistrationForm {
  name: string;
  email: string;
  phone: string;
  organization: string;
  organizationDescription: string;
  planId: string;
}

interface LoginForm {
  email: string;
  password: string;
}

interface PricingProps {
  className?: string;
}

type DialogMode = 'register' | 'login';

export const Pricing = ({ className }: PricingProps) => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('register');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    email: '',
    phone: '',
    organization: '',
    organizationDescription: '',
    planId: '',
  });

  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plans?where[status][equals]=active&sort=sortOrder');

        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }

        const data = await response.json();
        setPlans(data.docs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans');
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const calculatePrice = (plan: Plan) => {
    const basePrice = plan.price;
    if (isAnnual && plan.billingPeriod === 'monthly') {
      return basePrice * 12 * 0.8; // 20% discount for annual
    }
    return basePrice;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getBillingPeriodDisplay = (plan: Plan) => {
    if (isAnnual && plan.billingPeriod === 'monthly') {
      return "year";
    }
    return plan.billingPeriod;
  };

  const getFeaturesList = (plan: Plan): string[] => {
    const features: string[] = [];

    features.push(`${plan.maxParticipants} participants per room`);
    features.push(`${plan.maxDuration === 0 ? 'Unlimited' : plan.maxDuration} minutes per room`);
    features.push(`${plan.maxRoomsPerMonth} rooms per month`);
    features.push(`${plan.maxMinutesPerMonth} total minutes per month`);
    features.push(`${plan.recordingStorage}GB recording storage`);
    if (plan.whiteboard) features.push('Interactive whiteboard');

    return features;
  };

  const handleGetStarted = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData(prev => ({
      ...prev,
      planId: plan.id,
      ...(user ? {
        name: user.name || prev.name,
        email: user.email || prev.email,
      } : {})
    }));

    setDialogMode(user ? 'register' : 'login');
    setIsDialogOpen(true);
  };

  const handleInputChange = (field: keyof RegistrationForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLoginInputChange = (field: keyof LoginForm, value: string) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
    setLoginError(null);
  };

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
        variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    toast.innerHTML = `
      <div class="font-semibold">${title}</div>
      <div class="text-sm">${description}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      setLoginError("Please fill in all fields");
      return;
    }

    try {
      setLoginError(null);
      setIsSubmitting(true);
      await login(loginForm.email, loginForm.password);

      setDialogMode('register');
      showToast("Login successful!", "You can now complete your subscription.");

    } catch (error: any) {
      setLoginError(error.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const findOrCreateCustomer = async (email: string, name: string) => {
    try {
      // Try to find existing customer
      const findResponse = await fetch('/api/customers?where[email][equals]=' + encodeURIComponent(email));

      if (findResponse.ok) {
        const findData = await findResponse.json();
        if (findData.docs && findData.docs.length > 0) {
          return findData.docs[0];
        }
      }

      // Create new customer
      const createResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: formData.phone,
          organization: formData.organization,
          organizationDescription: formData.organizationDescription,
          status: 'active'
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create customer');
      }

      const customerData = await createResponse.json();
      return customerData.doc;

    } catch (error) {
      console.error('Error in findOrCreateCustomer:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.planId) {
      showToast("Missing information", "Please fill in all required fields.", "destructive");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find or create customer
      const customerData = await findOrCreateCustomer(formData.email, formData.name);
      const customerId = customerData.id;

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();

      if (isAnnual && selectedPlan?.billingPeriod === 'monthly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (selectedPlan?.billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (selectedPlan?.billingPeriod === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create subscription
      const subscriptionResponse = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          plan: formData.planId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'pending',
          autoRenew: true,
        }),
      });

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.message || subscriptionData.error || 'Failed to create subscription');
      }

      showToast(
          "Registration successful!",
          "Your subscription has been created. Please check your email for invoice details."
      );

      // Reset form
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        organization: '',
        organizationDescription: '',
        planId: '',
      });
      setIsDialogOpen(false);
      setSelectedPlan(null);

      // Redirect
      setTimeout(() => {
        router.push(user ? '/dashboard' : '/thank-you');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      showToast(
          "Registration failed",
          error.message || "There was an error creating your account. Please try again.",
          "destructive"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToRegister = () => {
    setDialogMode('register');
    setLoginError(null);
    setLoginForm({ email: '', password: '' });
  };

  const switchToLogin = () => {
    setDialogMode('login');
    if (formData.email) {
      setLoginForm(prev => ({ ...prev, email: formData.email }));
    }
  };

  if (loading) {
    return (
        <section className={cn("py-28 lg:py-32", className)}>
          <div className="container max-w-5xl">
            <div className="text-center flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading plans...
            </div>
          </div>
        </section>
    );
  }

  if (error) {
    return (
        <section className={cn("py-28 lg:py-32", className)}>
          <div className="container max-w-5xl">
            <div className="text-center text-red-500">Error: {error}</div>
          </div>
        </section>
    );
  }

  if (plans.length === 0) {
    return (
        <section className={cn("py-28 lg:py-32", className)}>
          <div className="container max-w-5xl">
            <div className="text-center">No plans available at the moment</div>
          </div>
        </section>
    );
  }

  return (
      <>
        <section className={cn("py-28 lg:py-32", className)}>
          <div className="container max-w-5xl">
            <div className="space-y-4 text-center">
              <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
                Meeting Room Plans
              </h2>
              <p className="text-muted-foreground mx-auto max-w-xl leading-snug text-balance">
                Choose the perfect plan for your virtual meeting needs. All plans include HD video and audio quality.
              </p>
            </div>

            {plans.some(plan => plan.billingPeriod === 'monthly') && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-3 rounded-lg border p-1">
                    <button
                        type="button"
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            !isAnnual
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setIsAnnual(false)}
                    >
                      Monthly
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            isAnnual
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setIsAnnual(true)}
                    >
                      Yearly
                      <span className="ml-1 text-xs text-green-500">Save 20%</span>
                    </button>
                  </div>
                </div>
            )}

            <div className="mt-8 grid items-start gap-6 text-start md:mt-12 md:grid-cols-3 lg:mt-20">
              {plans
                  .filter(plan => plan.status === 'active')
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((plan) => {
                    const displayPrice = calculatePrice(plan);
                    const billingPeriod = getBillingPeriodDisplay(plan);
                    const features = getFeaturesList(plan);
                    const isPopular = plan.slug === "professional" || plan.sortOrder === 2;

                    return (
                        <Card
                            key={plan.id}
                            className={`${
                                isPopular
                                    ? "border-primary border-2 shadow-lg scale-105"
                                    : "border-border"
                            } transition-all duration-200 hover:shadow-md`}
                        >
                          <CardContent className="flex flex-col gap-6 px-6 py-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-foreground font-semibold text-xl">
                                  {plan.name}
                                </h3>
                                {isPopular && (
                                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                              Popular
                            </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="text-foreground text-2xl font-bold">
                                  {formatPrice(displayPrice, plan.currency)}
                                  <span className="text-muted-foreground text-sm font-normal ml-1">
                              /{billingPeriod}
                            </span>
                                </div>
                                {isAnnual && plan.billingPeriod === 'monthly' && (
                                    <div className="text-muted-foreground text-sm">
                                      Billed annually
                                    </div>
                                )}
                              </div>
                              {plan.description && (
                                  <p className="text-muted-foreground text-sm">
                                    {plan.description}
                                  </p>
                              )}
                            </div>

                            <div className="space-y-3">
                              {features.map((feature, index) => (
                                  <div
                                      key={index}
                                      className="text-muted-foreground flex items-start gap-2"
                                  >
                                    <Check className="size-4 shrink-0 mt-0.5 text-green-500" />
                                    <span className="text-sm">{feature}</span>
                                  </div>
                              ))}
                            </div>

                            <Button
                                className="w-full"
                                variant={isPopular ? "default" : "outline"}
                                size="lg"
                                onClick={() => handleGetStarted(plan)}
                                type="button"
                            >
                              {user ? "Subscribe Now" : "Get Started"}
                            </Button>
                          </CardContent>
                        </Card>
                    );
                  })}
            </div>
          </div>
        </section>

        {/* Registration/Login Modal */}
        {isDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-semibold">
                    {dialogMode === 'login'
                        ? 'Login to Continue'
                        : `${user ? 'Subscribe to' : 'Register for'} ${selectedPlan?.name} Plan`
                    }
                  </h2>
                  <button
                      onClick={() => setIsDialogOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting || authLoading}
                      type="button"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {dialogMode === 'login' ? (
                    <form onSubmit={handleLogin} className="p-6 space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-800">
                          <LogIn className="size-4" />
                          <span className="text-sm font-medium">Please login to continue with your subscription</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email *</Label>
                          <Input
                              id="login-email"
                              type="email"
                              value={loginForm.email}
                              onChange={(e) => handleLoginInputChange('email', e.target.value)}
                              placeholder="Enter your email"
                              required
                              disabled={authLoading || isSubmitting}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password *</Label>
                          <Input
                              id="login-password"
                              type="password"
                              value={loginForm.password}
                              onChange={(e) => handleLoginInputChange('password', e.target.value)}
                              placeholder="Enter your password"
                              required
                              disabled={authLoading || isSubmitting}
                          />
                        </div>

                        {loginError && (
                            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                              {loginError}
                            </div>
                        )}
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Plan Summary</h4>
                        <p className="text-sm">
                          <strong>{selectedPlan?.name}</strong> - {formatPrice(calculatePrice(selectedPlan!), selectedPlan?.currency || 'USD')}
                          {isAnnual && selectedPlan?.billingPeriod === 'monthly' ? '/year (Save 20%)' : `/${getBillingPeriodDisplay(selectedPlan!)}`}
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={authLoading || isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={authLoading || isSubmitting}
                        >
                          {(authLoading || isSubmitting) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                              </>
                          ) : (
                              'Login & Continue'
                          )}
                        </Button>
                      </div>

                      <div className="text-center pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Don't have an account?{' '}
                          <button
                              type="button"
                              onClick={switchToRegister}
                              className="text-primary hover:underline font-medium"
                          >
                            Register here
                          </button>
                        </p>
                      </div>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      {user && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-800">
                              <Check className="size-4" />
                              <span className="text-sm font-medium">You are logged in as {user.name || user.email}</span>
                            </div>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              placeholder="Enter your full name"
                              required
                              disabled={isSubmitting || !!user}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="Enter your email"
                              required
                              disabled={isSubmitting || !!user}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="Enter your phone number"
                            disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization</Label>
                        <Input
                            id="organization"
                            value={formData.organization}
                            onChange={(e) => handleInputChange('organization', e.target.value)}
                            placeholder="Enter your organization name"
                            disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organizationDescription">Organization Description</Label>
                        <Textarea
                            id="organizationDescription"
                            value={formData.organizationDescription}
                            onChange={(e) => handleInputChange('organizationDescription', e.target.value)}
                            placeholder="Tell us about your organization"
                            rows={3}
                            disabled={isSubmitting}
                        />
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Plan Summary</h4>
                        <p className="text-sm">
                          <strong>{selectedPlan?.name}</strong> - {formatPrice(calculatePrice(selectedPlan!), selectedPlan?.currency || 'USD')}
                          {isAnnual && selectedPlan?.billingPeriod === 'monthly' ? '/year (Save 20%)' : `/${getBillingPeriodDisplay(selectedPlan!)}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          An invoice will be generated after registration
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                          ) : (
                              user ? 'Complete Subscription' : 'Complete Registration'
                          )}
                        </Button>
                      </div>

                      {!user && (
                          <div className="text-center pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              Already have an account?{' '}
                              <button
                                  type="button"
                                  onClick={switchToLogin}
                                  className="text-primary hover:underline font-medium"
                              >
                                Login here
                              </button>
                            </p>
                          </div>
                      )}
                    </form>
                )}
              </div>
            </div>
        )}
      </>
  );
};
