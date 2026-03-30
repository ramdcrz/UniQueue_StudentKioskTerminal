import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Monitor, Smartphone, UserCog, ShieldCheck } from 'lucide-react';

export default function Home() {
  const views = [
    { title: 'Student Kiosk', href: '/kiosk', icon: Smartphone, description: 'Ticket dispenser for students.', color: 'bg-primary' },
    { title: 'Public Monitor', href: '/monitor', icon: Monitor, description: 'Live display for waiting areas.', color: 'bg-accent' },
    { title: 'Staff Terminal', href: '/staff', icon: UserCog, description: 'Teller interface for counter management.', color: 'bg-success' },
    { title: 'Admin Analytics', href: '/admin', icon: ShieldCheck, description: 'Management dashboard and analytics.', color: 'bg-secondary' },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F4F7]">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-secondary">UniQueue</h1>
          <p className="text-muted-foreground text-lg">Centralized University Queueing System Prototype</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {views.map((view) => (
            <Link key={view.href} href={view.href}>
              <Card className="hover:shadow-xl transition-all duration-300 border-none glass hover:translate-y-[-4px] cursor-pointer group">
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                  <div className={`p-3 rounded-xl text-white ${view.color} shadow-lg`}>
                    <view.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{view.title}</CardTitle>
                    <CardDescription>{view.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-1 w-0 bg-primary group-hover:w-full transition-all duration-500 rounded-full" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center pt-8 text-sm text-muted-foreground opacity-50">
          Built for University Enrollment Seasons
        </div>
      </div>
    </main>
  );
}
