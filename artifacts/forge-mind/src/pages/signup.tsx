import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation } from 'wouter';
import { Network, Loader2 } from 'lucide-react';
import { useSignUp } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  company: z.string().optional()
});

export default function Signup() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', password: '', company: '' }
  });

  const signupMutation = useSignUp();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    signupMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        login(res.access_token, res.user);
        toast({ title: 'Account created', description: 'Welcome to ForgeMind AI.' });
        setLocation('/dashboard');
      },
      onError: (err: any) => {
        toast({ 
          variant: 'destructive', 
          title: 'Signup failed', 
          description: err?.message || 'Could not create account' 
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] px-4 relative overflow-hidden py-12">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <Network className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create an Account</h1>
          <p className="text-muted-foreground mt-2 text-sm text-center">Start turning your facility data into actionable intelligence</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} className="bg-background/50 border-white/10 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Work Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jane@company.com" {...field} className="bg-background/50 border-white/10 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Company Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Industrial" {...field} className="bg-background/50 border-white/10 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="bg-background/50 border-white/10 h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] mt-2" 
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}