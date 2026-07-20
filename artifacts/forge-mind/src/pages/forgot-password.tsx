import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'wouter';
import { Network, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useForgotPassword } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' }
  });

  const forgotMutation = useForgotPassword();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    forgotMutation.mutate({ data: values }, {
      onSuccess: () => {
        setIsSubmitted(true);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
        <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
        </Link>

        {isSubmitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent password reset instructions to {form.getValues('email')}.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
              <p className="text-muted-foreground mt-2 text-sm text-center">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Work Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="engineer@company.com" 
                          {...field} 
                          className="bg-background/50 border-white/10 focus-visible:ring-primary h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}