import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="text-primary-foreground">
          <h1 className="mb-4 text-5xl font-bold">TimeFlow</h1>
          <p className="mb-8 text-xl opacity-90">
            Il tuo calendario intelligente con insights AI e journaling progressivo
          </p>
          <ul className="space-y-3 text-lg">
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                ✓
              </div>
              <span>Sincronizzazione Google Calendar</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                ✓
              </div>
              <span>Analytics avanzate del tempo</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                ✓
              </div>
              <span>Smart conflict detection</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                ✓
              </div>
              <span>Progressive journaling</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
