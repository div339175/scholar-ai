import React, { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { AuthModal } from "./components/AuthModal";
import { OnboardingFlow, OnboardingData } from "./components/OnboardingFlow";
import { StudentDashboardView } from "./components/StudentDashboardView";
import { ScholarPage } from "./pages/ScholarPage";
import { StudentSelector } from "./components/StudentSelector";
import { BrainCircuit } from "lucide-react";

type AppView = "landing" | "onboarding" | "dashboard" | "classic_evaluator";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    // Check URL parameters for direct demo mode access
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "demo" || params.get("view") === "dashboard") {
      return "dashboard";
    }
    if (params.get("view") === "classic") {
      return "classic_evaluator";
    }
    return "landing";
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "demo" || params.get("demo") === "true";
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>("student_alex");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // Sync URL query changes if any
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "demo") {
        setIsDemoMode(true);
        setCurrentView("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleGetStarted = () => {
    setIsAuthModalOpen(true);
  };

  const handleExploreDemo = () => {
    setIsDemoMode(true);
    setSelectedStudentId("student_alex");
    setCurrentView("dashboard");
  };

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (_email: string) => {
    setIsAuthModalOpen(false);
    // Proceed to student onboarding if not yet onboarded
    if (!onboardingData) {
      setCurrentView("onboarding");
    } else {
      setCurrentView("dashboard");
    }
  };

  const handleSelectDemoStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDemoMode(true);
    setIsAuthModalOpen(false);
    setCurrentView("dashboard");
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setCurrentView("dashboard");
  };

  const handleToggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      {/* View 1: Landing Page */}
      {currentView === "landing" && (
        <LandingPage
          onGetStarted={handleGetStarted}
          onExploreDemo={handleExploreDemo}
          onLogin={handleLogin}
        />
      )}

      {/* View 2: Onboarding Flow */}
      {currentView === "onboarding" && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onCancel={() => setCurrentView("landing")}
        />
      )}

      {/* View 3: Student-Facing Dashboard View */}
      {currentView === "dashboard" && (
        <StudentDashboardView
          studentId={selectedStudentId}
          isDemoMode={isDemoMode}
          onToggleDemoMode={handleToggleDemoMode}
          onSelectStudent={setSelectedStudentId}
          onBackToLanding={handleBackToLanding}
          userGoal={onboardingData?.goal}
          userCommitment={onboardingData?.weeklyHours}
        />
      )}

      {/* View 4: Classic Evaluator Diagnostic Page (accessible via query ?view=classic or switcher) */}
      {currentView === "classic_evaluator" && (
        <>
          <header className="header">
            <div className="header-brand">
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
                onClick={() => setCurrentView("landing")}
              >
                <BrainCircuit size={24} color="#818cf8" />
                <span className="brand-title">StepCode</span>
              </div>
              <span className="brand-badge">CLASSIC EVALUATOR</span>
              <button
                className="btn btn-secondary"
                style={{ marginLeft: "1rem", fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                onClick={() => setCurrentView("dashboard")}
              >
                Switch to Student Dashboard
              </button>
            </div>

            <StudentSelector
              currentStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              isLoading={false}
              onRefresh={() => {}}
            />
          </header>

          <main className="main-content">
            <ScholarPage studentId={selectedStudentId} />
          </main>
        </>
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSelectDemoStudent={handleSelectDemoStudent}
      />
    </div>
  );
};

export default App;
