import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Network, Database, MessageSquare, ShieldCheck, Zap, BarChart3, ArrowRight, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Landing() {
  const [_, setLocation] = useLocation();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ForgeMind</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button onClick={() => setLocation('/signup')} className="font-semibold shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Circuit pattern background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-background to-background" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary bg-primary/10 px-4 py-1.5 text-sm rounded-full">
              Platform Release 2.0 Now Available
            </Badge>
          </motion.div>
          
          <motion.h1 
            initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
          >
            Every Machine Has a Story.<br />We Help You Understand It.
          </motion.h1>
          
          <motion.p 
            initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Transform scattered factory documents, maintenance logs, and safety manuals into a precise, AI-powered industrial intelligence platform.
          </motion.p>
          
          <motion.div 
            initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" onClick={() => setLocation('/signup')} className="w-full sm:w-auto text-lg h-14 px-8 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-shadow">
              Try Demo <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto text-lg h-14 px-8 border-border/50 hover:bg-white/5">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y border-border/50 bg-card/30 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="pt-4 md:pt-0">
              <div className="text-4xl font-bold text-primary mb-1">10,000+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Engineers</div>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="text-4xl font-bold text-primary mb-1">1M+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Documents Analyzed</div>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="text-4xl font-bold text-primary mb-1">99.9%</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Surgical Clarity for Heavy Industry</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for those who trust data over gut feeling. A cockpit for your facility's entire knowledge base.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Database, title: "Document Intelligence", desc: "Instantly parse PDFs, DOCX, and XLSX files. Extract critical specs without manual data entry." },
              { icon: MessageSquare, title: "AI Assistant", desc: "Chat with your equipment manuals. Get precise, cited answers to complex engineering questions." },
              { icon: Zap, title: "Root Cause Analysis", desc: "Input failure symptoms and get AI-driven potential root causes based on historical logs." },
              { icon: ShieldCheck, title: "Compliance Checker", desc: "Automatically verify operational procedures against Factory Act, OISD, and ISO 45001 standards." },
              { icon: Network, title: "Knowledge Graph", desc: "Visualize relationships between machines, parts, failures, and personnel in an interactive map." },
              { icon: BarChart3, title: "Maintenance Intelligence", desc: "Predict equipment failure trends and optimize your preventative maintenance schedules." }
            ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group glass">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-card/20 border-y border-border/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From raw data to actionable intelligence in three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
            
            {[
              { step: "01", title: "Ingest", desc: "Upload scattered manuals, logs, and sheets into the secure vault." },
              { step: "02", title: "Process", desc: "Our models extract entities, relationships, and structural context." },
              { step: "03", title: "Act", desc: "Query the system to solve problems, check compliance, and map failures." }
            ].map((item, i) => (
              <div key={i} className="relative z-10 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-background border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-16">Trusted by Industry Leaders</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "ForgeMind reduced our root cause analysis time from days to minutes. The knowledge graph is a game-changer.", author: "Sarah Jenkins", role: "Plant Manager, Apex Manufacturing" },
              { quote: "Compliance checks used to require a dedicated team for weeks. Now we run them instantly against our latest OISD standards.", author: "David Chen", role: "Safety Officer, Nexus Energy" },
              { quote: "When a turbine goes down, our engineers don't search through binders anymore. They ask ForgeMind and get cited answers.", author: "Marcus Thorne", role: "Lead Engineer, SteelCorp" }
            ].map((test, i) => (
              <Card key={i} className="bg-card/40 border-border/50 glass">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[1,2,3,4,5].map(star => <StarIcon key={star} className="w-5 h-5 text-primary fill-primary" />)}
                  </div>
                  <p className="text-lg mb-6 italic text-foreground/90">"{test.quote}"</p>
                  <div>
                    <div className="font-semibold">{test.author}</div>
                    <div className="text-sm text-muted-foreground">{test.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Standards */}
      <section className="py-16 px-6 border-y border-border/50 bg-black/50 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">Natively Supporting Industry Standards</h3>
          <div className="flex flex-wrap justify-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            {['Factory Act 1948', 'ISO 45001', 'OISD Standards', 'OSHA Guidelines', 'ASME Boiler Code'].map((std, i) => (
              <div key={i} className="text-xl font-bold font-mono tracking-tight text-white/80">{std}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Lock className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">Ready to digitize your plant's brain?</h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join the forward-thinking facilities using AI to prevent downtime and ensure compliance.
          </p>
          <Button size="lg" onClick={() => setLocation('/signup')} className="text-lg h-14 px-10 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background pt-16 pb-8 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Network className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold tracking-tight">ForgeMind AI</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ForgeMind Systems Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StarIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}