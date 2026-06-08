import { setupProfileAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SetupProfile(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  
  // Verify user is logged in
  const cookieStore = await cookies();
  const session = cookieStore.get("local_auth_session");
  const authName = cookieStore.get("auth_name")?.value;
  const authRole = cookieStore.get("auth_role")?.value;

  if (!session || session.value !== "authenticated") {
    redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center p-4 sm:p-10 justify-center min-h-screen bg-gray-50">
      <Link
        href="/"
        className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-foreground bg-btn-background hover:bg-btn-background-hover flex items-center group text-sm"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Setup Manual Login</h1>
          <p className="text-sm text-gray-500 mt-2">
            Set a secure password for {authName} ({authRole}). This will allow you to log in without the biometric scanner.
          </p>
        </div>

        <form action={setupProfileAction} className="flex-1 flex flex-col w-full gap-4 text-foreground">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="password">
              New Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              required
              minLength={6}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <SubmitButton 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl mt-4 transition-all shadow-md active:scale-[0.98]"
            pendingText="Saving Password..."
          >
            Save Password
          </SubmitButton>
          
          <FormMessage message={searchParams} />
        </form>
      </div>
    </div>
  );
}
