import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Loader from "@/components/ui/loader";
import { Suspense } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  return (
    <Suspense fallback={<Loader />}>
      {/* Background with contrasting gradient */}
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Centered container with fixed width */}
        <div className="w-full max-w-md mx-auto px-4">
          {/* Logo and branding */}
          <div className="flex justify-center mb-8">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              A
            </div>
          </div>
          
          {/* Form container with white background */}
          <form className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Welcome Back</h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              Sign in to access your attendance dashboard
            </p>
            
            <div className="flex flex-col gap-5">
              {/* Email input with icon */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    name="email"
                    id="email"
                    placeholder="you@example.com"
                    required
                    className="pl-10 py-3 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Password input with icon */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <Link
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    href="/forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="••••••••"
                    required
                    className="pl-10 py-3 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Sign in button with animation */}
              <SubmitButton 
                pendingText="Signing In..." 
                formAction={signInAction}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200 mt-4"
              >
                Sign in <ArrowRight className="h-4 w-4 ml-1" />
              </SubmitButton>
              
              <FormMessage message={searchParams} />
            </div>
            
            {/* Divider */}
            <div className="relative flex items-center mt-8 mb-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-sm">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            
            {/* Sign up link */}
            <p className="text-sm text-gray-500 text-center">
              Don't have an account?{" "}
              <Link className="text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors" href="/sign-up">
                Create an account
              </Link>
            </p>
          </form>
          
          {/* Footer */}
          <p className="text-xs text-center text-gray-500 mt-8">
            &copy; {new Date().getFullYear()} Attendance Management System. All rights reserved.
          </p>
        </div>
      </div>
    </Suspense>
  );
}