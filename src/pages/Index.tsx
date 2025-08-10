import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Heart, ChevronRight } from 'lucide-react';
import LoginModal from '@/components/auth/LoginModal';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<'admin' | 'user'>('user');

  const handleLoginClick = (role: 'admin' | 'user') => {
    setLoginRole(role);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 min-h-[60vh] flex items-center">
        <div className="container mx-auto flex flex-col lg:flex-row items-center gap-10">
          {/* Left Side - Text */}
          <div className="max-w-2xl flex-1">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-primary">SK Loyola Heights</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Empowering the youth of our barangay through innovative programs, community engagement, and meaningful connections. Join us in building a brighter future for our community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-start">
              <Button
                onClick={() => handleLoginClick('admin')}
                size="lg"
              >
                Admin Login
              </Button>

              <Button
                onClick={() => handleLoginClick('user')}
                size="lg"
                variant="outline"
                className="bg-white text-black border-1 border-blue-600 hover:bg-gray-100 hover:text-black px-8 py-3"
              >
                Login
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Right Side - Hero Image */}
          <div className="flex-1 flex justify-center">
            <img
              src="/herosection.png"
              alt="Community illustration"
              className="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Our Mission</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-primary">Youth Empowerment</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Providing opportunities for young people to develop leadership skills, engage in community service, and make their voices heard in local governance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-secondary">Community Development</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Implementing sustainable projects that address the needs of our barangay while fostering collaboration between youth and community leaders.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-red-600">Social Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Creating positive change through advocacy, awareness campaigns, and support programs that benefit the entire community.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        role={loginRole}
      />
    </div>
  );
};

export default Index;
