"use client";

import { useState, useEffect } from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types từ collection Plans
interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  maxParticipants: number;
  maxDuration: number;
  recordingStorage: number;
  maxRooms: number;
  whiteboard: boolean;
  totalMinutes: number;
  status: 'active' | 'inactive' | 'archived';
}

interface FeatureSection {
  category: string;
  features: {
    name: string;
    [key: string]: true | false | null | string | number;
  }[];
}

interface PricingTableProps {
  className?: string;
}

// Component con để tránh lỗi hooks rules
const FeatureSections = ({
                           selectedPlan,
                           comparisonFeatures,
                           plans
                         }: {
  selectedPlan: number;
  comparisonFeatures: FeatureSection[];
  plans: Plan[];
}) => {
  const renderFeatureValue = (value: true | false | null | string | number) => {
    if (value === true) {
      return <Check className="size-5 text-green-500" />;
    }
    if (value === false) {
      return <X className="size-5 text-red-400" />;
    }
    if (value === null) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    // String or number value
    return (
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">{value}</span>
        </div>
    );
  };

  return (
      <div className="space-y-8">
        {comparisonFeatures.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">{section.category}</h3>
              </div>
              <div className="divide-y">
                {section.features.map((feature, featureIndex) => (
                    <div
                        key={featureIndex}
                        className="grid grid-cols-2 md:grid-cols-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                <span className="font-medium text-foreground">
                  {feature.name}
                </span>

                      {/* Mobile View - Only Selected Plan */}
                      <div className="md:hidden flex justify-end">
                        {renderFeatureValue(
                            feature[plans[selectedPlan]?.slug]
                        )}
                      </div>

                      {/* Desktop View - All Plans */}
                      <div className="hidden md:col-span-3 md:grid md:grid-cols-3 md:gap-8">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className="flex justify-center"
                            >
                              {renderFeatureValue(feature[plan.slug])}
                            </div>
                        ))}
                      </div>
                    </div>
                ))}
              </div>
            </div>
        ))}
      </div>
  );
};

// Component con PlanHeaders
const PlanHeaders = ({
                       selectedPlan,
                       onPlanChange,
                       pricingPlans,
                     }: {
  selectedPlan: number;
  onPlanChange: (index: number) => void;
  pricingPlans: any[];
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
      <div className="mb-8">
        {/* Mobile View */}
        <div className="md:hidden">
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
            <div className="flex items-center justify-between p-4">
              <CollapsibleTrigger className="flex items-center gap-2">
                <div className="text-left">
                  <h3 className="text-xl font-semibold">
                    {pricingPlans[selectedPlan]?.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {pricingPlans[selectedPlan]?.price}/month
                  </p>
                </div>
                <ChevronsUpDown
                    className={`size-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <Button
                  variant={pricingPlans[selectedPlan]?.button.variant || "outline"}
                  className="w-fit"
              >
                {pricingPlans[selectedPlan]?.button.text}
              </Button>
            </div>
            <CollapsibleContent className="flex flex-col space-y-2 p-4 border-t">
              {pricingPlans.map(
                  (plan, index) =>
                      index !== selectedPlan && (
                          <button
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                              onClick={() => {
                                onPlanChange(index);
                                setIsOpen(false);
                              }}
                              type="button"
                          >
                            <div className="text-left">
                              <h4 className="font-semibold">{plan.name}</h4>
                              <p className="text-muted-foreground text-sm">{plan.price}/month</p>
                            </div>
                          </button>
                      ),
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop View */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <h3 className="text-2xl font-bold mb-4">Plans & Features</h3>
            <p className="text-muted-foreground">
              Compare all meeting room features across our plans
            </p>
          </div>

          {pricingPlans.map((plan, index) => (
              <div key={index} className="text-center space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {plan.price}
                  </div>
                  <div className="text-muted-foreground text-sm">per month</div>
                </div>
                <Button
                    variant={plan.button.variant}
                    className="w-full"
                    size="lg"
                    type="button"
                >
                  {plan.button.text}
                </Button>
              </div>
          ))}
        </div>
      </div>
  );
};

export const PricingTable = ({ className }: PricingTableProps) => {
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans từ API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plans?status=active&limit=10');

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

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Tạo pricingPlans từ dữ liệu thực tế
  const pricingPlans = plans.map(plan => ({
    name: plan.name,
    price: formatPrice(plan.price, plan.currency),
    slug: plan.slug,
    button: {
      text: plan.slug === 'enterprise' ? 'Contact sales' : 'Get started',
      variant: plan.slug === 'pro' ? 'default' as const : 'outline' as const,
    },
  }));

  // Tạo comparisonFeatures từ dữ liệu plans
  const comparisonFeatures: FeatureSection[] = plans.length > 0 ? [
    {
      category: "Meeting Limits",
      features: [
        {
          name: "Max Participants",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.maxParticipants;
            return acc;
          }, {} as any)
        },
        {
          name: "Meeting Duration",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.maxDuration === 0 ? 'Unlimited' : `${plan.maxDuration} min`;
            return acc;
          }, {} as any)
        },
        {
          name: "Concurrent Rooms",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.maxRooms;
            return acc;
          }, {} as any)
        },
      ],
    },
    {
      category: "Features",
      features: [
        {
          name: "HD Video & Audio",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = true; // Mặc định có
            return acc;
          }, {} as any)
        },
        {
          name: "Screen Sharing",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = true; // Mặc định có
            return acc;
          }, {} as any)
        },
        {
          name: "Recording Storage",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = `${plan.recordingStorage}GB`;
            return acc;
          }, {} as any)
        },
        {
          name: "Whiteboard",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.whiteboard;
            return acc;
          }, {} as any)
        },
        {
          name: "Total Minutes",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = `${plan.totalMinutes} minutes`;
            return acc;
          }, {} as any)
        },
      ],
    },
    {
      category: "Support",
      features: [
        {
          name: "Email Support",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = true; // Mặc định có
            return acc;
          }, {} as any)
        },
        {
          name: "Priority Support",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.slug === 'pro' || plan.slug === 'enterprise';
            return acc;
          }, {} as any)
        },
        {
          name: "Dedicated Account Manager",
          ...plans.reduce((acc, plan) => {
            acc[plan.slug] = plan.slug === 'enterprise';
            return acc;
          }, {} as any)
        },
      ],
    },
  ] : [];

  if (loading) {
    return (
        <section className={className}>
          <div className="container">
            <div className="text-center">Loading pricing table...</div>
          </div>
        </section>
    );
  }

  if (error) {
    return (
        <section className={className}>
          <div className="container">
            <div className="text-center text-red-500">Error: {error}</div>
          </div>
        </section>
    );
  }

  if (plans.length === 0) {
    return (
        <section className={className}>
          <div className="container">
            <div className="text-center">No plans available for comparison</div>
          </div>
        </section>
    );
  }

  return (
      <section className={className}>
        <div className="container">
          <PlanHeaders
              selectedPlan={selectedPlan}
              onPlanChange={setSelectedPlan}
              pricingPlans={pricingPlans}
          />
          <FeatureSections
              selectedPlan={selectedPlan}
              comparisonFeatures={comparisonFeatures}
              plans={plans}
          />
        </div>
      </section>
  );
};
