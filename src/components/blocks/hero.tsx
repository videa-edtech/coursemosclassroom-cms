import Image from "next/image";
import {
  ArrowRight,
  Video,
  Users,
  Calendar,
  Zap,
  Cpu,
  Shield,
  BarChart3,
  MessageSquare,
  Settings,
  Globe
} from "lucide-react";

import { DashedLine } from "@/components/dashed-line";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Smart Meeting Rooms",
    description: "Create and manage virtual classrooms with HD video, screen sharing, and interactive whiteboards.",
    icon: Video,
  },
  {
    title: "Seamless Integrations",
    description: "Connect with LMS, student portals, and other e-learning platforms effortlessly.",
    icon: Cpu,
  },
  {
    title: "Attendance & Analytics",
    description: "Track participation, engagement metrics, and generate comprehensive reports.",
    icon: BarChart3,
  },
  {
    title: "Multi-Platform Support",
    description: "Access meetings from any device - desktop, tablet, or mobile.",
    icon: Globe,
  },
];

const integrations = [
  {
    name: "Learning Management Systems",
    description: "Moodle, Canvas, Blackboard, etc."
  },
  {
    name: "Student Information Systems",
    description: "Banner, PeopleSoft, etc."
  },
  {
    name: "Video Conferencing Tools",
    description: "Zoom, Google Meet, Microsoft Teams"
  },
  {
    name: "Assessment Platforms",
    description: "Quiz tools, exam systems"
  }
];

export const Hero = () => {
  return (
      <section className="py-28 lg:py-32 lg:pt-44">
        <div className="container flex flex-col justify-between gap-8 md:gap-14 lg:flex-row lg:gap-20">
          {/* Left side - Main content */}
          <div className="flex-1">
            <h1 className="text-foreground max-w-160 text-3xl tracking-tight md:text-4xl lg:text-5xl xl:whitespace-nowrap">
              CoursemosClassroom
            </h1>

            <p className="text-muted-foreground text-1xl mt-5 md:text-3xl">
              Unified Meeting Room Management for Online Education
            </p>

            <p className="text-muted-foreground mt-4 text-lg">
              A powerful platform that integrates meeting room management with your existing
              e-learning ecosystem. Schedule, host, and analyze virtual classrooms across
              multiple systems.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 lg:flex-nowrap">
              <Button asChild size="lg">
                <a href="/demo">
                  Start Free Trial
                  <ArrowRight className="ml-2" />
                </a>
              </Button>
              <Button
                  variant="outline"
                  size="lg"
                  className="from-background h-auto gap-2 bg-linear-to-r to-transparent shadow-md"
                  asChild
              >
                <a
                    href="/integrations"
                    className="max-w-56 truncate text-start md:max-w-none"
                >
                  View All Integrations
                  <ArrowRight className="stroke-3" />
                </a>
              </Button>
            </div>

            {/* Integration Partners */}
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-4">Works With Your Existing Tools</h3>
              <div className="grid grid-cols-2 gap-4">
                {integrations.map((integration) => (
                    <div key={integration.name} className="flex items-start gap-2">
                      <Zap className="text-blue-500 mt-1 size-4" />
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Features */}
          <div className="relative flex flex-1 flex-col justify-center space-y-5 max-lg:pt-10 lg:pl-10">
            <DashedLine
                orientation="vertical"
                className="absolute top-0 left-0 max-lg:hidden"
            />
            <DashedLine
                orientation="horizontal"
                className="absolute top-0 lg:hidden"
            />
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                  <div key={feature.title} className="flex gap-2.5 lg:gap-5 p-4 rounded-lg hover:bg-accent transition-colors">
                    <Icon className="text-primary mt-1 size-5 shrink-0 lg:size-6" />
                    <div>
                      <h2 className="font-text text-foreground font-semibold">
                        {feature.title}
                      </h2>
                      <p className="text-muted-foreground max-w-76 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
              );
            })}

            {/* Additional Feature Highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Shield className="text-green-500 size-4" />
                <span className="text-sm">Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="text-purple-500 size-4" />
                <span className="text-sm">Automated Scheduling</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="text-orange-500 size-4" />
                <span className="text-sm">Real-time Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="text-gray-500 size-4" />
                <span className="text-sm">Custom Workflows</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="container mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-card rounded-lg">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground mt-2">Uptime Reliability</div>
            </div>
            <div className="text-center p-6 bg-card rounded-lg">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground mt-2">Platform Integrations</div>
            </div>
            <div className="text-center p-6 bg-card rounded-lg">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-2">Concurrent Rooms</div>
            </div>
            <div className="text-center p-6 bg-card rounded-lg">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground mt-2">Support Available</div>
            </div>
          </div>
        </div>
      </section>
  );
};
