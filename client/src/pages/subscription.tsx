import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe (gracefully handle missing key)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    description: "Perfect for small businesses getting started",
    features: [
      "100 AI generations per month",
      "5 active projects",
      "Basic visual templates",
      "Email support",
      "1 user seat",
    ],
    popular: false,
    planId: "starter",
  },
  {
    name: "Professional",
    price: "$79",
    period: "per month",
    description: "For growing teams and agencies",
    features: [
      "500 AI generations per month",
      "25 active projects",
      "Premium visual templates",
      "Priority support",
      "5 user seats",
      "Advanced fusion visuals",
      "BrandKit generator",
    ],
    popular: true,
    planId: "professional",
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "per month",
    description: "Unlimited power for large organizations",
    features: [
      "Unlimited AI generations",
      "Unlimited projects",
      "Custom visual templates",
      "24/7 dedicated support",
      "Unlimited user seats",
      "Advanced analytics",
      "API access",
      "Custom integrations",
    ],
    popular: false,
    planId: "enterprise",
  },
];

function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/subscription",
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "You are now subscribed!",
        });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        className="w-full" 
        size="lg" 
        disabled={!stripe || isProcessing}
        data-testid="button-complete-payment"
      >
        {isProcessing ? "Processing..." : "Complete Payment"}
      </Button>
    </form>
  );
}

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectPlan = async (planId: string) => {
    setIsLoading(true);
    setSelectedPlan(planId);
    
    try {
      const response = await apiRequest("POST", "/api/create-subscription", { plan: planId });
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setClientSecret(null);
    setSelectedPlan(null);
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-serif font-bold mb-4" data-testid="text-subscription-title">
          Choose Your Plan
        </h1>
        <p className="text-lg text-muted-foreground">
          Unlock the full power of AI-driven creative automation
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular ? "border-primary shadow-lg scale-105" : ""
            }`}
            data-testid={`card-plan-${plan.name.toLowerCase()}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-4">Most Popular</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-serif mb-2">{plan.name}</CardTitle>
              <div className="mb-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                onClick={() => handleSelectPlan(plan.planId)}
                disabled={isLoading && selectedPlan === plan.planId}
                data-testid={`button-subscribe-${plan.name.toLowerCase()}`}
              >
                {isLoading && selectedPlan === plan.planId ? "Loading..." : "Get Started"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              {clientSecret 
                ? "Complete your subscription payment securely with Stripe" 
                : "Select a plan above to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stripePromise ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Payment processing is not configured. Please contact support.</p>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
              </Elements>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please select a subscription plan to proceed with payment</p>
              </div>
            )}
          </CardContent>
          {!clientSecret && (
            <CardFooter className="flex-col gap-4">
              <p className="text-xs text-center text-muted-foreground">
                Alternative payment via Arrival account integration coming soon (SuperRate API)
              </p>
            </CardFooter>
          )}
        </Card>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>All plans include SSL encryption, automatic backups, and 99.9% uptime SLA</p>
      </div>
    </div>
  );
}
