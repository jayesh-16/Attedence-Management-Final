import { loginLocalAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import BiometricLoginButton from "@/components/BiometricLoginButton";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;

  return (
    <>
      <link href="https://fonts.googleapis.com" rel="preconnect" />
      <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{__html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .glass-effect {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
      `}} />

      <div className="bg-stitch-background text-on-surface min-h-screen selection:bg-primary-fixed-dim selection:text-on-primary-fixed font-body-md w-full">
        <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full">
          
          {/* Left Panel: Full-Bleed Branding */}
          <section className="hidden lg:flex relative w-full flex-col justify-center items-center overflow-hidden">
            {/* Background Image */}
            <img alt="Biometric attendance background" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLtdi5WMYppP3dLmkOHAtksZ9B0xNdX_9hulfUjjOcxelfyeW3M1Dy572rH4eyifhJwzXu-xMpkcOvAEQxMGiy77l6vyA0kVwub_zt0Dq6cmYXOu915YemT7GMJ3Mri5yRXUF1OI2H9MUCC3vZXoNXEhaddf8ll2zecYZ-lKdQLQ3vVm9Ho9HpZMahCeommL_dknv3LxkZeJYCgFLd_M2gZTEoLdoqNwmwjZRXRpw2vcX8XHKKpZ5WsWJqc" />
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/40 to-transparent"></div>
            
            {/* Content */}
            <div className="relative z-10 px-xl text-center max-w-xl">
              <div className="mb-lg inline-flex items-center justify-center p-md rounded-xl glass-effect border border-white/20">
                <span className="material-symbols-outlined text-primary-fixed text-4xl" data-icon="fingerprint">fingerprint</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-white mb-md">Welcome back</h1>
              <p className="font-body-lg text-body-lg text-outline-variant">
                Securely manage your workforce attendance with biometric precision and real-time synchronization.
              </p>
            </div>
            
            {/* Subtle Decorative Element */}
            <div className="absolute bottom-xl left-xl flex gap-md">
              <div className="flex items-center gap-sm text-white/50 font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-sm" data-icon="verified_user">verified_user</span>
                <span>End-to-End Encrypted</span>
              </div>
              <div className="flex items-center gap-sm text-white/50 font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-sm" data-icon="cloud_done">cloud_done</span>
                <span>Cloud Synced</span>
              </div>
            </div>
          </section>

          {/* Right Panel: Login Form */}
          <section className="w-full flex flex-col bg-surface-container-lowest">
            <div className="flex-grow flex flex-col justify-center items-center px-md py-xl">
              <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
                
                {/* Brand Anchor Logo */}
                <div className="flex items-center gap-sm mb-xl">
                  <div className="bg-stitch-primary p-sm rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white" data-icon="event_note">event_note</span>
                  </div>
                  <span className="font-headline-md text-headline-md font-bold text-stitch-primary">Attendance Manager</span>
                </div>
                
                {/* Header */}
                <div className="mb-lg">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Sign In</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Log in with your Email or Student Roll Number.</p>
                </div>

                {/* Login Form */}
                <form action={loginLocalAction} className="space-y-lg">
                  <div className="space-y-sm">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="email">Email or Roll Number</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-stitch-primary transition-colors" data-icon="person">person</span>
                      <input 
                        name="email" 
                        defaultValue=""
                        required
                        className="w-full pl-[48px] pr-md py-md bg-surface border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md" 
                        id="email" 
                        placeholder="teacher@tcet.edu OR 2026S034" 
                        type="text" 
                      />
                    </div>
                  </div>

                  <div className="space-y-sm">
                    <div className="flex justify-between items-center">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                      <a className="font-label-sm text-label-sm text-stitch-primary hover:underline transition-all" href="#">Forgot Password?</a>
                    </div>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-stitch-primary transition-colors" data-icon="lock">lock</span>
                      <input 
                        name="password"
                        required
                        className="w-full pl-[48px] pr-md py-md bg-surface border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md" 
                        id="password" 
                        placeholder="••••••••••••" 
                        type="password" 
                      />
                      <button className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-outline transition-colors" type="button">
                        <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm py-sm">
                    <input className="w-4 h-4 rounded border-outline-variant text-stitch-primary focus:ring-stitch-primary" id="remember" type="checkbox" />
                    <label className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer" htmlFor="remember">Remember this workstation for 30 days</label>
                  </div>

                  <SubmitButton 
                    pendingText="Authorizing..." 
                    className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-lg rounded-xl shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm"
                  >
                    <span>Authorize & Sign In</span>
                    <span className="material-symbols-outlined text-[20px]" data-icon="arrow_forward">arrow_forward</span>
                  </SubmitButton>
                  
                  <div className="mt-4">
                    <FormMessage message={searchParams} />
                  </div>

                  {/* Biometric Fallback (Visual Only) */}
                  <div className="relative pt-lg pb-sm">
                    <div aria-hidden="true" className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-outline-variant"></div>
                    </div>
                    <div className="relative flex justify-center text-label-sm font-label-sm uppercase tracking-widest">
                      <span className="bg-surface-container-lowest px-md text-outline">or authenticate with</span>
                    </div>
                  </div>
                  <BiometricLoginButton />
                </form>
              </div>
            </div>

            {/* Footer */}
            <footer className="flex flex-col items-center gap-sm px-md w-full py-lg mt-auto bg-transparent">
              <div className="flex flex-wrap justify-center gap-lg">
                <a className="font-label-sm text-label-sm text-stitch-secondary hover:text-stitch-primary transition-colors cursor-pointer" href="#">Privacy Policy</a>
                <a className="font-label-sm text-label-sm text-stitch-secondary hover:text-stitch-primary transition-colors cursor-pointer" href="#">Terms of Service</a>
                <a className="font-label-sm text-label-sm text-stitch-secondary hover:text-stitch-primary transition-colors cursor-pointer" href="#">Support</a>
              </div>
              <p className="font-label-md text-label-md text-on-surface">© 2026 Attendance Manager. All rights reserved.</p>
            </footer>
          </section>

        </main>
      </div>
    </>
  );
}